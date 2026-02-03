FROM node:20-alpine AS legacy-builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN rm -rf v2

RUN yarn build && \
    yarn install --production --frozen-lockfile --ignore-scripts && \
    yarn cache clean && \
    find /app/node_modules -type f \( -name "*.md" -o -name "*.markdown" -o -name "CHANGELOG*" -o -name "LICENSE*" -o -name "*.map" -o -name "*.tsbuildinfo" -o -name "*.d.ts" \) -delete && \
    find /app/node_modules -depth -type d \( -name "test" -o -name "tests" -o -name "__tests__" -o -name "doc" -o -name "docs" -o -name "example" -o -name "examples" \) -exec rm -rf {} + 2>/dev/null || true

FROM node:20-alpine AS v2-builder

WORKDIR /app

COPY v2/package.json v2/yarn.lock ./
RUN yarn install --frozen-lockfile

COPY v2 .

RUN yarn build

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache nginx gettext

COPY --from=legacy-builder /app ./
COPY --from=v2-builder /app/dist /app/v2-dist

COPY nginx.conf /etc/nginx/nginx.conf
COPY server_template.conf /etc/nginx/server_template.conf

COPY ./docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

RUN mkdir -p /etc/nginx/conf.d

CMD ["/docker-entrypoint.sh"]
