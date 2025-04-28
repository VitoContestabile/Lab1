require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const skinRoutes = require('./routes/skinRoutes');
const friendRoutes = require('./routes/friendRoutes');
const { insertDefaultSkins } = require('./utils/insertSkins');

const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Cargar carpeta pública para imágenes, sonidos, etc.

// Inicializar Skins por si faltan
insertDefaultSkins();

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/skins', skinRoutes);
app.use('/api/friends', friendRoutes);

module.exports = app;
