FROM node:20-alpine

WORKDIR /app

ARG APP_VERSION=local-dev
ENV APP_VERSION=$APP_VERSION

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
