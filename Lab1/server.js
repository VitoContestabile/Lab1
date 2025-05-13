require('dotenv').config(); // ← esta línea debe estar antes de todo lo que use process.env

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { connectDB } = require('./src/config/db.js');
const routes = require('./src/routes');

// Crear la aplicación Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Inicializar la conexión a la base de datos
connectDB();

// Registrar todas las rutas
app.use('/', routes);

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});
