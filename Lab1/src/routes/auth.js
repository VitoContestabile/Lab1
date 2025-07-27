// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { client } = require('../config/db.js');
const { SECRET } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');


// 📧 Configurar transporte de correo
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'plappypird@gmail.com',
        pass: 'rijoetfioapqhcwj'
    }
});

// 📝 REGISTRO CON CONFIRMACIÓN
router.post('/register', async (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password || !email) {
        return res.status(400).json({ message: 'Faltan campos.' });
    }

    const confirmationToken = uuidv4();

    client.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error verificando usuario', error: err });
        if (result.rows.length > 0) return res.status(400).json({ message: 'El usuario ya existe.' });

        client.query(
            'INSERT INTO users (username, password, email, is_confirmed, confirmation_token) VALUES ($1, $2, $3, false, $4) RETURNING id',
            [username, password, email, confirmationToken],
            async (err, result) => {
                if (err) return res.status(500).json({ message: 'Error al registrar', error: err });
                const userId = result.rows[0].id;

                // Insertar valores por defecto
                try {
                    await client.query('INSERT INTO skins_user (skin_id, user_id, equiped) VALUES ($1, $2, true)', [1, userId]);
                    await client.query('INSERT INTO pipes_user (pipe_id, user_id, equiped) VALUES ($1, $2, true)', [1, userId]);
                    await client.query('INSERT INTO backgrounds_user (background_id, user_id, equiped) VALUES ($1, $2, true)', [1, userId]);
                } catch (e) {
                    return res.status(500).json({ message: 'Error al asignar elementos', error: e });
                }
                const BASE_URL = process.env.BASE_URL;
                // Enviar email de confirmación
                const confirmUrl = `${BASE_URL}/auth/confirm-email?token=${confirmationToken}`;
                const mailOptions = {
                    from: 'Flappy App <flappybird@gmail.com>',
                    to: email,
                    subject: 'Confirmá tu cuenta',
                    html: `<p>Hola ${username}, hacé clic para confirmar tu cuenta:</p><a href="${confirmUrl}">${confirmUrl}</a>`
                };

                try {
                    await transporter.sendMail(mailOptions);
                    res.status(201).json({ message: 'Registrado. Revisá tu correo para confirmar.' });
                } catch (mailErr) {
                    res.status(500).json({ message: 'Usuario creado pero falló el mail.', error: mailErr });
                }
            }
        );
    });
});

// ✅ CONFIRMACIÓN DE CORREO
router.get('/confirm-email', (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Falta token.' });

    client.query(
        'UPDATE users SET is_confirmed = true, confirmation_token = NULL WHERE confirmation_token = $1 RETURNING id',
        [token],
        (err, result) => {
            if (err) return res.status(500).json({ message: 'Error al confirmar.', error: err });
            if (result.rowCount === 0) return res.status(400).json({ message: 'Token inválido.' });

            res.status(200).json({ message: 'Cuenta confirmada. Ya podés iniciar sesión.' });
        }
    );
});

// 🔐 LOGIN CON VERIFICACIÓN DE CONFIRMACIÓN
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Faltan campos.' });

    client.query(
        'SELECT id, username, is_admin, is_confirmed FROM users WHERE username = $1 AND password = $2',
        [username, password],
        (err, result) => {
            if (err) return res.status(500).json({ message: 'Error en login.', error: err });
            if (result.rows.length === 0) return res.status(400).json({ message: 'Credenciales inválidas.' });

            const user = result.rows[0];

            if (!user.is_confirmed) {
                return res.status(403).json({ message: 'Confirmá tu cuenta por mail antes de iniciar sesión.' });
            }

            // Freeze check (si ya lo tenés)
            client.query('SELECT is_freezed FROM users WHERE id = $1', [user.id], (err2, freezeResult) => {
                if (err2) return res.status(500).json({ message: 'Error al verificar freeze.' });

                if (freezeResult.rows[0]?.is_freezed) {
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
    );
});

module.exports = router;
