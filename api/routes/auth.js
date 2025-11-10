const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Chave secreta para JWT
const JWT_SECRET = 'chave_secreta';

// Rota de registro
router.post('/register', async (req, res) => {
    const { email, password, username } = req.body;

    // Validação básica
    if (!email || !password || !username) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    try {
        // Verificar se o usuário já existe
        const emailExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (emailExists.rows.length > 0) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }

        // Verificar se o nome de usuário já existe
        const usernameExists = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (usernameExists.rows.length > 0) {
            return res.status(400).json({ error: 'Nome de usuário já foi usado' });
        }

        // Hash da senha
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Inserir novo usuário no banco de dados
        const newUser = await db.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, balance',
            [username, email, hashedPassword]
        );

        // Gerar token JWT
        const token = jwt.sign({ id: newUser.rows[0].id }, JWT_SECRET, { expiresIn: '24h'});

        res.status(201).json({
            message: 'Usuário registrado com sucesso',
            user: newUser.rows[0],
            token
        });
    } catch (err) {
        console.error('Erro no registro do usuário:', err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// Rota de login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Buscar usuário pelo email
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({ error: 'Email ou senha inválidos' });
        }

        // Verificar a senha
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Email ou senha inválidos' });
        }

        // Gerar token JWT
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });

        // Retornar o token e informações do usuário
        res.json({
            message: 'Login bem-sucedido',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                balance: user.balance
            },
            token
        });
    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

module.exports = router;