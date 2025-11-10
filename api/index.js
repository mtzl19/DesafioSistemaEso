const express = require('express');
const cors = require('cors');
const db = require('./db');
const syncCosmetics = require('./sync');
const cosmeticsRouter = require('./routes/cosmetics');
const authRouter = require('./routes/auth');

const app = express();
const port = 3001;

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/api/cosmetics', cosmeticsRouter);
app.use('/api/auth', authRouter);

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