# Imagem Base
FROM node:20-alpine

# Diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json .

# Instalar dependências
RUN npm install

# Copiar o restante do código
COPY . .

# Expor a porta que o aplicativo vai rodar
EXPOSE 3001

# Comando pra iniciar o aplicativo
CMD ["node", "index.js"]