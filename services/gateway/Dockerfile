FROM nginx:1.27-alpine
RUN apk upgrade --no-cache
COPY services/gateway/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
