const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta';

// Middleware para rotas onde a autenticação é opcional
module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Se um header de autorização existir
    if (authHeader) {
        const parts = authHeader.split(' ');

        // Verifica se o formato é "Bearer token"
        if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
            const token = parts[1];
            try {
                // Tenta verificar o token
                const decoded = jwt.verify(token, JWT_SECRET);
                req.userId = decoded.id; // Se for válido, adiciona o ID do usuário à requisição
            } catch (err) {
                // Se o token for inválido, apenas ignoramos e seguimos sem autenticação
            }
        }
    }

    // Continua para a próxima etapa, autenticado ou não
    return next();
};