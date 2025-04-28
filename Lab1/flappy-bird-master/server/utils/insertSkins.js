const client = require('../config/db');

async function insertSkin(name, imageUrl, price, rarity) {
    try {
        const existing = await client.query('SELECT * FROM skins WHERE name = $1', [name]);
        if (existing.rows.length > 0) return;

        await client.query(
            'INSERT INTO skins (name, image_url, price, rarity) VALUES ($1, $2, $3, $4)',
            [name, imageUrl, price, rarity]
        );
    } catch (err) {
        console.error('⚠️ Error al insertar skin:', err);
    }
}

async function insertDefaultSkins() {
    await insertSkin("normal", "./flappybird.png", 0, "común");
    await insertSkin("Arturo", "./arturo.png", 0, "raro");
    await insertSkin("Jtorres", "./jtorres.png", 0, "raro");
}

module.exports = { insertDefaultSkins };
