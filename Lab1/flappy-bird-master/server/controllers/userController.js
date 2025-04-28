const client = require('../config/db');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

exports.getAllUsers = (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Falta el token' });

    const token = authHeader.split(' ')[1];

    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Token inválido' });

        const userId = decoded.userId;

        client.query('SELECT is_admin FROM users WHERE id = $1', [userId], (err, result) => {
            if (err || !result.rows[0]?.is_admin) return res.status(403).json({ message: 'No autorizado' });

            client.query('SELECT id, username, coins, score, is_admin, is_freezed FROM users ORDER BY id ASC', (err, usersResult) => {
                if (err) return res.status(500).json({ message: 'Error al obtener usuarios' });

                res.json(usersResult.rows);
            });
        });
    });
};

exports.createUser = (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Falta el token' });

    const token = authHeader.split(' ')[1];

    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Token inválido' });

        const adminId = decoded.userId;
        const { username, password, isAdmin } = req.body;

        client.query('SELECT is_admin FROM users WHERE id = $1', [adminId], (err, result) => {
            if (err || !result.rows[0]?.is_admin) return res.status(403).json({ message: 'No autorizado' });

            client.query('INSERT INTO users (username, password, is_admin, coins, score) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [username, password, isAdmin, 0, 0],
                (err, insertResult) => {
                    if (err) return res.status(500).json({ message: 'Error al crear usuario' });

                    res.status(201).json({ message: 'Usuario creado exitosamente', userId: insertResult.rows[0].id });
                }
            );
        });
    });
};

exports.toggleFreezeUser = (req, res) => {
    const { userId } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Falta el token' });

    const token = authHeader.split(' ')[1];

    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Token inválido' });

        const adminId = decoded.userId;

        client.query('SELECT is_admin FROM users WHERE id = $1', [adminId], (err, result) => {
            if (err || !result.rows[0]?.is_admin) return res.status(403).json({ message: 'No autorizado' });

            client.query('UPDATE users SET is_freezed = NOT is_freezed WHERE id = $1 RETURNING is_freezed', [userId], (err2, result2) => {
                if (err2) return res.status(500).json({ message: 'Error al freezeear' });
                res.status(200).json({ is_freezed: result2.rows[0].is_freezed });
            });
        });
    });
};
