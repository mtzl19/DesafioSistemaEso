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
EXPOSE 5173

# Comando pra iniciar o aplicativo
CMD ["npm", "run", "dev", "--", "--host"]