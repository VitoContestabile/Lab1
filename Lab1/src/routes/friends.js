const express = require('express');
const router = express.Router();
const { client } = require('../config/db.js');
router.post('/friends', (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'Se requiere el ID de usuario' });
    }

    client.query(`
        SELECT u.id, u.username
        FROM users u
                 JOIN friends f ON
            (f.user1_id = $1 AND f.user2_id = u.id) OR
            (f.user2_id = $1 AND f.user1_id = u.id)
    `, [userId], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error al obtener los amigos', error: err });

        res.status(200).json({ friends: result.rows }); // Devuelve [{ id, username }]
    });
});



router.post('/send-friend-request', async (req, res) => {
    const {senderId, receiverId} = req.body;

    if (!senderId || !receiverId) {
        return res.status(400).json({message: 'Se requieren senderId y receiverId'});
    }

    if (senderId === receiverId) {
        return res.status(400).json({message: 'No podés mandarte solicitud a vos mismo'});
    }
    const adminIdsResult = await client.query(`SELECT id
                                               FROM users
                                               WHERE is_admin = true`);
    const adminIds = adminIdsResult.rows;
    if (
        adminIds.some(admin => admin.id === senderId)
        || adminIds.some(admin => admin.id === receiverId)
    ) {
        return res.status(400).json({message: 'No puedes mandarte solicitud a un administrador'});
    }


    // 1. Verificamos si ya son amigos
    const [user1, user2] = senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];
    client.query(`
        SELECT *
        FROM friends
        WHERE user1_id = $1 AND user2_id = $2
           OR user1_id = $2 AND user2_id = $1
    `, [user1, user2], (err, friendResult) => {
        if (err) return res.status(500).json({message: 'Error al verificar amistad', error: err});

        if (friendResult.rows.length > 0) {
            return res.status(409).json({message: 'Ya son amigos'});
        }

        // 2. Verificamos si ya existe una solicitud en ambos sentidos
        client.query(`
            SELECT *
            FROM friend_requests
            WHERE (sender_id = $1 AND receiver_id = $2)
               OR (sender_id = $2 AND receiver_id = $1)
        `, [senderId, receiverId], (err2, requestResult) => {
            if (err2) return res.status(500).json({message: 'Error al verificar solicitudes existentes', error: err2});

            if (requestResult.rows.length > 0) {
                return res.status(409).json({message: 'Ya hay una solicitud pendiente entre estos usuarios'});
            }

            // 3. Insertamos la solicitud
            client.query(`
                INSERT INTO friend_requests (sender_id, receiver_id)
                VALUES ($1, $2)
            `, [senderId, receiverId], (err3) => {
                if (err3) return res.status(500).json({message: 'Error al enviar solicitud', error: err3});

                res.status(200).json({message: 'Solicitud de amistad enviada exitosamente'});
            });
        });
    });
});
router.post('/friend-requests', (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'Se requiere el ID del usuario' });
    }

    client.query(`
    SELECT u.username
    FROM friend_requests fr
           JOIN users u ON u.id = fr.sender_id
    WHERE fr.receiver_id = $1
  `, [userId], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error al obtener solicitudes', error: err });

        const requestUsernames = result.rows.map(row => row.username);
        res.status(200).json({ requests: requestUsernames });
    });
});
router.post('/accept-friend-request', (req, res) => {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
        return res.status(400).json({ message: 'Se requieren senderId y receiverId' });
    }

    // Insertamos la amistad (en orden ascendente para cumplir con el CHECK)
    const [user1, user2] = senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];

    client.query(`
    INSERT INTO friends (user1_id, user2_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
  `, [user1, user2], (err) => {
        if (err) return res.status(500).json({ message: 'Error al aceptar la solicitud', error: err });

        // Eliminamos la solicitud
        client.query(`
      DELETE FROM friend_requests
      WHERE sender_id = $1 AND receiver_id = $2
    `, [senderId, receiverId], (err2) => {
            if (err2) return res.status(500).json({ message: 'Error al eliminar la solicitud', error: err2 });

            res.status(200).json({ message: 'Solicitud aceptada con éxito' });
        });
    });
});
router.post('/reject-friend-request', (req, res) => {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
        return res.status(400).json({ message: 'Se requieren senderId y receiverId' });
    }

    client.query(`
    DELETE FROM friend_requests
    WHERE sender_id = $1 AND receiver_id = $2
  `, [senderId, receiverId], (err) => {
        if (err) return res.status(500).json({ message: 'Error al rechazar la solicitud', error: err });

        res.status(200).json({ message: 'Solicitud rechazada con éxito' });
    });
});
router.post('/delete-friend', (req, res) => {
    const { userId, friendId } = req.body;

    // Validar la entrada
    if (!userId || !friendId || isNaN(userId) || isNaN(friendId)) {
        return res.status(400).json({ message: 'userId y friendId son obligatorios y deben ser números válidos' });
    }

    // Consulta SQL
    client.query(
        `DELETE FROM friends WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
        [userId, friendId],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Error al eliminar amigo', error: err.message });
            }

            if (result.rowCount === 0) {
                return res.status(404).json({ message: 'No se encontró la amistad para eliminar' });
            }

            res.status(200).json({ message: `Amigo con ID ${friendId} eliminado por usuario ${userId}` });
        }
    );
});
module.exports = router;