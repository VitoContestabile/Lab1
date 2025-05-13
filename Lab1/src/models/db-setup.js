// models/db-setup.js
const client = require('../config/db');

// Función para inicializar todas las tablas de la base de datos
const setupDatabase = async () => {
    try {
        // Crear la tabla de usuarios
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        coins INT DEFAULT 0,
        score INT DEFAULT 0,
        is_admin BOOLEAN DEFAULT FALSE,
        games_played INT DEFAULT 0,
        is_freezed BOOLEAN DEFAULT FALSE
      )
    `);
        console.log('✅ Tabla de usuarios creada o ya existe');

        // Crear la tabla de skins
        await client.query(`
      CREATE TABLE IF NOT EXISTS skins (
        skin_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        image_url TEXT NOT NULL,
        price INT NOT NULL,
        rarity VARCHAR(50) CHECK (rarity IN ('común', 'raro', 'épico', 'legendario'))
      )
    `);
        console.log('✅ Tabla de skins creada o ya existe');

        // Crear la tabla de skins del usuario
        await client.query(`
      CREATE TABLE IF NOT EXISTS skins_user (
        skin_id INTEGER,
        user_id INTEGER,
        equiped BOOLEAN DEFAULT FALSE,
        PRIMARY KEY (skin_id, user_id),
        FOREIGN KEY (skin_id) REFERENCES skins(skin_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
        console.log('✅ Tabla skins_user creada o ya existe');

        // Crear la tabla de amigos
        await client.query(`
      CREATE TABLE IF NOT EXISTS friends (
        user1_id INT REFERENCES users(id) ON DELETE CASCADE,
        user2_id INT REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (user1_id, user2_id),
        CHECK (user1_id < user2_id)
      )
    `);
        console.log('✅ Tabla de amigos creada o ya existe');

        // Crear la tabla de solicitudes de amistad
        await client.query(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        sender_id INT REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (sender_id, receiver_id),
        CONSTRAINT no_self_request CHECK (sender_id != receiver_id)
      )
    `);
        console.log('✅ Tabla de solicitudes de amistad creada o ya existe');

        // Crear la tabla de lobby
        await client.query(`
      CREATE TABLE IF NOT EXISTS lobby (
        id SERIAL PRIMARY KEY,
        host_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        guest_id INT REFERENCES users(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'waiting',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Tabla de lobby creada o ya existe');

        console.log('✅ Base de datos configurada correctamente');
    } catch (error) {
        console.error('❌ Error al configurar la base de datos:', error);
    }
};

module.exports = { setupDatabase };