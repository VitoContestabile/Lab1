// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { client } = require('../config/db.js');
const { SECRET } = require('../middleware/auth');

// Ruta para registrar usuarios
router.post('/register', (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ message: 'Por favor completa todos los campos.' });
    }

    // Verificar si el usuario ya existe
    client.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error al verificar el usuario', error: err });
        }

        if (result.rows.length > 0) {
            return res.status(400).json({ message: 'El usuario ya existe.' });
        }

        // Insertar el nuevo usuario en la base de datos
        client.query('INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id',
            [username, password, email], (err, result) => {
                if (err) {
                    return res.status(500).json({ message: 'Error al registrar el usuario', error: err });
                }
                res.status(201).json({ message: 'Usuario registrado con éxito.', userId: result.rows[0].id });
            });
    });
});

// Ruta para login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Por favor ingresa ambos campos.' });
    }

    client.query('SELECT id, username, is_admin FROM users WHERE username = $1 AND password = $2',
        [username, password], (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Error al verificar el usuario', error: err });
            }

            if (result.rows.length > 0) {
                const user = result.rows[0];

                // Consultar si el usuario está freezeado
                client.query('SELECT is_freezed FROM users WHERE id = $1', [user.id], (err2, freezeResult) => {
                    if (err2) return res.status(500).json({ message: 'Error al verificar freeze' });

                    const is_freezed = freezeResult.rows[0]?.is_freezed;

                    if (is_freezed) {
                        return res.status(403).json({ message: 'Usuario freezeado' });
                    }

                    const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '1h' });
                    return res.json({
                        message: 'Login exitoso!',
                        token: token,
                        user: {
                            id: user.id,
                            username: user.username,
                            is_admin: user.is_admin
                        }
                    });
                });
            }
            else {
                return res.status(400).json({ message: 'Usuario o contraseña incorrectos.' });
            }
        });
});

module.exports = router;