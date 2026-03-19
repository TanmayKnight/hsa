FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for pymupdf
RUN apt-get update && apt-get install -y \
    libmupdf-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create required directories
RUN mkdir -p inbox processed logs

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

CMD ["python", "src/main.py"]
