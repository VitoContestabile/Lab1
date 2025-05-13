// routes/admin.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { client } = require('../config/db.js');
const { SECRET } = require('../middleware/auth');

// Verificar si el usuario es administrador
const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: 'Falta el token' });
    }

    const token = authHeader.split(' ')[1]; // Formato: "Bearer token"

    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Token inválido' });
        }

        const userId = decoded.userId;

        client.query('SELECT is_admin FROM users WHERE id = $1', [userId], (err, result) => {
            if (err) {
                console.error('Error al verificar administrador:', err);
                return res.status(500).json({ message: 'Error interno' });
            }

            if (result.rows.length === 0 || !result.rows[0].is_admin) {
                return res.status(403).json({ message: 'No tienes permisos de administrador' });
            }

            req.adminId = userId;
            next();
        });
    });
};

// Obtener todos los usuarios (solo para admins)
router.get('/users', verifyAdmin, (req, res) => {
    client.query('SELECT id, username, coins, score, is_admin, is_freezed FROM users ORDER BY id ASC', (err, usersResult) => {
        if (err) {
            console.error('Error al obtener usuarios:', err);
            return res.status(500).json({ message: 'Error al obtener usuarios' });
        }
        res.json(usersResult.rows);
    });
});

// Crear un nuevo usuario (solo para admins)
router.post('/create-user', verifyAdmin, (req, res) => {
    // Obtener datos del nuevo usuario
    const { username, password, email, isAdmin } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ message: 'Faltan datos para crear el usuario' });
    }

    // Verificar si el usuario ya existe
    client.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email], (err, checkResult) => {
        if (err) {
            console.error('Error al verificar usuario existente:', err);
            return res.status(500).json({ message: 'Error al verificar usuario existente' });
        }

        if (checkResult.rows.length > 0) {
            return res.status(409).json({ message: 'El nombre de usuario o email ya existe' });
        }

        // Crear nuevo usuario
        client.query(
            'INSERT INTO users (username, password, email, is_admin, coins, score) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [username, password, email, isAdmin, 0, 0],
            (err, insertResult) => {
                if (err) {
                    console.error('Error al crear usuario:', err);
                    return res.status(500).json({ message: 'Error al crear el usuario' });
                }

                res.status(201).json({
                    message: 'Usuario creado exitosamente',
                    userId: insertResult.rows[0].id
                });
            }
        );
    });
});

// Congelar/descongelar usuario (toggle freeze)
router.post('/toggle-freeze', verifyAdmin, (req, res) => {
    const { userId } = req.body;

    // Verificar si el usuario a freezear es admin
    client.query('SELECT is_admin FROM users WHERE id = $1', [userId], (err2, userResult) => {
        if (err2) {
            console.error(err2);
            return res.status(500).json({ message: 'Error interno' });
        }

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if (userResult.rows[0].is_admin) {
            return res.status(400).json({ message: 'No se puede freezeear un administrador' });
        }

        // Si no es admin, toggleamos freeze
        client.query('UPDATE users SET is_freezed = NOT is_freezed WHERE id = $1 RETURNING is_freezed', [userId], (err3, result3) => {
            if (err3) {
                console.error(err3);
                return res.status(500).json({ message: 'Error interno al freezeear' });
            }
            res.status(200).json({ is_freezed: result3.rows[0].is_freezed });
        });
    });
});

module.exports = router;