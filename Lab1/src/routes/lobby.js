const express = require('express');
const router = express.Router();
const { client } = require('../config/db.js');

router.post('/friends-without-lobby', async (req, res) => {
    const { myId } = req.body;
    try {
        const result = await client.query(`
      SELECT u.id, u.username
      FROM users u
      JOIN friends f ON 
          (f.user1_id = $1 AND f.user2_id = u.id) OR 
          (f.user2_id = $1 AND f.user1_id = u.id)
      WHERE NOT EXISTS (
          SELECT 1
          FROM lobby l
          WHERE 
              l.status IN ('waiting', 'full', 'playing') AND (
                  (l.host_id = $1 AND l.guest_id = u.id) OR
                  (l.host_id = u.id AND l.guest_id = $1)
              )
      )
    `, [myId]);

        res.json(result.rows);
    } catch (err) {
        console.error('Error al buscar amigos sin lobby:', err);
        res.status(500).json({ success: false });
    }
});
router.post('/invite-friend-to-lobby', async (req, res) => {
    const { host_id, friend_id } = req.body;

    try {
        // Verificar que sean amigos
        const friendCheck = await client.query(`
      SELECT 1 FROM friends
      WHERE (user1_id = $1 AND user2_id = $2)
         OR (user1_id = $2 AND user2_id = $1)
    `, [host_id, friend_id]);

        if (friendCheck.rowCount === 0) {
            return res.status(400).json({ success: false, message: 'No son amigos' });
        }

        // Eliminar cualquier lobby anterior del host que esté en espera
        await client.query(`
      DELETE FROM lobby 
      WHERE host_id = $1 AND status = 'waiting' AND guest_id IS NULL
    `, [host_id]);

        // Crear un nuevo lobby
        const result = await client.query(`
      INSERT INTO lobby (host_id, status)
      VALUES ($1, 'waiting')
        RETURNING id
    `, [host_id]);

        res.json({ success: true, lobbyId: result.rows[0].id });
    } catch (err) {
        console.error('Error al invitar al amigo al lobby:', err);
        res.status(500).json({ success: false });
    }
});
router.post('/accept-lobby-invite', async (req, res) => {
    const { lobbyId, guest_id } = req.body;

    try {
        // Verificamos que el lobby existe y aún está esperando
        const result = await client.query(
            `SELECT * FROM lobby WHERE id = $1`,
            [lobbyId]
        );

        const lobby = result.rows[0];

        if (!lobby) {
            return res.status(404).json({ success: false, message: 'Lobby no encontrado' });
        }

        if (lobby.status !== 'waiting' || lobby.guest_id !== null) {
            return res.status(400).json({ success: false, message: 'Lobby no disponible' });
        }

        // Verificamos que sean amigos
        const friendCheck = await client.query(`
      SELECT 1 FROM friends 
      WHERE (user1_id = $1 AND user2_id = $2) 
         OR (user1_id = $2 AND user2_id = $1)
    `, [lobby.host_id, guest_id]);

        if (friendCheck.rowCount === 0) {
            return res.status(403).json({ success: false, message: 'No son amigos' });
        }

        // Se une al lobby
        await client.query(`
      UPDATE lobby 
      SET guest_id = $1, status = 'full'
      WHERE id = $2
    `, [guest_id, lobbyId]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error al aceptar el lobby:', err);
        res.status(500).json({ success: false });
    }
});

module.exports = router;