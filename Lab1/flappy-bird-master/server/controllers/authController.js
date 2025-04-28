const client = require('../config/db');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

exports.register = (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Por favor completa todos los campos.' });
    }

    client.query('SELECT * FROM users WHERE username = $1', [username], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error al verificar el usuario' });

        if (result.rows.length > 0) {
            return res.status(400).json({ message: 'El usuario ya existe.' });
        }

        client.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id', [username, password], (err, result) => {
            if (err) return res.status(500).json({ message: 'Error al registrar el usuario' });
            res.status(201).json({ message: 'Usuario registrado exitosamente', userId: result.rows[0].id });
        });
    });
};

exports.login = (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Por favor ingresa ambos campos.' });
    }

    client.query('SELECT id, username, is_admin FROM users WHERE username = $1 AND password = $2', [username, password], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error al verificar el usuario' });

        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Usuario o contraseña incorrectos.' });
        }

        const user = result.rows[0];

        client.query('SELECT is_freezed FROM users WHERE id = $1', [user.id], (err2, freezeResult) => {
            if (err2) return res.status(500).json({ message: 'Error al verificar estado freezeado' });

            if (freezeResult.rows[0]?.is_freezed) {
                return res.status(403).json({ message: 'Usuario bloqueado' });
            }

            const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '1h' });
            res.json({
                message: 'Login exitoso!',
                token,
                user: { id: user.id, username: user.username, is_admin: user.is_admin }
            });
        });
    });
};
