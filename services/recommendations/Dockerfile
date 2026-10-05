FROM python:3.12-alpine
WORKDIR /app
COPY packages/common /app/common
COPY services/recommendations /app/service
ENV PYTHONPATH=/app
EXPOSE 8080
USER 65532:65532
CMD ["python3", "/app/service/app.py"]

