const express = require('express');
const cors = require('cors');
const db = require('./db');
const syncCosmetics = require('./sync');
const cosmeticsRouter = require('./routes/cosmetics');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use('/api/cosmetics', cosmeticsRouter);

// Rota de teste
app.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW() as now');
        res.json({
            message: 'API funcionando!',
            database_time: result.rows[0].now
        });
    } catch (err) {
        console.error('Erro ao conectar ao banco de dados', err);
        res.status()
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log('Server is running on port', port);
    // Inicia a sincronização dos cosméticos ao iniciar o servidor
    syncCosmetics();
});