FROM python:3.12-alpine
WORKDIR /app
COPY packages/common /app/common
COPY services/inventory /app/service
RUN mkdir -p /data && chown -R 65532:65532 /app /data
ENV PYTHONPATH=/app
ENV DATA_DIR=/data
EXPOSE 8080
USER 65532:65532
CMD ["python3", "/app/service/app.py"]
