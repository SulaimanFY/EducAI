FROM python:3.12

WORKDIR /app

RUN apt-get update && apt-get install -y \
    sqlite3 \
    libmupdf-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN pip install uvicorn fastapi sqlalchemy

COPY . .

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
