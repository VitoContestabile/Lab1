// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { connectDB } = require('./src/config/db.js');
const { setupDatabase } = require('./src/models/db-setup.js');
const { seedData } = require('./src/models/seed.js');
const routes = require('./src/routes');
const { initWebSocket } = require('./src/websocket/handlers.js'); // ✅ importar tu módulo WebSocket

const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
const path = require('path');

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'WebMenu.html'));
});

app.use('/', routes);
app.get('/env.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`window.ENV = {
                BASE_URL: '${process.env.BASE_URL}',
        WS_URL: '${process.env.WS_URL}'
    };`);
});

// Inicializar base de datos y servidor
async function startServer() {
    await connectDB();
    await setupDatabase();
    await seedData();

    // Inicializar servidor WebSocket usando el HTTP server
    initWebSocket(server);

    server.listen(port, () => {
        console.log(`Servidor escuchando en el puerto ${port}`);
        console.log(`WebSocket server activo en ws://localhost:${port}`);
    });
}

startServer(); // 🚀 inicia todo
