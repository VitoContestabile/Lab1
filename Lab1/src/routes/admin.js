// routes/admin.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { client } = require('../config/db.js');
const { SECRET } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');


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