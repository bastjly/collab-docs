FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN mkdir -p uploads
EXPOSE 3001
CMD ["node", "src/index.js"]
