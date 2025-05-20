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
// Consulta SQL para actualizar el estado del lobby a 'PLAYING'
const UPDATE_LOBBY_STATUS_PLAYING = `
    UPDATE lobby
    SET status = 'PLAYING'
    WHERE id = $1 AND host_id = $2
        RETURNING id, status
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

// Función para crear el lobby
async function createLobby(hostId) {
    return client.query(INSERT_LOBBY_QUERY, [hostId]);
}

// Función para obtener información del lobby con datos del host
async function getLobbyWithHost(lobbyId) {
    return client.query(GET_LOBBY_WITH_HOST_QUERY, [lobbyId]);
}
async function joinLobby(lobby_id, guest_id){
    return client.query(JOIN_lOBBY_QUERY, [lobby_id, guest_id])
}
// Función para obtener el host_id usando el lobby_id
async function getHostIdByLobbyId(lobbyId) {
    const query = 'SELECT host_id FROM lobby WHERE id = $1';
    const result = await client.query(query, [lobbyId]);
    return result.rows.length > 0 ? result.rows[0] : null; // Retorna host_id si existe
}

// Función para obtener el guest_id usando el lobby_id
async function getGuestIdByLobbyId(lobbyId) {
    const query = 'SELECT guest_id FROM lobby WHERE id = $1';
    const result = await client.query(query, [lobbyId]);
    return result.rows.length > 0 ? result.rows[0] : null; // Retorna guest_id si existe
}

// Función para actualizar el estado del lobby a PLAYING
async function startGame(lobbyId, hostId) {
    return client.query(UPDATE_LOBBY_STATUS_PLAYING, [lobbyId, hostId]);
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



// Endpoint para verificar si existe un lobby
router.post('/check_lobby', async (req, res) => {
    const { myId, status } = req.body;

    if (!myId || !status) {
        return res.status(400).json({ success: false, message: "Faltan parámetros necesarios" });
    }

    try {
        const query = `
            SELECT id
            FROM lobby
            WHERE (host_id = $1 AND (status = $2 OR status = 'active'))
               OR (guest_id = $1 AND status = 'active')
                LIMIT 1
        `;
        const result = await client.query(query, [myId, status]);


        if (result.rows.length > 0) {
            // Si existe el lobby, devolver el ID
            return res.json({ success: true, exists: true, lobbyId: result.rows[0].id });
        } else {
            // Si no existe
            return res.json({ success: true, exists: false });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
});
router.get('/:id', async (req, res) => {
    const lobbyId = req.params.id;

    try {
        const result = await client.query(`
      SELECT 
        lobby.id AS lobby_id,
        lobby.status,
        lobby.created_at,
        lobby.guest_id,
        users.username AS host_username
      FROM lobby
      JOIN users ON users.id = lobby.host_id
      WHERE lobby.id = $1
    `, [lobbyId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Lobby no encontrado" });
        }

        res.json({ success: true, lobby: result.rows[0] });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
});
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
router.get('/:id/host', async (req, res) => {
    const lobbyId = req.params.id;

    try {
        const result = await getHostIdByLobbyId(lobbyId);
        if (result) {
            return res.json({ success: true, host_id: result.host_id });
        } else {
            return res.status(404).json({ success: false, message: 'Lobby no encontrado' });
        }
    } catch (err) {
        console.error('Error al obtener host_id:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
router.get('/:id/guest', async (req, res) => {
    const lobbyId = req.params.id;

    try {
        const result = await getGuestIdByLobbyId(lobbyId);
        if (result) {
            return res.json({ success: true, guest_id: result.guest_id });
        } else {
            return res.status(404).json({ success: false, message: 'Lobby no encontrado' });
        }
    } catch (err) {
        console.error('Error al obtener guest_id:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Endpoint para iniciar el juego (actualizar estado a PLAYING)
router.post('/:id/start', async (req, res) => {
    const lobbyId = req.params.id;
    const token = req.headers.authorization?.split(' ')[1]; // Extraer token del header

    if (!token) {
        return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    try {
        // Decodificar el token para obtener el ID del usuario
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(base64, 'base64').toString());

        const userId = payload.userId;

        // Obtener el host_id del lobby
        const hostData = await getHostIdByLobbyId(lobbyId);

        if (!hostData) {
            return res.status(404).json({ success: false, message: 'Lobby no encontrado' });
        }

        // Verificar que el usuario que realiza la petición sea el host
        if (hostData.host_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Solo el host puede iniciar el juego'
            });
        }

        // Verificar que haya un guest en el lobby
        const guestData = await getGuestIdByLobbyId(lobbyId);
        if (!guestData || !guestData.guest_id) {
            return res.status(400).json({
                success: false,
                message: 'No se puede iniciar el juego sin un segundo jugador'
            });
        }

        // Actualizar el estado del lobby a PLAYING
        const updateResult = await startGame(lobbyId, userId);

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No se pudo actualizar el lobby' });
        }

        res.json({
            success: true,
            message: 'Juego iniciado correctamente',
            lobby: updateResult.rows[0]
        });

    } catch (err) {
        console.error('Error al iniciar el juego:', err);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al iniciar el juego',
            error: err.message
        });
    }
});
router.post('/check_lobby_start', async (req, res) => {
    const { myId, status } = req.body;

    if (!myId || !status) {
        return res.status(400).json({ success: false, message: "Faltan parámetros necesarios" });
    }

    try {
        const query = `
            SELECT id
            FROM lobby
            WHERE (host_id = $1 AND (status = $2 OR status = 'PLAYING'))
               OR (guest_id = $1 AND status = 'PLAYING')
                LIMIT 1
        `;
        const result = await client.query(query, [myId, status]);


        if (result.rows.length > 0) {
            // Si existe el lobby, devolver el ID
            return res.json({ success: true, exists: true, lobbyId: result.rows[0].id });
        } else {
            // Si no existe
            return res.json({ success: true, exists: false });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
});

module.exports = router;