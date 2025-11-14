const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta';

// Middleware para proteger rotas que exigem autenticação
module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }

    // Divide o header em "Bearer" e o token
    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
        return res.status(401).json({ error: 'Token erro.' });
    }

    const [scheme, token] = parts;
    
    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ error: 'Token malformatado.' });
    }

    try {
        // Verifica se o token é válido e recupera o ID do usuário
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id; // Salva o ID do usuário na requisição para usar na rota
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido.' });
    }
};