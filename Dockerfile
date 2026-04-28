FROM node:20-alpine

WORKDIR /app

# Install build dependencies for sqlite3
RUN apk add --no-cache python3 make g++

COPY server/package*.json ./
# Clean install to ensure no old binaries remain
RUN npm install

COPY server/ .
COPY web-ui/dist ./dist

EXPOSE 3000

CMD ["node", "index.js"]
