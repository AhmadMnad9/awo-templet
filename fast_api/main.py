from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import pandas as pd
import pdfkit
import base64
import os, uuid
import json
from jinja2 import Environment, FileSystemLoader
from datetime import datetime
import csv
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Template-Umgebung einrichten
env = Environment(loader=FileSystemLoader(os.path.join(BASE_DIR, 'templates')))

app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")


class DataModel(BaseModel):
    file_path: str
    template_id: Optional[str] = "birthday_standard"
    encoding: Optional[str] = None
    delimiter: Optional[str] = None
    year: Optional[int] = None
    custom_subject: Optional[str] = None
    custom_paragraphs: Optional[List[str]] = None


class PreviewRequest(BaseModel):
    file_path: str
    template_id: Optional[str] = "birthday_standard"
    encoding: Optional[str] = None
    delimiter: Optional[str] = None
    n_rows: int = 5


def load_templates():
    templates_path = os.path.join(BASE_DIR, 'templates', 'templates.json')
    if os.path.exists(templates_path):
        try:
            with open(templates_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading templates.json: {e}")
    # Default fallback
    return [
        {
            "id": "birthday_standard",
            "name": "Standard-Geburtstagsbrief (AWO Oberlar)",
            "description": "Standard-Geburtstagsbrief mit Gutschein für das Sonntagscafé",
            "template_file": "letter_template.html",
            "required_columns": [
                "Geburtsdatum",
                "Briefanrede",
                "Vorname",
                "Nachname",
                "Straße",
                "Postleitzahl",
                "Ort"
            ],
            "date_column": "Geburtsdatum",
            "salutation_column": "Briefanrede",
            "assets": {
                "watermark_image": "static/images/birthday_watermark.png",
                "logo_image": "static/images/logo.jpg",
                "signature_image": "static/images/signature.png"
            }
        }
    ]


def salutation_list(briefanrede: str):
    if not briefanrede or not isinstance(briefanrede, str):
        return ["erhalten Sie", "Ihnen", "Ihr", "Ihren"] # Fallback
    
    briefanrede_lower = briefanrede.lower()
    
    # Formal triggers: contains "frau", "herr", "geehrte", "geehrter"
    if any(word in briefanrede_lower for word in ["frau", "herr", "geehrte", "geehrter"]):
        return ["erhalten Sie", "Ihnen", "Ihr", "Ihren"]
        
    # Informal triggers: contains "liebe", "lieber", "hallo", "du", "dir"
    if any(word in briefanrede_lower for word in ["liebe", "lieber", "hallo", "du", "dir"]):
        return ["erhältst Du", "Dir", "Dein", "Deinen"]
        
    # Default fallback
    return ["erhalten Sie", "Ihnen", "Ihr", "Ihren"]


def image_to_base64(path):
    resolved_path = path if os.path.isabs(path) else os.path.join(BASE_DIR, path)
    with open(resolved_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')


def get_pdfkit_configuration():
    if os.name == 'nt':
        standard_paths = [
            r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe",
            r"C:\Program Files (x86)\wkhtmltopdf\bin\wkhtmltopdf.exe",
        ]
        for path in standard_paths:
            if os.path.exists(path):
                return pdfkit.configuration(wkhtmltopdf=path)
    return None


def detect_file_encoding(file_path: str, sample_size: int = 131072) -> str:
    candidates = [
        'utf-8-sig',
        'utf-8',
        'cp1252',
        'latin-1',
        'iso-8859-1',
        'utf-16',
        'utf-16-le',
        'utf-16-be',
    ]
    try:
        with open(file_path, 'rb') as f:
            raw = f.read(sample_size)
        for enc in candidates:
            try:
                raw.decode(enc)
                return enc
            except Exception:
                continue
    except Exception:
        pass
    return 'utf-8'


def detect_csv_delimiter(file_path: str, encoding: str) -> str:
    try:
        with open(file_path, 'rb') as f:
            raw = f.read(65536)
        text = raw.decode(encoding, errors='replace')
        dialect = csv.Sniffer().sniff(text, delimiters=[',', ';', '\t', '|', ':'])
        return dialect.delimiter
    except Exception:
        return ';'


def read_csv_safely(file_path: str, encoding: Optional[str], delimiter: Optional[str]) -> pd.DataFrame:
    used_encoding = encoding or detect_file_encoding(file_path)
    used_delimiter = delimiter or detect_csv_delimiter(file_path, used_encoding)
    errors: List[str] = []
    for enc in [used_encoding, 'utf-8', 'cp1252', 'latin1']:
        for sep in [used_delimiter, ';', ',', '\t', '|']:
            try:
                df = pd.read_csv(file_path, encoding=enc, header=0, delimiter=sep, engine='python')
                if df.shape[1] == 1:
                    continue
                
                # drop completely empty rows
                df = df.dropna(how='all')
                
                # Header minimal säubern: BOM und Whitespaces
                cleaned = []
                for c in df.columns:
                    s = str(c).replace('\ufeff', '').strip()
                    s = ' '.join(s.split())
                    cleaned.append(s)
                df.columns = cleaned
                df.attrs['used_encoding'] = enc
                df.attrs['used_delimiter'] = sep
                return df
            except Exception as e:
                errors.append(f"enc={enc} sep={sep}: {e}")
                continue
    raise HTTPException(status_code=400, detail={
        "message": "CSV konnte nicht zuverlässig eingelesen werden.",
        "attempts": errors[:10],
    })


def required_columns_present(df: pd.DataFrame, required: List[str]) -> Dict[str, bool]:
    # Exakte Übereinstimmung (nach minimaler Header-Säuberung)
    cols = set(map(str, df.columns))
    return {name: (name in cols) for name in required}


def remove_file(path: str):
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception as e:
        print(f"Error deleting temp file {path}: {e}")


def format_custom_text(text: str, salutations: List[str], ctx: dict) -> str:
    if not text:
        return ""
    text = text.replace("[erhältst/erhalten]", salutations[0])
    text = text.replace("[Dir/Ihnen]", salutations[1])
    text = text.replace("[Dein/Ihr]", salutations[2])
    text = text.replace("[deinen/Ihren]", salutations[3])
    try:
        # Fallback to Jinja2 render if there are any native jinja tags left
        from jinja2 import Template
        return Template(text).render(ctx)
    except Exception:
        return text


@app.get("/templates")
async def get_templates():
    return load_templates()


@app.post("/create_pdf")
async def create_upload_file(data: DataModel, background_tasks: BackgroundTasks):
    print(f"DEBUG: create_upload_file got data: {data}")
    templates = load_templates()
    template_config = next((t for t in templates if t["id"] == data.template_id), None)
    if not template_config:
        raise HTTPException(status_code=400, detail={"message": f"Template with ID '{data.template_id}' not found."})

    # Dynamically load assets configured in templates.json
    encoded_assets = {}
    for key, path in template_config.get("assets", {}).items():
        try:
            encoded_assets[key] = image_to_base64(path)
        except Exception as e:
            encoded_assets[key] = ""
            print(f"Error loading asset {key} from path {path}: {e}")

    df = read_csv_safely(data.file_path, data.encoding, data.delimiter)

    required = template_config.get("required_columns", [])
    
    # Filter out rows that are entirely NaN in the required columns to avoid trailing empty rows
    if required:
        df = df.dropna(subset=[col for col in required if col in df.columns], how='all')

    presence = required_columns_present(df, required)
    missing = [col for col, ok in presence.items() if not ok]
    if missing:
        raise HTTPException(status_code=400, detail={
            "message": f"Fehlende Pflichtspalten: {', '.join(missing)}",
            "columns": list(df.columns),
            "used_encoding": df.attrs.get('used_encoding'),
            "used_delimiter": df.attrs.get('used_delimiter'),
        })

    # Date parsing logic
    date_col = template_config.get("date_column")
    if date_col and date_col in df.columns:
        # Strip string values
        df[date_col] = df[date_col].astype(str).str.strip()
        try:
            df[date_col] = pd.to_datetime(df[date_col], format='%d.%m.%Y', errors='raise')
        except Exception:
            df[date_col] = pd.to_datetime(df[date_col], dayfirst=True, errors='coerce')
            if df[date_col].isna().any():
                raise HTTPException(status_code=400, detail={
                    "message": f"Spalte '{date_col}' konnte nicht als Datum erkannt werden (Format erwartet: TT.MM.JJJJ)",
                })

    template_file = template_config.get("template_file", "letter_template.html")
    template = env.get_template(template_file)

    all_html = ""
    total_rows = len(df)
    year = data.year or datetime.now().year

    salutation_col = template_config.get("salutation_column")

    for index, row in df.iterrows():
        last_page = (index == len(df) - 1)
        row_dict = row.to_dict()
        
        # Geburtsdatum in das ausgewählte Jahr übertragen (z. B. 29.02. -> 28.02. bei Nicht-Schaltjahr)
        birthday_in_year = None
        if date_col and date_col in row_dict:
            bd = row_dict[date_col]
            if isinstance(bd, pd.Timestamp) and pd.notna(bd):
                try:
                    birthday_in_year = bd.replace(year=year)
                except ValueError:
                    # 29. Februar in einem Nicht-Schaltjahr -> 28. Februar
                    if bd.month == 2 and bd.day == 29:
                        birthday_in_year = bd.replace(year=year, month=2, day=28)
        row_dict["GeburtsdatumInJahr"] = birthday_in_year
        
        # Determine clean formatted date for the letter top-right line
        formatted_date = datetime.now().strftime('%d.%m.%Y')
        if date_col and date_col in row_dict:
            if birthday_in_year and hasattr(birthday_in_year, 'strftime') and pd.notna(birthday_in_year):
                formatted_date = birthday_in_year.strftime('%d.%m.%Y')
            else:
                bd_raw = row_dict.get(date_col)
                if isinstance(bd_raw, pd.Timestamp) and pd.notna(bd_raw):
                    formatted_date = bd_raw.strftime(f'%d.%m.{year}')
                elif isinstance(bd_raw, str) and bd_raw:
                    formatted_date = bd_raw
        row_dict["formatted_date"] = formatted_date
        
        salutations = None
        if salutation_col and salutation_col in row_dict:
            salutations = salutation_list(row_dict[salutation_col])
        else:
            salutations = ["erhalten Sie", "Ihnen", "Ihr", "Ihren"]

        # Evaluate template texts dynamically per row using Jinja2
        # Evaluate template texts dynamically per row using our friendly placeholder formatter and Jinja2 fallback
        subject_raw = data.custom_subject or template_config.get("subject", "Herzlichen Glückwunsch zum Geburtstag!")
        paragraphs_raw = data.custom_paragraphs or template_config.get("paragraphs", [])
        poem_raw = template_config.get("poem", [])

        ctx = {
            "row": row_dict,
            "year": year,
            "salutation_list": salutations
        }

        rendered_subject = format_custom_text(subject_raw, salutations, ctx)
        rendered_paragraphs = [format_custom_text(p, salutations, ctx) for p in paragraphs_raw]
        rendered_poem = [format_custom_text(line, salutations, ctx) for line in poem_raw]
        rendered_closing_headline = format_custom_text(template_config.get("closing_headline", ""), salutations, ctx)
        rendered_closing_wishes = format_custom_text(template_config.get("closing_wishes", ""), salutations, ctx)

        all_html += template.render(
            row=row_dict,
            index=index,
            total=total_rows,
            year=year,
            salutation_list=salutations,
            last_page=last_page,
            theme=template_config.get("theme", "theme-red"),
            subject=rendered_subject,
            paragraphs=rendered_paragraphs,
            poem=rendered_poem,
            closing_headline=rendered_closing_headline,
            closing_wishes=rendered_closing_wishes,
            **encoded_assets
        )

    pdf_options = {
        'encoding': 'UTF-8',
        'page-size': 'A4',
        'margin-top': '0mm',
        'margin-right': '0mm',
        'margin-bottom': '0mm',
        'margin-left': '0mm',
        'enable-local-file-access': None,
        'disable-smart-shrinking': None,
    }

    unique_id = uuid.uuid4().hex
    output_pdf = os.path.join(BASE_DIR, f"temp_{unique_id}.pdf")
    
    config = get_pdfkit_configuration()
    pdfkit.from_string(all_html, output_pdf, options=pdf_options, configuration=config)

    # Register task to delete temp file after sending response
    background_tasks.add_task(remove_file, output_pdf)

    return FileResponse(output_pdf, media_type='application/pdf', filename="Geburtstagsbriefe.pdf")


@app.post("/preview_csv")
async def preview_csv(req: PreviewRequest) -> Dict[str, Any]:
    templates = load_templates()
    template_config = next((t for t in templates if t["id"] == req.template_id), None)
    if not template_config:
        raise HTTPException(status_code=400, detail={"message": f"Template with ID '{req.template_id}' not found."})

    detected_encoding = detect_file_encoding(req.file_path)
    encoding = req.encoding or detected_encoding
    detected_delim = detect_csv_delimiter(req.file_path, encoding)
    delimiter = req.delimiter or detected_delim

    df = read_csv_safely(req.file_path, encoding, delimiter)

    required = template_config.get("required_columns", [])
    if required:
        df = df.dropna(subset=[col for col in required if col in df.columns], how='all')

    sample = df.head(max(1, min(50, req.n_rows))).to_dict(orient='records')
    presence = required_columns_present(df, required)

    return {
        "detected_encoding": detected_encoding,
        "detected_delimiter": detected_delim,
        "used_encoding": df.attrs.get('used_encoding', encoding),
        "used_delimiter": df.attrs.get('used_delimiter', delimiter),
        "columns": list(df.columns),
        "rows": sample,
        "required_columns": presence,
        "required_columns_order": required,
        "row_count_estimate": int(df.shape[0]),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)