// src/websocket/handlers.js

const WebSocket = require('ws');
const { Pool } = require('pg'); // Asumiendo PostgreSQL como en tu código anterior
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Almacenar conexiones activas y datos de lobbies
const connections = {};
const lobbies = {};

// Obtener información del lobby desde la base de datos
async function getLobbyFromDB(lobbyId) {
    try {
        // Corregido para usar la tabla 'lobby' en lugar de 'lobbies'
        const query = `
            SELECT * FROM lobby
            WHERE id = $1`;

        const result = await pool.query(query, [lobbyId]);

        if (result.rows.length > 0) {
            return result.rows[0];
        }
        return null;
    } catch (error) {
        console.error('Error getting lobby data:', error);
        return null;
    }
}

// Broadcast a todos los jugadores en un lobby excepto al remitente (si se especifica)
function broadcastToLobby(lobbyId, data, excludeUserId = null) {
    if (!connections[lobbyId]) return;

    for (const userId in connections[lobbyId]) {
        if (excludeUserId && userId === excludeUserId) continue;
        const connection = connections[lobbyId][userId];
        if (connection.readyState === WebSocket.OPEN) {
            connection.send(JSON.stringify(data));
        }
    }
}

// Inicializar servidor WebSocket
function initWebSocket(server) {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', handleConnection);

    console.log('WebSocket server initialized');
    return wss;
}

// Manejar nuevas conexiones WebSocket
async function handleConnection(ws, req) {
    console.log("New WebSocket connection received");

    // Parsear URL para obtener lobbyId y token
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/');
    const lobbyId = pathParts[3]; // Asumiendo formato /ws/game/:lobbyId
    const token = url.searchParams.get('token');
    const userId = verifyTokenAndGetUserId(token);

    if (!userId || !lobbyId) {
        console.log("Connection rejected: missing userId or lobbyId");
        ws.close();
        return;
    }

    console.log(`Connection accepted for user ${userId} in lobby ${lobbyId}`);

    // Almacenar conexión
    if (!connections[lobbyId]) connections[lobbyId] = {};
    connections[lobbyId][userId] = ws;

    // Obtener información del lobby
    if (!lobbies[lobbyId]) {
        const lobbyData = await getLobbyFromDB(lobbyId);
        if (lobbyData) {
            lobbies[lobbyId] = lobbyData;
            // Adaptar los nombres de campo para que coincidan con los de tu base de datos
            sendLobbyInfo(lobbyData);
        } else {
            console.log(`Lobby ${lobbyId} not found`);
            ws.close();
            return;
        }
    } else {
        sendLobbyInfo(lobbies[lobbyId]);
    }

    function sendLobbyInfo(lobby) {
        // Enviar información del lobby al jugador
        // Adaptado para usar host_id y guest_id de tu esquema
        ws.send(JSON.stringify({
            type: 'LOBBY_INFO',
            hostId: lobby.host_id.toString(),
            guestId: lobby.guest_id ? lobby.guest_id.toString() : null
        }));

        // Verificar si ambos jugadores están conectados
        if (lobby.guest_id && connections[lobbyId][lobby.host_id] && connections[lobbyId][lobby.guest_id]) {
            console.log(`Both players connected in lobby ${lobbyId}`);
            broadcastToLobby(lobbyId, { type: 'ALL_PLAYERS_READY' });
        }
    }

    // Manejar mensajes del cliente
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`Message received from ${userId} in lobby ${lobbyId}:`, data.type);

            // Manejar diferentes tipos de mensajes
            switch (data.type) {
                case 'PLAYER_READY':
                    console.log(`Player ${userId} is ready in lobby ${lobbyId}`);
                    break;

                case 'GAME_START':
                    console.log(`Starting game in lobby ${lobbyId}`);
                    // Actualizar estado del lobby en la base de datos a "PLAYING"
                    updateLobbyStatus(lobbyId, "playing");
                    broadcastToLobby(lobbyId, { type: 'GAME_START' });
                    break;

                case 'PLAYER_POSITION':
                case 'PLAYER_JUMP':
                    // Transmitir a otro jugador en el mismo lobby
                    broadcastToLobby(lobbyId, data, userId);
                    break;

                case 'GAME_OVER':
                    // Guardar puntuación en la base de datos
                    savePlayerScore(userId, data.score);
                    // Transmitir a otro jugador
                    broadcastToLobby(lobbyId, data, userId);
                    break;

                default:
                    console.log(`Unknown message type: ${data.type}`);
            }
        } catch (error) {
            console.error("Error processing message:", error);
        }
    });

    // Manejar desconexión
    ws.on('close', () => {
        console.log(`User ${userId} disconnected from lobby ${lobbyId}`);

        if (connections[lobbyId] && connections[lobbyId][userId]) {
            delete connections[lobbyId][userId];

            // Si no quedan conexiones en el lobby, limpiar
            if (Object.keys(connections[lobbyId]).length === 0) {
                delete connections[lobbyId];
                delete lobbies[lobbyId];
            } else {
                // Notificar a otro jugador sobre la desconexión
                broadcastToLobby(lobbyId, {
                    type: 'PLAYER_DISCONNECTED',
                    userId: userId
                });
            }
        }
    });
}

// Verificar token JWT y extraer userId
function verifyTokenAndGetUserId(token) {
    if (!token) return null;

    try {
        // Decodificar token JWT
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);
        return payload.userId;
    } catch (error) {
        console.error("Error verifying token:", error);
        return null;
    }
}

// Actualizar estado del lobby en la base de datos
async function updateLobbyStatus(lobbyId, status) {
    try {
        // Corregido para usar la tabla 'lobby' en lugar de 'lobbies'
        const query = `
            UPDATE lobby
            SET status = $1
            WHERE id = $2`;

        await pool.query(query, [status, lobbyId]);
        console.log(`Lobby ${lobbyId} status updated to ${status}`);
    } catch (error) {
        console.error('Error updating lobby status:', error);
    }
}

// Guardar puntuación del jugador en la base de datos
async function savePlayerScore(userId, score) {
    try {
        // Actualizamos la puntuación en la tabla de usuarios
        const query = `
            UPDATE users
            SET score = GREATEST(score, $1),
                games_played = games_played + 1
            WHERE id = $2`;

        await pool.query(query, [score, userId]);
        console.log(`Score ${score} saved for user ${userId}`);
    } catch (error) {
        console.error('Error saving score:', error);
    }
}

module.exports = {
    initWebSocket,
    broadcastToLobby,
    connections,
    lobbies
};