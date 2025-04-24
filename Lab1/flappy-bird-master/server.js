const express = require('express');
const jwt = require('jsonwebtoken');
const { Client } = require('pg'); // Usamos el cliente de PostgreSQL
const bodyParser = require('body-parser');
const cors = require('cors');

// Crear la aplicación Express
const app = express();
const SECRET = 'clave';
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Crear una nueva conexión a la base de datos
const client = new Client({
  user: 'postgres',           // Usuario de la base de datos
  host: 'localhost',             // Dirección del servidor PostgreSQL
  database: 'FlappyDB',       // Nombre de la base de datos
  password: 'Vitoman1',     // Contraseña del usuario
  port: 5432,                    // Puerto de PostgreSQL
});

// Conectar a PostgreSQL
client.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos', err);
  } else {
    console.log('Conectado a la base de datos PostgreSQL');
  }
});


// Crear la tabla de usuarios si no existe
client.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    coins INT DEFAULT 0,
    score INT DEFAULT 0,
    is_admin BOOLEAN DEFAULT FALSE-- Agregar el campo score
  )
`, (err, res) => {
  if (err) {
    console.error('Error al crear la tabla de usuarios', err);
  } else {
    console.log('Tabla de usuarios creada o ya existe');
  }
});



//shop------------------------------------------------

client.query(`
  CREATE TABLE IF NOT EXISTS skins (
    skin_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    image_url TEXT NOT NULL,
    price INT NOT NULL,
    rarity VARCHAR(50) CHECK (rarity IN ('común', 'raro', 'épico', 'legendario'))
      );
`, (err, res) => {
  if (err) {
    console.error('Error al crear la tabla de skins', err);
  } else {
    console.log('Tabla de solicitudes de skins o ya existe');
  }
});

//Crear la tabla de las skins q tiene cada user

client.query(`
  CREATE TABLE IF NOT EXISTS skins_user (
    skin_id INTEGER,
    user_id INTEGER,
    PRIMARY KEY (skin_id, user_id),
    FOREIGN KEY (skin_id) REFERENCES skins(skin_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`, (err, res) => {
  if (err) {
    console.error('❌ Error al crear la tabla skins_user:', err);
  } else {
    console.log('✅ Tabla skins_user creada o ya existe');
  }
});
// insertar skins

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

client.query(`
  CREATE TABLE IF NOT EXISTS friends (
    user1_id INT REFERENCES users(id) ON DELETE CASCADE,
    user2_id INT REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (user1_id, user2_id),
    CHECK (user1_id < user2_id)
)
`, (err) => {
  if (err) console.error('Error al crear la tabla amigos', err);
  else console.log('Tabla de amigos creada o ya existe');
});

client.query(`
  CREATE TABLE IF NOT EXISTS friend_requests (
    sender_id INT REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (sender_id, receiver_id),
    CONSTRAINT no_self_request CHECK (sender_id != receiver_id)
)
`, (err) => {
  if (err) console.error('Error al crear la tabla solicitudes', err);
  else console.log('Tabla de solicitudes creada o ya existe');
});

insertSkin("normal", "./flappybird.png", 0, "común")
insertSkin("Arturo", "./arturo.png", 0, "raro")
insertSkin("Jtorres", "./jtorres.png", 0, "raro")

//shop ----------------------------------------------------------------------------

// Ruta para registrar usuarios
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Por favor completa todos los campos.' });
  }

  // Verificar si el usuario ya existe
  client.query('SELECT * FROM users WHERE username = $1', [username], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error al verificar el usuario', error: err });
    }

    if (result.rows.length > 0) {
      return res.status(400).json({ message: 'El usuario ya existe.' });
    }

    // Insertar el nuevo usuario en la base de datos
    client.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id', [username, password], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error al registrar el usuario', error: err });
      }
      res.status(201).json({ message: 'Usuario registrado con éxito.', userId: result.rows[0].id });
    });
  });
});

// Ruta para login
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Por favor ingresa ambos campos.' });
  }

  // Verificar si el usuario existe y si la contraseña es correcta
  client.query('SELECT id FROM users WHERE username = $1 AND password = $2', [username, password], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error al verificar el usuario', error: err });
    }

    if (result.rows.length > 0) {
      const userId = result.rows[0].id;
      const token = jwt.sign({ userId }, SECRET, { expiresIn: '1h' });
      return res.json({ message: 'Login exitoso!', token:token}); // Lo envía en la respuesta
    } else {
      return res.status(400).json({ message: 'Usuario o contraseña incorrectos.' });
    }
  });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});

// tomar skins
app.post("/get-skins", async (req, res) => {
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

app.post('/comprar-skin', async (req, res) => {
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

app.post('/friends', (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'Se requiere el ID de usuario' });
  }

  client.query(`
    SELECT u.username
    FROM users u
           JOIN friends f ON
      (f.user1_id = $1 AND f.user2_id = u.id) OR
      (f.user2_id = $1 AND f.user1_id = u.id)
  `, [userId], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error al obtener los amigos', error: err });

    const friendUsernames = result.rows.map(row => row.username);
    res.status(200).json({ friends: friendUsernames });
  });
});

app.post('/send-friend-request', (req, res) => {
  const { senderId, receiverId } = req.body;

  if (!senderId || !receiverId) {
    return res.status(400).json({ message: 'Se requieren senderId y receiverId' });
  }

  if (senderId === receiverId) {
    return res.status(400).json({ message: 'No podés mandarte solicitud a vos mismo' });
  }

  // 1. Verificamos si ya son amigos
  const [user1, user2] = senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];
  client.query(`
    SELECT * FROM friends WHERE user1_id = $1 AND user2_id = $2
  `, [user1, user2], (err, friendResult) => {
    if (err) return res.status(500).json({ message: 'Error al verificar amistad', error: err });

    if (friendResult.rows.length > 0) {
      return res.status(409).json({ message: 'Ya son amigos' });
    }

    // 2. Verificamos si ya existe una solicitud en ambos sentidos
    client.query(`
      SELECT * FROM friend_requests
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
    `, [senderId, receiverId], (err2, requestResult) => {
      if (err2) return res.status(500).json({ message: 'Error al verificar solicitudes existentes', error: err2 });

      if (requestResult.rows.length > 0) {
        return res.status(409).json({ message: 'Ya hay una solicitud pendiente entre estos usuarios' });
      }

      // 3. Insertamos la solicitud
      client.query(`
        INSERT INTO friend_requests (sender_id, receiver_id)
        VALUES ($1, $2)
      `, [senderId, receiverId], (err3) => {
        if (err3) return res.status(500).json({ message: 'Error al enviar solicitud', error: err3 });

        res.status(200).json({ message: 'Solicitud de amistad enviada exitosamente' });
      });
    });
  });
});
app.post('/get-user-id', (req, res) => {
  const { username } = req.body;

  if (!username) return res.status(400).json({ message: 'Falta el nombre de usuario' });

  client.query('SELECT id FROM users WHERE username = $1', [username], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error al buscar el usuario', error: err });

    if (result.rows.length > 0) {
      res.status(200).json({ userId: result.rows[0].id });
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' });
    }
  });
});

app.post('/friend-requests', (req, res) => {
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
app.post('/accept-friend-request', (req, res) => {
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
app.post('/reject-friend-request', (req, res) => {
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

app.post('/get-user-data', async (req, res) => {
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ message: `Falta el userId ${userId}` });

  client.query('SELECT * FROM users WHERE id = $1', [userId], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error al buscar el usuario', error: err });

    if (result.rows.length > 0) {
      res.status(200).json({ userId: result.rows[0].id, username: result.rows[0].username });
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' });
    }
  });
});

