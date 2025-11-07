const { Pool } = require('pg');

// Configuração da conexão com o banco de dados PostgreSQL
// DATABASE_URL=postgresql://postgres:docker@db:5432/esodesafio
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Teste de conexão
pool.on('connect', () => {
    console.log('Conectado ao banco de dados PostgreSQL');
});

pool.on('error', (err) => {
    console.error('Erro na conexão com o banco de dados PostgreSQL', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};