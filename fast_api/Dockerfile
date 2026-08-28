FROM python:3.12-slim

# Install wkhtmltopdf and its runtime dependencies
RUN apt-get update && apt-get install -y \
    wkhtmltopdf \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements from build context (root)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy FastAPI files from build context's fast_api folder
COPY fast_api/ .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
