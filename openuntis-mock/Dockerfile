FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY mock-server.cjs ./
COPY sample-data ./sample-data
EXPOSE 8000
CMD ["node", "mock-server.cjs"]
