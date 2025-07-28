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
                    html: `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmación de cuenta</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background: linear-gradient(180deg, #4ec0ca 0%, #44a08d 100%); min-height: 100vh; position: relative;">
    
    <!-- Nubes de fondo más sutiles -->
    <div style="position: absolute; top: 60px; left: 5%; width: 120px; height: 60px; background: rgba(255, 255, 255, 0.15); border-radius: 60px; animation: float 15s ease-in-out infinite;"></div>
    <div style="position: absolute; top: 140px; right: 8%; width: 90px; height: 45px; background: rgba(255, 255, 255, 0.1); border-radius: 45px; animation: float 18s ease-in-out infinite reverse;"></div>
    <div style="position: absolute; top: 220px; left: 15%; width: 100px; height: 50px; background: rgba(255, 255, 255, 0.12); border-radius: 50px; animation: float 12s ease-in-out infinite;"></div>

    <div style="max-width: 650px; margin: 0 auto; padding: 50px 20px; position: relative; z-index: 10;">
        
        <!-- Container principal -->
        <div style="background: #ffffff; border: 3px solid #2d5016; border-radius: 8px; padding: 40px; box-shadow: 0 8px 32px rgba(45, 80, 22, 0.15); position: relative; overflow: hidden;">
            
            <!-- Tubos decorativos más sutiles -->
            <div style="position: absolute; top: -20px; left: 0; width: 12px; height: calc(100% + 40px); background: linear-gradient(90deg, #2d5016 0%, #4a7c23 100%); opacity: 0.8;"></div>
            <div style="position: absolute; top: -20px; right: 0; width: 12px; height: calc(100% + 40px); background: linear-gradient(270deg, #2d5016 0%, #4a7c23 100%); opacity: 0.8;"></div>

            <!-- Header limpio -->
            <div style="text-align: center; margin-bottom: 35px; position: relative;">
                <h1 style="color: #2d5016; font-size: 28px; font-weight: 600; margin: 0; letter-spacing: 0.5px;">Confirmación de Cuenta</h1>
                <div style="background: #f0f8ff; color: #2d5016; padding: 8px 24px; border: 1px solid #4a7c23; border-radius: 20px; margin: 20px auto 0; display: inline-block; font-size: 14px; font-weight: 500;">Activación requerida</div>
            </div>

            <!-- Saludo profesional -->
            <div style="margin-bottom: 30px;">
                <p style="color: #2d5016; font-size: 18px; font-weight: 600; margin: 0;">
                    Hola ${username},
                </p>
                <p style="color: #4a7c23; font-size: 16px; margin: 10px 0 0 0; line-height: 1.5;">
                    Gracias por registrarte en nuestra plataforma.
                </p>
            </div>

            <!-- Mensaje principal -->
            <div style="margin: 30px 0;">
                <div style="background: #f8fff8; border-left: 4px solid #4a7c23; padding: 25px; margin-bottom: 25px;">
                    <p style="color: #2d5016; font-size: 16px; line-height: 1.6; margin: 0; font-weight: 500;">
                        Para completar el proceso de registro y acceder a todas las funcionalidades de tu cuenta, necesitamos verificar tu dirección de correo electrónico.
                    </p>
                </div>
                
                <p style="color: #4a7c23; font-size: 15px; line-height: 1.6; margin: 20px 0;">
                    Este paso de seguridad nos permite proteger tu cuenta y garantizar que puedas recibir notificaciones importantes.
                </p>
            </div>

            <!-- Botón principal más profesional -->
            <div style="text-align: center; margin: 35px 0;">
                <a href="${confirmUrl}" style="display: inline-block; background: linear-gradient(135deg, #4a7c23 0%, #2d5016 100%); color: white; text-decoration: none; padding: 16px 40px; border: 2px solid #2d5016; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(45, 80, 22, 0.25); transition: all 0.3s ease; position: relative;">
                    Confirmar mi cuenta
                </a>
            </div>

            <!-- Link alternativo profesional -->
            <div style="background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 6px; padding: 25px; margin: 30px 0;">
                <h3 style="color: #2d5016; font-size: 16px; margin: 0 0 15px 0; font-weight: 600;">Enlace alternativo</h3>
                <p style="color: #666; font-size: 14px; margin: 0 0 15px 0; line-height: 1.5;">
                    Si el botón anterior no funciona, puedes copiar y pegar el siguiente enlace en tu navegador:
                </p>
                <div style="background: white; border: 1px solid #ddd; border-radius: 4px; padding: 15px; font-family: monospace; font-size: 13px; color: #4a7c23; word-break: break-all; line-height: 1.4;">
                    ${confirmUrl}
                </div>
            </div>

            <!-- Información de seguridad -->
            <div style="background: #fff8e1; border: 1px solid #ffcc02; border-radius: 6px; padding: 20px; margin: 25px 0;">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <div style="width: 20px; height: 20px; background: #ffcc02; border-radius: 50%; margin-right: 10px; display: flex; align-items: center; justify-content: center; color: #2d5016; font-weight: bold; font-size: 12px;">!</div>
                    <h4 style="color: #2d5016; font-size: 15px; margin: 0; font-weight: 600;">Información importante</h4>
                </div>
                <p style="color: #8b6914; font-size: 14px; margin: 0; line-height: 1.5;">
                    Este enlace de confirmación es válido por 24 horas por motivos de seguridad. Si expira, podrás solicitar uno nuevo desde la página de inicio de sesión.
                </p>
            </div>

            <!-- Footer profesional -->
            <div style="border-top: 1px solid #e0e0e0; padding-top: 25px; margin-top: 35px;">
                <p style="color: #888; font-size: 13px; line-height: 1.5; margin: 0; text-align: center;">
                    Si no has solicitado esta cuenta, puedes ignorar este correo de forma segura. Tu dirección de email no será utilizada hasta que confirmes el registro.
                </p>
                <p style="color: #aaa; font-size: 12px; margin: 15px 0 0 0; text-align: center;">
                    © 2025 Tu Empresa. Todos los derechos reservados.
                </p>
            </div>

            <!-- Elementos decorativos tipo Flappy Bird sutiles -->
            <div style="position: absolute; top: 40px; right: 30px; width: 8px; height: 60px; background: #4a7c23; opacity: 0.1;"></div>
            <div style="position: absolute; bottom: 40px; left: 30px; width: 8px; height: 80px; background: #4a7c23; opacity: 0.1;"></div>
        </div>

        <!-- Suelo minimalista -->
        <div style="margin-top: 20px; height: 20px; background: linear-gradient(180deg, #4a7c23 0%, #2d5016 100%); border-radius: 0 0 8px 8px; opacity: 0.7;"></div>
    </div>

    <!-- Animaciones sutiles -->
    <style>
        @keyframes float {
            0%, 100% { transform: translateX(-20px) translateY(0px); }
            50% { transform: translateX(20px) translateY(-5px); }
        }
        
        a[href="${confirmUrl}"]:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(45, 80, 22, 0.3);
            background: linear-gradient(135deg, #5a8c33 0%, #3d6026 100%);
        }
        
        a[href="${confirmUrl}"]:active {
            transform: translateY(0px);
            box-shadow: 0 2px 8px rgba(45, 80, 22, 0.2);
        }
        
        @media (max-width: 600px) {
            body {
                padding: 20px 10px;
            }
            h1 {
                font-size: 24px !important;
            }
            .container {
                padding: 25px !important;
            }
        }
    </style>
</body>
</html>`
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
