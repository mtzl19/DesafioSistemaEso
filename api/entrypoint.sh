#!/bin/sh

# Instala as dependências se a pasta node_modules não existir ou estiver vazia
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules)" ]; then
  echo "Instalando dependências..."
  npm install
fi

# Inicia a aplicação
echo "Iniciando servidor..."
exec "$@"