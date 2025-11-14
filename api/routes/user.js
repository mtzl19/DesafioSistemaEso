const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const bcrypt = require('bcryptjs');

router.post('/purchase/:cosmeticId', authMiddleware, async (req, res) => {
    const { userId } = req;
    const { cosmeticId } = req.params;

    try {
        await db.query('BEGIN');

        // 1. Buscar o item a ser comprado
        const itemResult = await db.query(
            'SELECT price, name, bundle_id FROM cosmetics WHERE id = $1', 
            [cosmeticId]
        );
        
        if (itemResult.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Item não encontrado.' });
        }
        const item = itemResult.rows[0];
        const itemPrice = item.price; 
        const bundleId = item.bundle_id;

        // 2. Verificar saldo do usuário
        const userResult = await db.query(
            'SELECT balance FROM users WHERE id = $1 FOR UPDATE', 
            [userId]
        );
        const userBalance = userResult.rows[0].balance;

        if (userBalance < itemPrice) {
            await db.query('ROLLBACK');
            return res.status(400).json({ error: 'Saldo insuficiente.' });
        }

        // 3. Definir quais itens serão comprados
        const itemsToPurchaseIds = [];
        if (bundleId) {
            // Se for um bundle, buscar todos os itens do pacote
            const bundleItemsResult = await db.query(
                'SELECT id FROM cosmetics WHERE bundle_id = $1', 
                [bundleId]
            );
            bundleItemsResult.rows.forEach(row => itemsToPurchaseIds.push(row.id));
        } else {
            // Se é um item normal > Adiciona só ele.
            itemsToPurchaseIds.push(cosmeticId);
        }

        // 4. Descontar o saldo (uma única vez)
        const updateResult = await db.query(
            'UPDATE users SET balance = balance - $1 WHERE id = $2 RETURNING balance', 
            [itemPrice, userId]
        );
        const newBalance = updateResult.rows[0].balance;

        // 5. Inserir todos os itens do bundle (ou o item único)
        for (const idToInsert of itemsToPurchaseIds) {
            await db.query(
                `INSERT INTO purchases (user_id, cosmetic_id, price_paid) 
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, cosmetic_id) DO NOTHING`,
                [userId, idToInsert, itemPrice] 
            );
        }

        // 6. Registrar transação no histórico
        await db.query(
            `INSERT INTO transaction_history (user_id, cosmetic_id, transaction_type, amount)
             VALUES ($1, $2, 'c', $3)`,
            [userId, cosmeticId, -itemPrice] // 'c' para compra
        );

        await db.query('COMMIT');
        
        // Retornar sucesso com detalhes
        res.json({
            message: `Compra realizada: ${item.name}!`,
            newBalance: newBalance, // Usando o valor do RETURNING
            purchasedItemIds: itemsToPurchaseIds
        });

    } catch (error) {
        await db.query('ROLLBACK'); // Garante rollback em caso de erro
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
            `SELECT p.price_paid, c.bundle_id
             FROM purchases p
             JOIN cosmetics c ON p.cosmetic_id = c.id
             WHERE p.user_id = $1 AND p.cosmetic_id = $2`,
            [userId, cosmeticId]
        );

        if (purchaseResult.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Você não possui este item para devolver.' });
        }
        const { price_paid: refundAmount, bundle_id: bundleId } = purchaseResult.rows[0];
        const itemsToRemoveIds = [];

        if (bundleId) {
            // Se for um bundle, buscar todos os itens do bundle que o usuário possui
            const bundleItemsResult = await db.query(
                `SELECT c.id FROM cosmetics c
                 JOIN purchases p ON c.id = p.cosmetic_id
                 WHERE c.bundle_id = $1 AND p.user_id = $2`,
                [bundleId, userId]
            );

            itemsToRemoveIds.push(...bundleItemsResult.rows.map(row => row.id));
            
            // Deleta todos os itens do bundle
            await db.query(
                'DELETE FROM purchases WHERE user_id = $1 AND cosmetic_id IN (SELECT id FROM cosmetics WHERE bundle_id = $2)',
                [userId, bundleId]
            );
        } else {
            // Se é um item normal > Remove só ele.
            itemsToRemoveIds.push(cosmeticId);
            await db.query(
                'DELETE FROM purchases WHERE user_id = $1 AND cosmetic_id = $2',
                [userId, cosmeticId]
            );
        }

        // 3. Devolver o saldo (V-Bucks) para o usuário
        const userResult = await db.query(
            'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance',
            [refundAmount, userId]
        );
        const newBalance = userResult.rows[0].balance;

        // 4. Registrar devolução no histórico
        await db.query(
            `INSERT INTO transaction_history (user_id, cosmetic_id, transaction_type, amount)
             VALUES ($1, $2, 'v', $3)`,
            [userId, cosmeticId, refundAmount]
        );

        // 5. Confirmar a transação
        await db.query('COMMIT');

        // 6. Retornar o novo saldo e o valor devolvido
        res.status(200).json({
            newBalance: newBalance,
            refundAmount: refundAmount,
            removedItemIds: itemsToRemoveIds
        });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Erro na devolução:', error);
        res.status(500).json({ error: 'Erro ao processar devolução.' });
    }
});

// Rota para listar os cosméticos comprados pelo usuário
router.get('/my-items', authMiddleware, async (req, res) => {
    const { userId } = req;
    try {
        const result = await db.query(
            `SELECT c.*, uc.purchase_date, uc.price_paid
             FROM cosmetics c
             INNER JOIN purchases uc ON c.id = uc.cosmetic_id
             WHERE uc.user_id = $1
             ORDER BY uc.purchase_date DESC`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar itens do usuário:', error);
        res.status(500).json({ error: 'Erro no servidor.' });
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

// Rota para atualizar o perfil (username/senha)
router.patch('/profile', authMiddleware, async (req, res) => {
    const { userId } = req;
    const { username, password } = req.body;

    if (!username && !password) {
        return res.status(400).json({ error: 'Nenhum dado fornecido para atualização.' });
    }

    try {
        await db.query('BEGIN');

        if (username) {
            if (username.length < 5) {
                throw new Error('O nome de usuário deve ter pelo menos 5 caracteres.');
            }
            const userExists = await db.query(
                'SELECT id FROM users WHERE username = $1 AND id != $2',
                [username, userId]
            );
            if (userExists.rows.length > 0) {
                throw new Error('Este nome de usuário já está em uso.');
            }
            await db.query('UPDATE users SET username = $1 WHERE id = $2', [username, userId]);
        }

        if (password) {
            if (password.length < 6) {
                throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
        }

        const updatedUserResult = await db.query(
            'SELECT id, username, email, balance FROM users WHERE id = $1',
            [userId]
        );

        await db.query('COMMIT');

        res.status(200).json({
            message: 'Perfil atualizado com sucesso!',
            user: updatedUserResult.rows[0]
        });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Erro ao atualizar perfil:', error);
        res.status(400).json({ error: error.message || 'Erro ao processar atualização.' });
    }
});

// Rota para buscar o histórico de transações do usuário
router.get('/history', authMiddleware, async (req, res) => {
    const { userId } = req;
    try {
        const result = await db.query(
            `WITH RankedHistory AS (
                -- 1. Pega o histórico de transações do usuário
                SELECT 
                    h.id, h.transaction_type, h.amount, h.transaction_date, 
                    c.name, c.image_url, c.rarity, c.bundle_id, c.set_text
                FROM transaction_history h
                JOIN cosmetics c ON h.cosmetic_id = c.id
                WHERE h.user_id = $1
            ),
            BundleItems AS (
                -- 2. Para cada bundle, ranqueia seus itens (outfit=1, pickaxe=2, etc.)
                SELECT 
                    bundle_id, 
                    image_url,
                    rarity,
                    ROW_NUMBER() OVER(
                        PARTITION BY bundle_id 
                        ORDER BY 
                            CASE type
                                WHEN 'outfit' THEN 1
                                WHEN 'pickaxe' THEN 2
                                WHEN 'backpack' THEN 3
                                WHEN 'glider' THEN 4
                                ELSE 5
                            END,
                            rarity DESC
                    ) as rnk
                FROM cosmetics
                WHERE bundle_id IN (SELECT bundle_id FROM RankedHistory WHERE bundle_id IS NOT NULL)
            )
            -- 3. Junta o histórico com os 3 itens principais do bundle (como JSON)
            SELECT 
                rh.*,
                (SELECT JSON_AGG(json_build_object('image_url', bi.image_url, 'rarity', bi.rarity))
                 FROM BundleItems bi
                 WHERE bi.bundle_id = rh.bundle_id AND bi.rnk <= 3
                ) as bundle_items
            FROM RankedHistory rh
            ORDER BY rh.transaction_date DESC
            LIMIT 50`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({ error: 'Erro ao buscar histórico.' });
    }
});


// --- ROTAS PÚBLICAS DE USUÁRIOS ---

// Rota para o Pódio (Top 3 Colecionadores)
router.get('/users/ranking', async (req, res) => {
    try {
        const result = await db.query(
            `WITH all_purchases AS (
                -- 1. Pega todos os itens que NÃO SÃO de bundle
                SELECT p.user_id, p.price_paid
                FROM purchases p
                JOIN cosmetics c ON p.cosmetic_id = c.id
                WHERE c.bundle_id IS NULL
                
                UNION ALL
                
                -- 2. Pega os bundles, mas apenas UMA VEZ por bundle/usuário
                SELECT DISTINCT ON (p.user_id, c.bundle_id)
                    p.user_id,
                    p.price_paid
                FROM purchases p
                JOIN cosmetics c ON p.cosmetic_id = c.id
                WHERE c.bundle_id IS NOT NULL
            )
            SELECT 
                u.id, 
                u.username, 
                COALESCE(SUM(ap.price_paid), 0) as collection_value,
                (SELECT COUNT(*) FROM purchases p_count WHERE p_count.user_id = u.id) as item_count
            FROM users u
            LEFT JOIN all_purchases ap ON u.id = ap.user_id
            GROUP BY u.id
            ORDER BY collection_value DESC
            LIMIT 3`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar ranking:', error);
        res.status(500).json({ error: 'Erro ao buscar ranking.' });
    }
});

// Rota para a lista pública de usuários (paginada)
router.get('/users', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    try {
        const usersResult = await db.query(
            `WITH all_purchases AS (
                -- 1. Pega todos os itens que NÃO SÃO de bundle
                SELECT p.user_id, p.price_paid
                FROM purchases p
                JOIN cosmetics c ON p.cosmetic_id = c.id
                WHERE c.bundle_id IS NULL
                
                UNION ALL
                
                -- 2. Pega os bundles, mas apenas UMA VEZ por bundle/usuário
                SELECT DISTINCT ON (p.user_id, c.bundle_id)
                    p.user_id,
                    p.price_paid
                FROM purchases p
                JOIN cosmetics c ON p.cosmetic_id = c.id
                WHERE c.bundle_id IS NOT NULL
            )
            SELECT 
                u.id, 
                u.username, 
                COALESCE(SUM(ap.price_paid), 0) as collection_value,
                (SELECT COUNT(*) FROM purchases p_count WHERE p_count.user_id = u.id) as item_count
            FROM users u
            LEFT JOIN all_purchases ap ON u.id = ap.user_id
            GROUP BY u.id
            ORDER BY collection_value DESC, u.username ASC
            LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        const totalResult = await db.query('SELECT COUNT(*) FROM users');
        const totalUsers = parseInt(totalResult.rows[0].count, 10);

        res.json({
            users: usersResult.rows,
            totalUsers: totalUsers,
            totalPages: Math.ceil(totalUsers / limit)
        });

    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro ao listar usuários.' });
    }
});

// Rota para o perfil e itens de um usuário público
router.get('/users/profile/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const userResult = await db.query(
            'SELECT id, username FROM users WHERE username = $1', 
            [username]
        );
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        const user = userResult.rows[0];

        const itemsResult = await db.query(
            `SELECT c.*, p.purchase_date, p.price_paid
             FROM cosmetics c
             JOIN purchases p ON c.id = p.cosmetic_id
             WHERE p.user_id = $1
             ORDER BY p.purchase_date DESC`,
            [user.id]
        );

        res.json({
            user: user,
            items: itemsResult.rows
        });

    } catch (error) {
        console.error('Erro ao buscar perfil público:', error);
        res.status(500).json({ error: 'Erro ao buscar perfil público.' });
    }
});

// Rota de debug
router.post('/debug/seed', async (req, res) => {
    const count = parseInt(req.query.count) || 10;
    const itemsPerUser = parseInt(req.query.items) || 30;

    console.log(`---[DEBUG]--- Iniciando seed de ${count} usuários com ${itemsPerUser} itens...`);

    try {
        const cosmeticsResult = await db.query(
            'SELECT id, price FROM cosmetics WHERE price > 0 ORDER BY RANDOM() LIMIT 500'
        );
        const cosmeticsPool = cosmeticsResult.rows;

        if (cosmeticsPool.length < itemsPerUser) {
            return res.status(500).json({ error: "Pool de cosméticos no DB é muito pequeno para semear." });
        }

        await db.query('BEGIN');

        for (let i = 0; i < count; i++) {
            const username = `jogador_teste_${Date.now()}_${i}`;
            const email = `debug_${i}@eso.com`;
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            
            const userResult = await db.query(
                `INSERT INTO users (username, email, password, balance) 
                 VALUES ($1, $2, $3, 10000) 
                 RETURNING id`,
                [username, email, hashedPassword]
            );
            const newUserId = userResult.rows[0].id;
            
            const userItems = [...cosmeticsPool].sort(() => 0.5 - Math.random()).slice(0, itemsPerUser);

            const purchaseValues = [];
            const queryParams = [newUserId];
            let paramIndex = 2;

            for (const item of userItems) {
                purchaseValues.push(`($1, $${paramIndex++}, $${paramIndex++})`);
                queryParams.push(item.id, item.price);
            }

            if (purchaseValues.length > 0) {
                const purchaseQuery = `INSERT INTO purchases (user_id, cosmetic_id, price_paid) 
                                       VALUES ${purchaseValues.join(', ')}`;
                await db.query(purchaseQuery, queryParams);
            }
        } 

        await db.query('COMMIT');
        
        console.log(`---[DEBUG]--- Seed concluída com sucesso!`);
        res.status(201).json({ message: `${count} usuários semeados com sucesso.` });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Erro ao semear usuários:', error);
        res.status(500).json({ error: 'Erro ao semear usuários.' });
    }
});

module.exports = router;