# Mirrors cv-service/Dockerfile. No OpenCV system libraries needed here - this
# service only reads PDFs and talks to an API.
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bake the local embedding model into the image (~66MB ONNX). Without this the
# first upload of a fresh container stalls while it downloads, and an offline
# or rate-limited host would fail indexing outright. Embeddings run locally so
# indexing needs no API key and consumes no quota.
RUN python -c "from langchain_community.embeddings import FastEmbedEmbeddings; FastEmbedEmbeddings(model_name='BAAI/bge-small-en-v1.5').embed_query('warm the cache')"

COPY . .

# 8100, because cv-service already owns 8000
EXPOSE 8100
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8100"]
