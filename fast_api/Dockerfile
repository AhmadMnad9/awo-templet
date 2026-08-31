FROM python:3.12-slim

# Install wkhtmltopdf dependencies, patched-Qt package, and Liberation fonts (for Arial compatibility)
RUN apt-get update && apt-get install -y \
    curl \
    fontconfig \
    libfreetype6 \
    libjpeg62-turbo \
    libpng16-16 \
    libx11-6 \
    libxcb1 \
    libxext6 \
    libxrender1 \
    xfonts-75dpi \
    xfonts-base \
    fonts-liberation \
    && curl -LO https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6.1-3/wkhtmltox_0.12.6.1-3.bookworm_amd64.deb \
    && dpkg -i wkhtmltox_0.12.6.1-3.bookworm_amd64.deb \
    || apt-get install -fy \
    && rm wkhtmltox_0.12.6.1-3.bookworm_amd64.deb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements from build context (root)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy FastAPI files from build context's fast_api folder
COPY fast_api/ .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
