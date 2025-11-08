const express = require('express');
const router = express.Router();
const db = require('../db');

// Rota GET /api/cosmetics
router.get('/', async (req, res) => {
    try {
        // Paginação
        const limit = 20; // Itens por página
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;

        // Consulta ao banco de dados
        const result = await db.query(
            'SELECT * FROM cosmetics ORDER BY name ASC LIMIT $1 OFFSET $2',
            [limit, offset]
        );

        // Conta total de itens para paginação
        const totalResult = await db.query('SELECT COUNT(*) FROM cosmetics');
        const totalItems = parseInt(totalResult.rows[0].count);
        const totalPages = Math.ceil(totalItems / limit);

        res.json({
            data: result.rows,
            pagination: {
                totalItems,
                totalPages,
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (err) {
        console.error('Erro ao listar cosméticos:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;