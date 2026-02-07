#!/bin/sh

envsubst '${DOMAIN}' < /etc/nginx/server_template.conf > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
