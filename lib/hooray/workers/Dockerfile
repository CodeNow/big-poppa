FROM node:4.4.7

COPY package.json /app/package.json
WORKDIR /app
RUN npm install

COPY ./ /app/

CMD ["npm", "run", "init-start-hooray-worker"]
