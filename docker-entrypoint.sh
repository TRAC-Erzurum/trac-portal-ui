#!/bin/sh

envsubst '${DOMAIN}' < /etc/nginx/server_template.conf > /etc/nginx/conf.d/default.conf

echo "Starting Nuxt server..."
yarn start:prod &

echo "Starting Nginx..."
exec nginx -g "daemon off;"
