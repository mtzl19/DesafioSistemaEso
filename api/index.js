const express = require('express');
const cors = require('cors');
const db = require('./db');
const syncCosmetics = require('./sync');
const cosmeticsRouter = require('./routes/cosmetics');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/cosmetics', cosmeticsRouter);

// URL para checar o hash
const NEW_ITEMS_URL = 'https://fortnite-api.com/v2/cosmetics/new';
// Intervalo de verificação
const SYNC_INTERVAL_MS = 1000 * 60 * 30; // 30 minutos
// Armazena o hash atual
let currentAPIHash = null;

async function checkForUpdates() {
    console.log(`--- Verificando atualizações da API (${new Date().toLocaleDateString()}) ---`);
    try {
        const response = await axios.get(NEW_ITEMS_URL);
        const newHash = response.data.data.hashes.br;

        if (newHash && newHash !== currentAPIHash) {
            console.log('Nova atualização detectada! Iniciando sincronização...');
            // Sincroniza os cosméticos
            const updateHash = await syncCosmetics();
            // Atualiza o hash atual
            currentAPIHash = updateHash;
            console.log('Sincronização concluída. Hash atualizado para:', currentAPIHash);
        } else {
            console.log('Nenhuma nova atualização encontrada.');
        }
    } catch (error) {
    console.error('Erro ao verificar atualizações:', error.message);
    }
}

(async () => {
    try {
        console.log('---[SISTEMA]--- Rodando sincronização inicial ao ligar...');
        // Roda a sync pela primeira vez e guarda o hash
        const hash = await syncCosmetics();
        if (hash) {
            currentApiHash = hash;
            console.log(`---[SISTEMA]--- Sincronização inicial concluída. Hash atual: ${currentApiHash}`);
        }

        // Inicia o "agendador" (Intervalo) depois que o primeiro sync acabar
        setInterval(checkForUpdates, SYNC_INTERVAL_MS);

    } catch (error) {
        console.error('---[SISTEMA]--- Falha grave na sincronização inicial:', error.message);
    }
})();

// Inicia o servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});