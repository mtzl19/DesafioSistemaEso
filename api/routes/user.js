const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Rota protegida para comprar um cosmético
router.post('/purchase/:cosmeticId', authMiddleware, async (req, res) => {
    const { userId } = req; // Vem do middleware de autenticação
    const { cosmeticId } = req.params;

    try {
        // INÍCIO DA TRANSAÇÃO
        await db.query('BEGIN');

        // 1. Verificar o item e seu preço
        const itemResult = await db.query('SELECT price, name FROM cosmetics WHERE id = $1', [cosmeticId]);
        if (itemResult.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Item não encontrado.' });
        }
        const item = itemResult.rows[0];

        // 2. Verificar saldo do usuário
        const userResult = await db.query('SELECT balance FROM users WHERE id = $1', [userId]);
        const userBalance = userResult.rows[0].balance;

        if (userBalance < item.price) {
            await db.query('ROLLBACK');
            return res.status(400).json({ error: 'Saldo insuficiente.' });
        }

        // 3. Verificar se já possui o item
        const checkOwned = await db.query('SELECT * FROM purchases WHERE user_id = $1 AND cosmetic_id = $2', [userId, cosmeticId]);
        if (checkOwned.rows.length > 0) {
             await db.query('ROLLBACK');
             return res.status(400).json({ error: 'Você já possui este item.' });
        }

        // 4. Realizar a compra (Descontar saldo e Adicionar item)
        await db.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [item.price, userId]);
        await db.query('INSERT INTO purchases (user_id, cosmetic_id) VALUES ($1, $2)', [userId, cosmeticId]);

        // FINALIZA A TRANSAÇÃO
        await db.query('COMMIT');

        // Atualizar o saldo do usuário para retornar na resposta
        const newBalanceResult = await db.query('SELECT balance FROM users WHERE id = $1', [userId]);

        res.json({
            message: `Compra realizada: ${item.name}!`,
            newBalance: newBalanceResult.rows[0].balance,
            purchasedItemId: cosmeticId
        });

    } catch (error) {
        await db.query('ROLLBACK'); // Reverte a transação em caso de erro
        console.error('Erro na compra:', error);
        res.status(500).json({ error: 'Erro ao processar compra.' });
    }
});

// Rota para listar os itens comprados pelo usuário
router.get('/my-items', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT c.*, uc.purchased_at
            FROM cosmetics c
            INNER JOIN purchases uc ON c.id = uc.cosmetic_id
            WHERE uc.user_id = $1
            ORDER BY uc.purchased_at DESC
        `, [req.userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar itens do usuário:', error);
        res.status(500).json({ error: 'Erro no servidor.' });
    }
});

// Rota para obter APENAS os IDs dos itens comprados pelo usuário
router.get('/purchased-ids', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT cosmetic_id FROM purchases WHERE user_id = $1',
            [req.userId]
        );
        // Retorna um array simples de IDs: ['id1', 'id2', 'id3']
        const ids = result.rows.map(row => row.cosmetic_id);
        res.json(ids);
    } catch (error) {
        console.error('Erro ao buscar IDs comprados:', error);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

module.exports = router;