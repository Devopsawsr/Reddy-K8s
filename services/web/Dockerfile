FROM nginx:1.27-alpine
RUN apk upgrade --no-cache
COPY services/web/public /usr/share/nginx/html
COPY services/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
