const client = require('../config/db');

exports.getSkins = async (req, res) => {
    const { userId } = req.body;

    try {
        const result = await client.query(
            "SELECT * FROM skins NATURAL JOIN skins_user WHERE user_id = $1",
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error al obtener skins:", err);
        res.status(500).json({ error: "Error interno al obtener skins" });
    }
};

exports.buySkin = async (req, res) => {
    const { skinId, userId } = req.body;

    try {
        const { rows: skinYaLaTiene } = await client.query(
            'SELECT * FROM skins_user WHERE user_id = $1 AND skin_id = $2',
            [userId, skinId]
        );

        if (skinYaLaTiene.length > 0) {
            return res.json({ success: false, message: 'Ya tienes esta skin' });
        }

        const { rows: userCoins } = await client.query(
            'SELECT coins FROM users WHERE id = $1',
            [userId]
        );

        const { rows: skin } = await client.query(
            'SELECT price FROM skins WHERE skin_id = $1',
            [skinId]
        );

        if (userCoins[0].coins < skin[0].price) {
            return res.json({ success: false, message: 'No tienes suficientes monedas' });
        }

        await client.query('BEGIN');

        await client.query(
            'UPDATE users SET coins = coins - $1 WHERE id = $2',
            [skin[0].price, userId]
        );

        await client.query(
            'INSERT INTO skins_user (user_id, skin_id) VALUES ($1, $2)',
            [userId, skinId]
        );

        await client.query('COMMIT');
        res.json({ success: true, message: 'Skin comprada exitosamente' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error en la compra de skin:', err);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};
