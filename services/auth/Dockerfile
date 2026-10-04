FROM python:3.12-alpine
WORKDIR /app
RUN pip install --no-cache-dir "psycopg[binary]==3.2.10"
COPY packages/common /app/common
COPY services/auth /app/service
ENV PYTHONPATH=/app
ENV DATA_DIR=/data
EXPOSE 8080
CMD ["python3", "/app/service/app.py"]
