// models/seed.js
const client = require('../config/db');

// Función para insertar una skin si no existe
const insertSkin = async (name, imageUrl, price, rarity) => {
    try {
        // Primero buscamos si ya existe una skin con ese nombre
        const existing = await client.query('SELECT * FROM skins WHERE name = $1', [name]);

        if (existing.rows.length > 0) {
            console.log(`❌ La skin "${name}" ya existe.`);
            return;
        }

        // Si no existe, la insertamos
        const res = await client.query(
            'INSERT INTO skins (name, image_url, price, rarity) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, imageUrl, price, rarity]
        );

        console.log('✅ Skin insertada:', res.rows[0]);
    } catch (err) {
        console.error('⚠️ Error al insertar skin:', err);
    }
};

// Función para sembrar datos iniciales
const seedData = async () => {
    try {
        // Insertar skins iniciales
        await insertSkin("normal", "./assets/flappybird.png", 0, "común");
        await insertSkin("Arturo", "./assets/arturo.png", 0, "épico");
        await insertSkin("Jtorres", "./assets/jtorres.png", 100, "legendario");

        console.log('✅ Datos iniciales insertados correctamente');
    } catch (error) {
        console.error('❌ Error al insertar datos iniciales:', error);
    }
};

module.exports = { seedData };