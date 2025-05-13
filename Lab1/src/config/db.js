const { Client } = require('pg');
require('dotenv').config();
// Crear una nueva conexión a la base de datos
const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT, 10),
    });

// Función para conectar a la base de datos
const connectDB = () => {
    client.connect((err) => {
        if (err) {
            console.error('Error al conectar a la base de datos', err);
        } else {
            console.log('Conectado a la base de datos PostgreSQL');
        }
    });
};

module.exports = { connectDB, client };
