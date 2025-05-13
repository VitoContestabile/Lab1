// middleware/auth.js
const jwt = require('jsonwebtoken');
const SECRET = 'clave'; // Mejor moverlo a variables de entorno en producción

// Middleware para verificar token
function verifyToken(req, res, next) {
    // Obtener el encabezado de autorización
    const authHeader = req.headers.authorization;

    // Verificar si existe el header de autorización
    if (!authHeader) {
        return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        // Extraer el token (asumiendo formato 'Bearer token')
        const token = authHeader;

        // Verificar el token
        const decoded = jwt.verify(token, SECRET);

        // Añadir el userId al objeto de solicitud para uso posterior
        req.userId = decoded.userId;

        // Continuar con la siguiente función middleware
        next();
    } catch (error) {
        console.error('Error de verificación de token:', error);
        return res.status(401).json({ message: 'Token inválido o expirado.' });
    }
}
module.exports = { verifyToken, SECRET };