// routes/admin.js
const express = require('express');
const router = express.Router();
const { client } = require('../config/db.js');


router.post("/get-coins", async (req, res) => {
    const { id } = req.body;

    try {
        const result = await client.query('SELECT coins FROM users WHERE id = $1', [id]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error al consultar la base de datos:", err);
        res.status(500).json({ error: "Error al obtener datos del usuario" });
    }
});
router.put("/update-score-coins", async (req, res) => {
    const { id, coins, score } = req.body;
    try {
        await client.query('UPDATE users SET coins = $1, score = $2  WHERE id = $3', [coins, score, id]);
        res.json({ message: "Score y monedas actualizados correctamente" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al actualizar score y monedas" });
    }
});
router.put("/update-games", async (req, res) => {
    const { id } = req.body;

    try {
        await client.query(
            'UPDATE users SET games_played = games_played + 1 WHERE id = $1', [id]
        );
        res.json({ message: "Juegos jugados actualizados correctamente" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al actualizar juegos jugados" });
    }
});
module.exports = router;