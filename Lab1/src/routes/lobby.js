const express = require('express');
const router = express.Router();
const { client } = require('../config/db.js');

// Consulta SQL para crear un lobby
const INSERT_LOBBY_QUERY = `
    INSERT INTO lobby (host_id, status)
    VALUES ($1, 'waiting')
        RETURNING id, status, created_at, host_id
`;

const JOIN_lOBBY_QUERY= `
    UPDATE lobby
    SET guest_id= $2, status='active'
    WHERE id= $1 and status='waiting'
`;

// Consulta SQL para obtener información del lobby y datos del host
const GET_LOBBY_WITH_HOST_QUERY = `
  SELECT 
    lobby.id AS lobby_id,
    lobby.status,
    lobby.created_at,
    users.id AS host_id,
    users.username AS host_username,
    users.email AS host_email
  FROM lobby
  JOIN users ON lobby.host_id = users.id
  WHERE lobby.id = $1
`;

async function joinLobby(lobby_id, guest_id){
    return client.query(JOIN_lOBBY_QUERY, [lobby_id, guest_id])
}

// Función para crear el lobby
async function createLobby(hostId) {
    return client.query(INSERT_LOBBY_QUERY, [hostId]);
}

// Función para obtener información del lobby con datos del host
async function getLobbyWithHost(lobbyId) {
    return client.query(GET_LOBBY_WITH_HOST_QUERY, [lobbyId]);
}

// Endpoint para crear un lobby
router.post('/create_lobby', async (req, res) => {
    const { myId: hostId } = req.body; // Extraemos el ID del usuario que será el host

    if (!hostId) {
        return res.status(400).json({ success: false, message: 'El hostId es obligatorio' });
    }

    try {
        const createResult = await createLobby(hostId); // Crear el lobby
        const lobbyId = createResult.rows[0].id;

        // Realizamos el JOIN para obtener detalles del host
        const lobbyWithHostResult = await getLobbyWithHost(lobbyId);

        res.status(201).json({
            success: true,
            message: 'Lobby creado con éxito',
            lobby: lobbyWithHostResult.rows[0] // Respuesta del JOIN
        });
    } catch (err) {
        console.error('Error al intentar crear el lobby:', err);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al crear el lobby',
            error: err.message
        });
    }
});

// Endpoint para unirse un lobby
router.post('/join_lobby', async (req, res) => {
    const { myId: guestId, lobby_id: lobbyId } = req.body; // Extraemos el ID del usuario que será el host

    if (!guestId || !lobbyId) {
        return res.status(400).json({ success: false, message: 'El guestId es obligatorio' });
    }

    try {
        await joinLobby(lobbyId,guestId); // se une al lobby

        res.status(201).json({
            success: true,
            message: 'Se unió al lobby con éxito', // Respuesta del JOIN
        });
    } catch (err) {
        console.error('Error al intentar unirse al lobby:', err);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al unirse al lobby',
            error: err.message
        });
    }
});

module.exports = router;