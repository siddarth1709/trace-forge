FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend code
COPY backend /app/backend

ENV PYTHONPATH=/app/backend
ENV FALKOR_HOST=r-6jissuruar.instance-1064q3xyh.hc-7up0crkyn.ap-south-1.aws.f2e0a955bb84.cloud
ENV FALKOR_PORT=50916
ENV FALKOR_USERNAME=falkordb
ENV FALKOR_PASSWORD=2yxuOEMV07Gt
ENV FALKOR_SSL=0
ENV TF_GRAPH=traceforge
ENV TF_MODE=live
ENV CORS_ALLOW_ALL=1

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --app-dir /app/backend"]
