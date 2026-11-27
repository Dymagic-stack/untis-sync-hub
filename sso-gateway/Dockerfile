FROM node:20-alpine

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.cjs ./

ENV PORT=10010
EXPOSE 10010

CMD ["npm", "start"]
