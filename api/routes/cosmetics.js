const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    // log
    console.log('Listando cosméticos com filtros:', req.query);

    const limit = 20;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    // Filtros opcionais
    const { name, type, rarity } = req.query;

    // Construção dinâmica da query com filtros
    let queryText = 'SELECT * FROM cosmetics WHERE 1=1';
    const queryParams = [];
    let paramCount = 1;

    if (name) {
      queryText += ` AND name ILIKE $${paramCount}`;
      queryParams.push(`%${name}%`);
      paramCount++;
    }

    if (type) {
      queryText += ` AND type = $${paramCount}`;
      queryParams.push(type);
      paramCount++;
    }

    if (rarity) {
      queryText += ` AND rarity = $${paramCount}`;
      queryParams.push(rarity);
      paramCount++;
    }
    // Query para contar o total de itens com os filtros aplicados
    const countQueryText = queryText.replace('SELECT *', 'SELECT COUNT(*)');
    const totalResult = await db.query(countQueryText, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count);

    // Query final de dados
    queryText += ` ORDER BY name ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await db.query(queryText, queryParams);
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      data: result.rows,
      pagination: { totalItems, totalPages, currentPage: page, itemsPerPage: limit }
    });
  } catch (error) {
    console.error('Erro ao listar cosméticos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;