const express = require('express');
const router = express.Router();
const db = require('../db');
const authOptional = require('../middleware/authOptional');

router.get('/', authOptional, async (req, res) => {
  try {
    const limit = 20;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    // --- PARÂMETROS DE FILTRO E ORDENAÇÃO ---
    const { name, type, rarity, forSale, isnew, sort, order, startDate, endDate, onPromotion } = req.query;

    let queryText = 'SELECT * FROM cosmetics WHERE 1=1';
    const queryParams = [];
    let paramCount = 1;

    // --- FILTROS ---
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
    if (forSale === 'true') {
      queryText += ` AND price > 0`;
    }
    if (isnew === 'true') {
      queryText += ` AND is_new = true`;
    }
    if (startDate) {
      queryText += ` AND added_at::date >= $${paramCount}`;
      queryParams.push(startDate);
      paramCount++;
    }
    if (endDate) {
      queryText += ` AND added_at::date <= $${paramCount}`;
      queryParams.push(endDate);
      paramCount++;
    }
    if (onPromotion === 'true') {
      queryText += ` AND on_promotion = true`;
    }
    if (req.query.isBundle === 'true') {
      // Considera bundle somente o que tem mais de 1 item no mesmo pacote
      queryText += ` AND bundle_id IS NOT NULL AND EXISTS (
          SELECT 1 
          FROM cosmetics c2
          WHERE c2.bundle_id = cosmetics.bundle_id 
          AND c2.id != cosmetics.id
      )`;
    }
    if (req.query.owned === 'true' && req.userId) {
      queryText += ` AND id IN (SELECT cosmetic_id FROM purchases WHERE user_id = $${paramCount})`;
      queryParams.push(req.userId);
      paramCount++;
    }

    // Conta total para paginação
    const countQueryText = queryText.replace('SELECT *', 'SELECT COUNT(*)');
    const totalResult = await db.query(countQueryText, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count);

    // --- ORDENAÇÃO ---
    let sortColumn = 'name'; // Padrão
    let sortDirection = 'ASC'; // Padrão

    if (sort === 'date') sortColumn = 'added_at';
    if (sort === 'rarity') sortColumn = 'rarity';
    if (sort === 'price') sortColumn = 'price';
    
    if (order && order.toLowerCase() === 'desc') sortDirection = 'DESC';

    // Adiciona paginação e ordenação à query
    queryText += ` ORDER BY ${sortColumn} ${sortDirection} LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
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

router.get('/bundle/:bundleId', async (req, res) => {
  const { bundleId } = req.params;
  try {
    const result = await db.query(
      'SELECT id, name, image_url, rarity, type FROM cosmetics WHERE bundle_id = $1',
      [bundleId]
    );
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Erro ao obter itens do bundle:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;