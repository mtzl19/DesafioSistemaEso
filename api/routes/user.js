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
        const itemPrice = item.price; // Guarda o preço do item

        // 2. Verificar saldo do usuário
        const userResult = await db.query('SELECT balance FROM users WHERE id = $1', [userId]);
        const userBalance = userResult.rows[0].balance;

        if (userBalance < itemPrice) {
            await db.query('ROLLBACK');
            return res.status(400).json({ error: 'Saldo insuficiente.' });
        }

        // 3. Verificar se já possui o item
        const checkOwned = await db.query('SELECT * FROM purchases WHERE user_id = $1 AND cosmetic_id = $2', [userId, cosmeticId]);
        if (checkOwned.rows.length > 0) {
             await db.query('ROLLBACK');
             return res.status(400).json({ error: 'Você já possui este item.' });
        }

        // 4. Realizar a compra e deduzir saldo
        await db.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [itemPrice, userId]);
        
        // 5. Adicionar item à tabela de compras
        await db.query(
            'INSERT INTO purchases (user_id, cosmetic_id, price_paid) VALUES ($1, $2, $3)', 
            [userId, cosmeticId, itemPrice]
        );

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

// Rota para devolver (refund) um cosmético
router.post('/refund/:cosmeticId', authMiddleware, async (req, res) => {
    const { userId } = req;
    const { cosmeticId } = req.params;

    try {
        await db.query('BEGIN');

        // 1. Encontrar a compra e o valor que foi pago
        const purchaseResult = await db.query(
            'SELECT price_paid FROM purchases WHERE user_id = $1 AND cosmetic_id = $2',
            [userId, cosmeticId]
        );

        if (purchaseResult.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Você não possui este item para devolver.' });
        }

        const refundAmount = purchaseResult.rows[0].price_paid;

        // 2. Remover o item da tabela de compras
        await db.query(
            'DELETE FROM purchases WHERE user_id = $1 AND cosmetic_id = $2',
            [userId, cosmeticId]
        );

        // 3. Devolver o saldo (V-Bucks) para o usuário
        const userResult = await db.query(
            'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance',
            [refundAmount, userId]
        );

        const newBalance = userResult.rows[0].balance;

        // 4. Confirmar a transação
        await db.query('COMMIT');

        // 5. Enviar a resposta que o frontend espera
        res.status(200).json({
            newBalance: newBalance,
            refundAmount: refundAmount
        });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Erro na devolução:', error);
        res.status(500).json({ error: 'Erro ao processar devolução.' });
    }
});


// Rota para listar os itens comprados pelo usuário
router.get('/my-items', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT c.*, uc.purchase_date, uc.price_paid
            FROM cosmetics c
            INNER JOIN purchases uc ON c.id = uc.cosmetic_id
            WHERE uc.user_id = $1
            ORDER BY uc.purchase_date DESC
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
        const ids = result.rows.map(row => row.cosmetic_id);
        res.json(ids);
    } catch (error) {
        console.error('Erro ao buscar IDs comprados:', error);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// Rota para recarregar V-Bucks
router.post('/recharge', authMiddleware, async (req, res) => {
    const { userId } = req;
    const { amount } = req.body; 

    if (!amount || amount <= 0 || typeof amount !== 'number') {
        return res.status(400).json({ error: 'Valor de recarga inválido.' });
    }

    try {
        const result = await db.query(
            'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance',
            [amount, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        
        res.json({ newBalance: result.rows[0].balance });

    } catch (error) {
        console.error('Erro na recarga:', error);
        res.status(500).json({ error: 'Erro ao processar recarga.' });
    }
});

module.exports = router;