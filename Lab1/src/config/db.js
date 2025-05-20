const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT, 10),
});

const connectDB = async () => {
    try {
        await client.connect(); // ✅ usa await en lugar de callback
        console.log('Conectado a la base de datos PostgreSQL');
    } catch (err) {
        console.error('Error al conectar a la base de datos', err);
    }
};

module.exports = { connectDB, client };
