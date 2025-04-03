# ===== Development =====
FROM node:18-alpine As development

WORKDIR /app

COPY package.json ./

RUN npm i

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ===== Production =====
# FROM node:18-alpine As production
# WORKDIR /app
# COPY package*.json ./
# RUN npm ci --only=production
# COPY --from=development /app/dist ./dist
# EXPOSE 3000
# CMD ["node", "dist/server.js"]
