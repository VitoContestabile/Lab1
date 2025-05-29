// models/db-setup.js
const { client } = require('../config/db');

// Consultas SQL constantes
const CREATE_USERS_TABLE = `
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
`;

const CREATE_SKINS_TABLE = `
    CREATE TABLE IF NOT EXISTS skins (
                                         skin_id SERIAL PRIMARY KEY,
                                         name VARCHAR(100) NOT NULL,
        image_url TEXT NOT NULL,
        price INT NOT NULL,
        rarity VARCHAR(50) CHECK (rarity IN ('común', 'raro', 'épico', 'legendario'))
        )
`;

const CREATE_SKINS_USER_TABLE = `
    CREATE TABLE IF NOT EXISTS skins_user (
                                              skin_id INTEGER,
                                              user_id INTEGER,
                                              equiped BOOLEAN DEFAULT FALSE,
                                              PRIMARY KEY (skin_id, user_id),
        FOREIGN KEY (skin_id) REFERENCES skins(skin_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
        )
`;

const CREATE_FRIENDS_TABLE = `
    CREATE TABLE IF NOT EXISTS friends (
                                           user1_id INT REFERENCES users(id) ON DELETE CASCADE,
        user2_id INT REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (user1_id, user2_id),
        CHECK (user1_id < user2_id)
        )
`;

const CREATE_FRIEND_REQUESTS_TABLE = `
    CREATE TABLE IF NOT EXISTS friend_requests (
                                                   sender_id INT REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (sender_id, receiver_id),
        CONSTRAINT no_self_request CHECK (sender_id != receiver_id)
        )
`;

const CREATE_LOBBY_TABLE = `
    CREATE TABLE IF NOT EXISTS lobby (
                                         id SERIAL PRIMARY KEY,
                                         host_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        guest_id INT REFERENCES users(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'waiting',
        winner_id INT REFERENCES users(id) ON DELETE SET NULL,
        host_score INT DEFAULT 0,
        guest_score INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP
        )
`;

// Consulta para agregar columnas si no existen (para migración)
const ADD_LOBBY_COLUMNS = `
  DO $$
  BEGIN
    -- Agregar winner_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lobby' AND column_name='winner_id') THEN
      ALTER TABLE lobby ADD COLUMN winner_id INT REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    -- Agregar host_score si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lobby' AND column_name='host_score') THEN
      ALTER TABLE lobby ADD COLUMN host_score INT DEFAULT 0;
    END IF;
    
    -- Agregar guest_score si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lobby' AND column_name='guest_score') THEN
      ALTER TABLE lobby ADD COLUMN guest_score INT DEFAULT 0;
    END IF;
    
    -- Agregar finished_at si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lobby' AND column_name='finished_at') THEN
      ALTER TABLE lobby ADD COLUMN finished_at TIMESTAMP;
    END IF;
  END
  $$;
`;

// Función genérica para crear tablas
const createTable = async (query, tableName) => {
    try {
        await client.query(query);
        console.log(`✅ Tabla "${tableName}" creada o ya existe`);
    } catch (error) {
        console.error(`❌ Error al crear la tabla "${tableName}":`, error);
        throw error;
    }
};

// Función para ejecutar migraciones
const runMigrations = async () => {
    try {
        await client.query(ADD_LOBBY_COLUMNS);
        console.log('✅ Migraciones de lobby ejecutadas correctamente');
    } catch (error) {
        console.error('❌ Error al ejecutar migraciones:', error);
        throw error;
    }
};

// Configuración de las tablas de la base de datos
const setupDatabase = async () => {
    try {
        await createTable(CREATE_USERS_TABLE, 'users');
        await createTable(CREATE_SKINS_TABLE, 'skins');
        await createTable(CREATE_SKINS_USER_TABLE, 'skins_user');
        await createTable(CREATE_FRIENDS_TABLE, 'friends');
        await createTable(CREATE_FRIEND_REQUESTS_TABLE, 'friend_requests');
        await createTable(CREATE_LOBBY_TABLE, 'lobby');
        // Crear la tabla de mensajes
        await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_opened BOOLEAN DEFAULT FALSE
      )
    `);
        // Ejecutar migraciones para agregar columnas faltantes
        await runMigrations();

        console.log('✅ Base de datos configurada correctamente');
    } catch (error) {
        console.error('❌ Error general al configurar la base de datos:', error);
    }
};

module.exports = { setupDatabase };