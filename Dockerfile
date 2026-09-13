
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build


FROM node:20-alpine
WORKDIR /app


COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY --from=builder /app/dist ./dist

COPY .env ./

EXPOSE 4000
CMD ["node", "dist/src/main.js"]