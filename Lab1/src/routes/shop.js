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

router.post("/get-pipes", async (req, res) => {
    const { userId } = req.body;

    try {
        const result = await client.query(
            "SELECT * FROM pipes NATURAL JOIN pipes_user WHERE user_id = $1",
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error al obtener pipes:", err);
        res.status(500).json({ error: "Error interno al obtener pipes" });
    }
});

router.post("/get-backgrounds", async (req, res) => {
    const { userId } = req.body;

    try {
        const result = await client.query(
            "SELECT * FROM backgrounds NATURAL JOIN backgrounds_user WHERE user_id = $1",
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error al obtener backgrounds:", err);
        res.status(500).json({ error: "Error interno al obtener backgrounds" });
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



router.post('/comprar-pipe', async (req, res) => {
    const { pipeId, userId } = req.body;

    try {
        const { rows: pipeYaLaTiene } = await client.query(
            'SELECT * FROM pipes_user WHERE user_id = $1 AND pipe_id = $2',
            [userId, pipeId]
        );

        if (pipeYaLaTiene.length > 0) {
            return res.json({ success: false, message: 'Ya tienes este pipe' });
        }

        const { rows: userCoins } = await client.query(
            'SELECT coins FROM users WHERE id = $1',
            [userId]
        );

        const { rows: pipe } = await client.query(
            'SELECT price FROM pipes WHERE pipe_id = $1',
            [pipeId]
        );

        if (userCoins[0].coins < pipe[0].price) {
            return res.json({ success: false, message: 'No tienes suficientes monedas' });
        }

        await client.query('BEGIN');

        await client.query(
            'UPDATE users SET coins = coins - $1 WHERE id = $2',
            [pipe[0].price, userId]
        );

        await client.query(
            'INSERT INTO pipes_user (user_id, pipe_id) VALUES ($1, $2)',
            [userId, pipeId]
        );

        await client.query('COMMIT');
        res.json({ success: true, message: 'Pipe comprada con éxito' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.json({ success: false, message: 'Error en la compra' });
    }
});

router.post('/comprar-background', async (req, res) => {
    const { backgroundId, userId } = req.body;

    try {
        const { rows: backgroundYaLaTiene } = await client.query(
            'SELECT * FROM backgrounds_user WHERE user_id = $1 AND background_id = $2',
            [userId, backgroundId]
        );

        if (backgroundYaLaTiene.length > 0) {
            return res.json({ success: false, message: 'Ya tienes este background' });
        }

        const { rows: userCoins } = await client.query(
            'SELECT coins FROM users WHERE id = $1',
            [userId]
        );

        const { rows: background } = await client.query(
            'SELECT price FROM backgrounds WHERE background_id = $1',
            [backgroundId]
        );

        if (userCoins[0].coins < background[0].price) {
            return res.json({ success: false, message: 'No tienes suficientes monedas' });
        }

        await client.query('BEGIN');

        await client.query(
            'UPDATE users SET coins = coins - $1 WHERE id = $2',
            [background[0].price, userId]
        );

        await client.query(
            'INSERT INTO backgrounds_user (user_id, background_id) VALUES ($1, $2)',
            [userId, backgroundId]
        );

        await client.query('COMMIT');
        res.json({ success: true, message: 'background comprada con éxito' });
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

router.post("/get-all-pipes", async (req, res) => {
    try {
        const result = await client.query("SELECT * FROM pipes");
        res.json(result.rows);
    } catch (err) {
        console.error("Error al obtener todas las pipes:", err);
        res.status(500).json({ error: "Error interno al obtener pipes" });
    }
});

router.post("/get-all-backgrounds", async (req, res) => {
    try {
        const result = await client.query("SELECT * FROM backgrounds");
        res.json(result.rows);
    } catch (err) {
        console.error("Error al obtener todas las backgrounds:", err);
        res.status(500).json({ error: "Error interno al obtener backgrounds" });
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

router.post("/select-pipe", async (req, res) => {
    const { userId, pipeId } = req.body;
    try {
        await client.query('UPDATE pipes_user SET equiped=FALSE WHERE user_id= $1 and equiped=TRUE', [userId]);
        await client.query('UPDATE pipes_user SET equiped=TRUE WHERE user_id= $1 and pipe_id=$2', [userId,pipeId]);

        res.json({ message: "Current pipe actualizada con éxito" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al actualizar pipe equipada" });
    }
});

router.post("/select-background", async (req, res) => {
    const { userId, backgroundId } = req.body;
    try {
        await client.query('UPDATE backgrounds_user SET equiped=FALSE WHERE user_id= $1 and equiped=TRUE', [userId]);
        await client.query('UPDATE backgrounds_user SET equiped=TRUE WHERE user_id= $1 and background_id=$2', [userId,backgroundId]);

        res.json({ message: "Current background actualizada con éxito" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al actualizar background equipada" });
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


router.post("/get-current-pipe-image", async (req, res) => {
    const { userId } = req.body;
    try {
        const result = await client.query(
            'SELECT image_url FROM pipes_user JOIN pipes on pipes.pipe_id = pipes_user.pipe_id WHERE user_id = $1 AND equiped = TRUE',
            [userId]
        );

        const imageUrl = result.rows[0]?.image_url;
        if (!imageUrl) {
            return res.status(404).json({ error: "No pipe equipada encontrada" });
        }

        res.json({ image_url: imageUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener la pipe" });
    }
});



router.post("/get-current-background-image", async (req, res) => {
    const { userId } = req.body;
    try {
        const result = await client.query(
            'SELECT image_url FROM backgrounds_user JOIN backgrounds on backgrounds.background_id = backgrounds_user.background_id WHERE user_id = $1 AND equiped = TRUE',
            [userId]
        );

        const imageUrl = result.rows[0]?.image_url;
        if (!imageUrl) {
            return res.status(404).json({ error: "No pipe equipada encontrada" });
        }

        res.json({ image_url: imageUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener la background" });
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

router.post("/get-current-pipe-id", async (req, res) => {
    const { userId } = req.body;
    try {
        const result = await client.query(
            'SELECT pipe_id FROM pipes_user WHERE user_id = $1 AND equiped = TRUE',
            [userId]
        );
        const pipeId = result.rows[0]?.pipe_id;
        if (!pipeId) {
            return res.json({ pipeId: "" });
        }

        res.json({ pipeId: pipeId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener la pipe" });
    }
});

router.post("/get-current-background-id", async (req, res) => {
    const { userId } = req.body;
    try {
        const result = await client.query(
            'SELECT background_id FROM backgrounds_user WHERE user_id = $1 AND equiped = TRUE',
            [userId]
        );
        const backgroundId = result.rows[0]?.background_id;
        if (!backgroundId) {
            return res.json({ backgroundId: "" });
        }

        res.json({ backgroundId: backgroundId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener la background" });
    }
});


module.exports = router;