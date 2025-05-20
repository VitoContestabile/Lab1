require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const { connectDB } = require('./src/config/db.js');
const { setupDatabase } = require('./src/models/db-setup.js');
const {seedData} = require('./src/models/seed.js');
const routes = require('./src/routes');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

async function startServer() {
    await connectDB();         // ✅ esperar conexión
    await setupDatabase();// ✅ luego configurar tablas
    await seedData();

    app.use('/', routes);

    app.listen(port, () => {
        console.log(`Servidor escuchando en el puerto ${port}`);
    });
}

startServer(); // 🚀 inicia todo
