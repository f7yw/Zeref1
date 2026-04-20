FROM node:20-alpine

RUN apk add --no-cache \
  ffmpeg \
  imagemagick \
  libwebp

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install --legacy-peer-deps && \
    npm cache clean --force

COPY . .

EXPOSE 5000

CMD ["node", "index.js"]