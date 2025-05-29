const express = require('express');
const router = express.Router();
const { client } = require('../config/db.js');
// tomar skins
router.post("/get-skins", async (req, res) => {
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
});


// comprar una skin

router.post('/comprar-skin', async (req, res) => {
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
        res.json({ success: true, message: 'Skin comprada con éxito' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.json({ success: false, message: 'Error en la compra' });
    }
});
router.post("/get-all-skins", async (req, res) => {
    try {
        const result = await client.query("SELECT * FROM skins");
        res.json(result.rows);
    } catch (err) {
        console.error("Error al obtener todas las skins:", err);
        res.status(500).json({ error: "Error interno al obtener skins" });
    }
});
router.post("/select-skin", async (req, res) => {
    const { userId, skinId } = req.body;
    try {
        await client.query('UPDATE skins_user SET equiped=FALSE WHERE user_id= $1 and equiped=TRUE', [userId]);
        await client.query('UPDATE skins_user SET equiped=TRUE WHERE user_id= $1 and skin_id=$2', [userId,skinId]);

        res.json({ message: "Current skin actualizada con éxito" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al actualizar skin equipada" });
    }
});
router.post("/get-current-skin-image", async (req, res) => {
    const { userId } = req.body;
    try {
        const result = await client.query(
            'SELECT image_url FROM skins_user JOIN skins on skins.skin_id = skins_user.skin_id WHERE user_id = $1 AND equiped = TRUE',
            [userId]
        );

        const imageUrl = result.rows[0]?.image_url;
        if (!imageUrl) {
            return res.status(404).json({ error: "No skin equipada encontrada" });
        }

        res.json({ image_url: imageUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener la skin" });
    }
});

router.post("/get-current-skin-id", async (req, res) => {
    const { userId } = req.body;
    try {
        const result = await client.query(
            'SELECT skin_id FROM skins_user WHERE user_id = $1 AND equiped = TRUE',
            [userId]
        );
        const skinId = result.rows[0]?.skin_id;
        if (!skinId) {
            return res.json({ skinId: "" });
        }

        res.json({ skinId: skinId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener la skin" });
    }
});

module.exports = router;