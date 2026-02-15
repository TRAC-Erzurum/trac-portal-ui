FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

ARG VERSION=
ENV VITE_APP_VERSION=$VERSION

RUN yarn build

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache nginx gettext

COPY --from=builder /app/dist ./dist
COPY nginx.conf /etc/nginx/nginx.conf
COPY server_template.conf /etc/nginx/server_template.conf

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

RUN mkdir -p /etc/nginx/conf.d

CMD ["/docker-entrypoint.sh"]
