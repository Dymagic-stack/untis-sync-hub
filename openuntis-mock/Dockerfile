FROM node:20-alpine

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . ./

ENV MOCK_PORT=8000
EXPOSE 8000
CMD ["node", "mock-server.cjs"]
