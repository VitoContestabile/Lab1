// routes/admin.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { client } = require('../config/db.js');
const { SECRET } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'plappypird@gmail.com',
        pass: 'rijoetfioapqhcwj'
    }
});

// Configuración de Multer para almacenar imágenes
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Carpeta donde se guardarán las imágenes
        cb(null, 'public/assets/');
    },
    filename: function (req, file, cb) {
        // Generar nombre único para la imagen
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'skin-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtro para validar tipos de archivo
const fileFilter = (req, file, cb) => {
    // Aceptar solo imágenes
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos de imagen'), false);
    }
};

// Configurar multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // Límite de 5MB
    },
    fileFilter: fileFilter
});

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

// Función para enviar email de freeze/unfreeze
async function sendFreezeEmail(userEmail, username, isBeingFrozen, reason) {
    const subject = isBeingFrozen ?
        '🚫 Tu cuenta ha sido suspendida - Flappy Bird' :
        '✅ Tu cuenta ha sido reactivada - Flappy Bird';

    let htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
            <div style="background-color: #333366; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🐦 Flappy Bird</h1>
            </div>
            <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2>Hola ${username},</h2>
    `;

    if (isBeingFrozen) {
        htmlContent += `
                <p style="color: #d32f2f; font-size: 16px; font-weight: bold;">Tu cuenta ha sido suspendida temporalmente.</p>
                ${reason ? `<p><strong>Razón:</strong> ${reason}</p>` : ''}
                <p>Durante este período, no podrás acceder al juego. Si crees que esto es un error, por favor contacta al administrador.</p>
        `;
    } else {
        htmlContent += `
                <p style="color: #388e3c; font-size: 16px; font-weight: bold;">¡Tu cuenta ha sido reactivada!</p>
                ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
                <p>Ya puedes volver a jugar Flappy Bird. ¡Que disfrutes el juego!</p>
        `;
    }

    htmlContent += `
                <div style="margin-top: 30px; padding: 20px; background-color: #f5f5f5; border-radius: 5px; text-align: center;">
                    <p style="margin: 0; color: #666;">Equipo de Flappy Bird</p>
                </div>
            </div>
        </div>
    `;

    const mailOptions = {
        from: 'plappypird@gmail.com',
        to: userEmail,
        subject: subject,
        html: htmlContent
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email de ${isBeingFrozen ? 'freeze' : 'unfreeze'} enviado a ${userEmail}`);
        return true;
    } catch (error) {
        console.error('Error enviando email:', error);
        return false;
    }
}

// Endpoint modificado
router.post('/toggle-freeze', verifyAdmin, async (req, res) => {
    const { userId, reason } = req.body;

    try {
        // Verificar si el usuario a freezear es admin y obtener sus datos
        const userResult = await new Promise((resolve, reject) => {
            client.query('SELECT is_admin, email, username, is_freezed FROM users WHERE id = $1', [userId], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const user = userResult.rows[0];

        if (user.is_admin) {
            return res.status(400).json({ message: 'No se puede freezear un administrador' });
        }

        // Toggle freeze status
        const updateResult = await new Promise((resolve, reject) => {
            client.query('UPDATE users SET is_freezed = NOT is_freezed WHERE id = $1 RETURNING is_freezed', [userId], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        const newFreezeStatus = updateResult.rows[0].is_freezed;
        const isBeingFrozen = newFreezeStatus; // true si se está freezeando, false si se está desfreezando

        // Enviar email solo si el usuario tiene email
        if (user.email) {
            const emailSent = await sendFreezeEmail(user.email, user.username, isBeingFrozen, reason);

            if (!emailSent) {
                console.log('Warning: No se pudo enviar el email, pero el freeze/unfreeze se completó');
            }
        }

        const message = isBeingFrozen ?
            `Usuario ${user.username} freezeado exitosamente` :
            `Usuario ${user.username} desfreezado exitosamente`;

        res.status(200).json({
            is_freezed: newFreezeStatus,
            message: message
        });

    } catch (error) {
        console.error('Error en toggle-freeze:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// mandar un nuevo Mensaje (solo para admins)
router.post('/send-message', verifyAdmin, (req, res) => {

    const {user_id, alert_message} = req.body;

    if (!user_id || !alert_message) {
        return res.status(400).json({ message: 'Faltan datos para enviar el mensaje' });
    }

    client.query('INSERT INTO messages (user_id, message) VALUES ($1, $2)', [user_id, alert_message], (err, checkResult) => {
        if (err) {
            console.error('Error al enviar mensaje', err);
            return res.status(500).json({ message: 'Error al enviar mensaje' });
        }

        return res.status(201).json({
            message: 'Mensaje enviado exitosamente',
        });
    });
});

// Modificar una skin existente (solo para admins)
router.post('/modify-skin', verifyAdmin, (req, res) => {
    const { skin_id, skin_name, skin_rarity, skin_price } = req.body;

    if (!skin_id || !skin_name || !skin_rarity || !skin_price) {
        return res.status(400).json({ message: 'Faltan datos para modificar la skin' });
    }

    client.query(
        'UPDATE skins SET name = $1, rarity = $2, price = $3 WHERE skin_id = $4',
        [skin_name, skin_rarity, skin_price, skin_id],
        (err, result) => {
            if (err) {
                console.error('Error al modificar la skin:', err);
                return res.status(500).json({ message: 'Error al modificar la skin' });
            }

            if (result.rowCount === 0) {
                return res.status(404).json({ message: 'No se encontró la skin para modificar' });
            }

            return res.status(200).json({ message: 'Skin modificada exitosamente' });
        }
    );
});

router.post('/modify-pipe', verifyAdmin, (req, res) => {
    const { pipe_id, pipe_name, pipe_rarity, pipe_price } = req.body;

    if (!pipe_id || !pipe_name || !pipe_rarity || !pipe_price) {
        return res.status(400).json({ message: 'Faltan datos para modificar la skin' });
    }

    client.query(
        'UPDATE pipes SET name = $1, rarity = $2, price = $3 WHERE pipe_id = $4',
        [pipe_name, pipe_rarity, pipe_price, pipe_id],
        (err, result) => {
            if (err) {
                console.error('Error al modificar la pipe:', err);
                return res.status(500).json({ message: 'Error al modificar la pipe' });
            }

            if (result.rowCount === 0) {
                return res.status(404).json({ message: 'No se encontró la pipe para modificar' });
            }

            return res.status(200).json({ message: 'Pipe modificada exitosamente' });
        }
    );
});

router.post('/modify-bg', verifyAdmin, (req, res) => {
    const { background_id, background_name, background_rarity, background_price } = req.body;

    if (!background_id || !background_name || !background_rarity || !background_price) {
        return res.status(400).json({ message: 'Faltan datos para modificar el background' });
    }

    client.query(
        'UPDATE backgrounds SET name = $1, rarity = $2, price = $3 WHERE background_id = $4',
        [background_name, background_rarity, background_price, background_id],
        (err, result) => {
            if (err) {
                console.error('Error al modificar el background:', err);
                return res.status(500).json({ message: 'Error al modificar el background' });
            }

            if (result.rowCount === 0) {
                return res.status(404).json({ message: 'No se encontró el background para modificar' });
            }

            return res.status(200).json({ message: 'background modificada exitosamente' });
        }
    );
});

// Añadir una nueva skin (solo para admins)
router.post('/add-skin', verifyAdmin, upload.single('skin_image'), (req, res) => {
    const { skin_name, skin_rarity, skin_price } = req.body;

    // Validar que se proporcionaron todos los datos necesarios
    if (!skin_name || !skin_rarity || !skin_price) {
        return res.status(400).json({
            message: 'Faltan datos: se requiere skin_name, skin_rarity y skin_price'
        });
    }

    // Validar que se subió una imagen
    if (!req.file) {
        return res.status(400).json({
            message: 'Se requiere una imagen para la skin'
        });
    }

    // Validar rareza
    const validRarities = ['común', 'raro', 'épico', 'legendario'];
    if (!validRarities.includes(skin_rarity)) {
        return res.status(400).json({
            message: 'Rareza inválida. Debe ser: común, raro, épico o legendario'
        });
    }

    // Validar precio
    const price = parseInt(skin_price);
    if (isNaN(price) || price < 0) {
        return res.status(400).json({
            message: 'El precio debe ser un número válido mayor o igual a 0'
        });
    }

    // Construir la URL de la imagen
    const image_url = `./assets/${req.file.filename}`;

    // Insertar la nueva skin en la base de datos
    client.query(
        'INSERT INTO skins (name, image_url, price, rarity) VALUES ($1, $2, $3, $4) RETURNING *',
        [skin_name, image_url, price, skin_rarity],
        (err, result) => {
            if (err) {
                console.error('Error al añadir la skin:', err);
                return res.status(500).json({
                    message: 'Error al añadir la skin a la base de datos'
                });
            }

            // Devolver la skin creada
            return res.status(201).json({
                message: 'Skin añadida exitosamente',
                skin: result.rows[0]
            });
        }
    );
});

router.post('/add-pipe', verifyAdmin, upload.single('skin_image'), (req, res) => {
    const { pipe_name, pipe_rarity, pipe_price } = req.body;

    // Validar que se proporcionaron todos los datos necesarios
    if (!pipe_name || !pipe_rarity || !pipe_price) {
        return res.status(400).json({
            message: 'Faltan datos: se requiere pipe_name, pipe_rarity y pipe_price'
        });
    }

    // Validar que se subió una imagen
    if (!req.file) {
        return res.status(400).json({
            message: 'Se requiere una imagen para la skin'
        });
    }

    // Validar rareza
    const validRarities = ['común', 'raro', 'épico', 'legendario'];
    if (!validRarities.includes(pipe_rarity)) {
        return res.status(400).json({
            message: 'Rareza inválida. Debe ser: común, raro, épico o legendario'
        });
    }

    // Validar precio
    const price = parseInt(pipe_price);
    if (isNaN(price) || price < 0) {
        return res.status(400).json({
            message: 'El precio debe ser un número válido mayor o igual a 0'
        });
    }

    // Construir la URL de la imagen
    const image_url = `./assets/${req.file.filename}`;

    // Insertar la nueva skin en la base de datos
    client.query(
        'INSERT INTO pipes (name, image_url, price, rarity) VALUES ($1, $2, $3, $4) RETURNING *',
        [pipe_name, image_url, price, pipe_rarity],
        (err, result) => {
            if (err) {
                console.error('Error al añadir la pipe:', err);
                return res.status(500).json({
                    message: 'Error al añadir la pipe a la base de datos'
                });
            }

            // Devolver la skin creada
            return res.status(201).json({
                message: 'Skin añadida exitosamente',
                skin: result.rows[0]
            });
        }
    );
});

router.post('/add-bg', verifyAdmin, upload.single('background_image'), (req, res) => {
    const { background_name, background_rarity, background_price } = req.body;

    // Validar que se proporcionaron todos los datos necesarios
    if (!background_name || !background_rarity || !background_price) {
        return res.status(400).json({
            message: 'Faltan datos: se requiere background_name, background_rarity y background_price'
        });
    }

    // Validar que se subió una imagen
    if (!req.file) {
        return res.status(400).json({
            message: 'Se requiere una imagen para la skin'
        });
    }

    // Validar rareza
    const validRarities = ['común', 'raro', 'épico', 'legendario'];
    if (!validRarities.includes(background_rarity)) {
        return res.status(400).json({
            message: 'Rareza inválida. Debe ser: común, raro, épico o legendario'
        });
    }

    // Validar precio
    const price = parseInt(background_price);
    if (isNaN(price) || price < 0) {
        return res.status(400).json({
            message: 'El precio debe ser un número válido mayor o igual a 0'
        });
    }

    // Construir la URL de la imagen
    const image_url = `./assets/${req.file.filename}`;

    // Insertar la nueva skin en la base de datos
    client.query(
        'INSERT INTO backgrounds (name, image_url, price, rarity) VALUES ($1, $2, $3, $4) RETURNING *',
        [background_name, image_url, price, background_rarity],
        (err, result) => {
            if (err) {
                console.error('Error al añadir el background:', err);
                return res.status(500).json({
                    message: 'Error al añadir el background a la base de datos'
                });
            }

            // Devolver la skin creada
            return res.status(201).json({
                message: 'Skin añadida exitosamente',
                skin: result.rows[0]
            });
        }
    );
});


// Middleware para manejar errores de Multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                message: 'El archivo es demasiado grande. Máximo 5MB permitido.'
            });
        }
    }

    if (error.message === 'Solo se permiten archivos de imagen') {
        return res.status(400).json({
            message: 'Solo se permiten archivos de imagen (jpg, png, gif, etc.)'
        });
    }

    next(error);
});

module.exports = router;