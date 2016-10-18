FROM node:6.9.0

COPY package.json /app/package.json
WORKDIR /app
RUN npm install

COPY ./ /app/

CMD ["npm", "run", "init-start-big-poppa-worker"]
