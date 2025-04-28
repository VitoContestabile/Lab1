const client = require('../config/db');

exports.getFriends = (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'Falta userId' });

    client.query(`
        SELECT u.username
        FROM users u
        JOIN friends f ON (f.user1_id = $1 AND f.user2_id = u.id) OR (f.user2_id = $1 AND f.user1_id = u.id)
    `, [userId], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error al obtener amigos' });

        res.status(200).json({ friends: result.rows.map(row => row.username) });
    });
};

exports.sendFriendRequest = (req, res) => {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) return res.status(400).json({ message: 'Faltan IDs' });

    const [user1, user2] = senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];

    client.query(`
        SELECT * FROM friends WHERE user1_id = $1 AND user2_id = $2
    `, [user1, user2], (err, result) => {
        if (result.rows.length > 0) return res.status(409).json({ message: 'Ya son amigos' });

        client.query(`
            INSERT INTO friend_requests (sender_id, receiver_id)
            VALUES ($1, $2)
        `, [senderId, receiverId], (err2) => {
            if (err2) return res.status(500).json({ message: 'Error al enviar solicitud' });

            res.status(200).json({ message: 'Solicitud enviada exitosamente' });
        });
    });
};

exports.getFriendRequests = (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'Falta userId' });

    client.query(`
        SELECT u.username
        FROM friend_requests fr
        JOIN users u ON u.id = fr.sender_id
        WHERE fr.receiver_id = $1
    `, [userId], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error al obtener solicitudes' });

        res.status(200).json({ requests: result.rows.map(row => row.username) });
    });
};

exports.acceptFriendRequest = (req, res) => {
    const { senderId, receiverId } = req.body;
    const [user1, user2] = senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];

    client.query(`
        INSERT INTO friends (user1_id, user2_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
    `, [user1, user2], (err) => {
        if (err) return res.status(500).json({ message: 'Error al aceptar solicitud' });

        client.query(`
            DELETE FROM friend_requests
            WHERE sender_id = $1 AND receiver_id = $2
        `, [senderId, receiverId], (err2) => {
            if (err2) return res.status(500).json({ message: 'Error al eliminar solicitud' });

            res.status(200).json({ message: 'Solicitud aceptada' });
        });
    });
};

exports.rejectFriendRequest = (req, res) => {
    const { senderId, receiverId } = req.body;

    client.query(`
        DELETE FROM friend_requests
        WHERE sender_id = $1 AND receiver_id = $2
    `, [senderId, receiverId], (err) => {
        if (err) return res.status(500).json({ message: 'Error al rechazar solicitud' });

        res.status(200).json({ message: 'Solicitud rechazada' });
    });
};
