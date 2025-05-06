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
app.use(express.static('public'));

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
    email VARCHAR(255) UNIQUE NOT NULL,
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

client.query(`
  INSERT INTO users (email,username, password, coins, score, is_admin)
  VALUES ('a@gmail.com','vito', '1234', 0, 0, true)
`, (err, res) => {
  if (err) {
    console.error('Error al insertar el usuario', err);
  } else {
    console.log('Usuario insertado correctamente');
  }
});

client.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS is_freezed BOOLEAN DEFAULT FALSE;
`, (err, res) => {
  if (err) {
    console.error('Error al añadir columna coins', err);
  } else {
    console.log('Columna coins añadida o ya existe');
  }
});

// Añade este código después de la creación de la tabla users en server.js
client.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS coins INT DEFAULT 0;
`, (err, res) => {
  if (err) {
    console.error('Error al añadir columna coins', err);
  } else {
    console.log('Columna coins añadida o ya existe');
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
insertSkin("Arturo", "./arturo.png", 0, "épico")
insertSkin("Jtorres", "./jtorres.png", 100, "legendario")

//shop ----------------------------------------------------------------------------

// Ruta para registrar usuarios
app.post('/register', (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ message: 'Por favor completa todos los campos.' });
  }

  // Verificar si el usuario ya existe
  client.query('SELECT * FROM users WHERE username = $1 OR email= $2 ', [username, email], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error al verificar el usuario', error: err });
    }

    if (result.rows.length > 0) {
      return res.status(400).json({ message: 'El usuario ya existe.' });
    }

    // Insertar el nuevo usuario en la base de datos
    client.query('INSERT INTO users (username, password,email) VALUES ($1, $2, $3) RETURNING id', [username, password, email], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error al registrar el usuario', error: err });
      }
      res.status(201).json({ message: 'Usuario registrado con éxito.', userId: result.rows[0].id });
    });
  });
});

//actualizar nombre del usuario

app.post('/update-username', (req, res) => {
  const { userId, username } = req.body;

  if (!userId || !username) {
    return res.status(400).json({ message: 'Faltan campos requeridos.' });
  }

  // Verificar si el nuevo nombre ya existe
  client.query('SELECT * FROM users WHERE username = $1', [username], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error al verificar el nuevo username', error: err });
    }

    if (result.rows.length > 0) {
      return res.status(400).json({ message: 'El nombre de usuario ya está en uso.' });
    }

    // Actualizar el nombre de usuario
    client.query('UPDATE users SET username = $1 WHERE id = $2', [username, userId], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error al actualizar el username', error: err });
      }

      res.status(200).json({ message: 'Nombre de usuario actualizado correctamente.' });
    });
  });
});


// Ruta para login
app.post('/login', (req, res) => {
  const { username, password} = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Por favor ingresa ambos campos.' });
  }

  client.query('SELECT id, username, is_admin FROM users WHERE username = $1 AND password = $2', [username, password], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error al verificar el usuario', error: err });
    }

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Consultar si el usuario está freezeado
      client.query('SELECT is_freezed FROM users WHERE id = $1', [user.id], (err2, freezeResult) => {
        if (err2) return res.status(500).json({ message: 'Error al verificar freeze' });

        const is_freezed = freezeResult.rows[0]?.is_freezed;

        if (is_freezed) {
          return res.status(403).json({ message: 'Usuario freezeado' });
        }

        const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '1h' });
        return res.json({
          message: 'Login exitoso!',
          token: token,
          user: {
            id: user.id,
            username: user.username,
            is_admin: user.is_admin
          }
        });
      });
    }
    else {
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
app.get('/admin/users', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Falta el token' });
  }

  const token = authHeader.split(' ')[1]; // Formato: "Bearer token"

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    const userId = decoded.userId;

    client.query('SELECT is_admin FROM users WHERE id = $1', [userId], (err, result) => {
      if (err) {
        console.error('Error al verificar administrador:', err);
        return res.status(500).json({ message: 'Error interno' });
      }

      if (result.rows.length === 0 || !result.rows[0].is_admin) {
        return res.status(403).json({ message: 'No tienes permisos de administrador' });
      }

      // Si es admin, le damos la lista de usuarios
      client.query('SELECT id, username, coins, score, is_admin, is_freezed FROM users ORDER BY id ASC', (err, usersResult) => {
        if (err) {
          console.error('Error al obtener usuarios:', err);
          return res.status(500).json({ message: 'Error al obtener usuarios' });
        }
        res.json(usersResult.rows);
      });

    });
  });
});
// Añadir este endpoint para crear usuarios (con permisos de admin)
app.post('/admin/create-user', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Falta el token' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    const adminId = decoded.userId;

    // Verificar si quien hace la solicitud es admin
    client.query('SELECT is_admin FROM users WHERE id = $1', [adminId], (err, result) => {
      if (err) {
        console.error('Error al verificar admin:', err);
        return res.status(500).json({ message: 'Error interno del servidor' });
      }

      if (result.rows.length === 0 || !result.rows[0].is_admin) {
        return res.status(403).json({ message: 'No tienes permisos de administrador' });
      }

      // Obtener datos del nuevo usuario
      const { username, password, isAdmin } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Faltan datos para crear el usuario' });
      }

      // Verificar si el usuario ya existe
      client.query('SELECT id FROM users WHERE username = $1', [username], (err, checkResult) => {
        if (err) {
          console.error('Error al verificar usuario existente:', err);
          return res.status(500).json({ message: 'Error al verificar usuario existente' });
        }

        if (checkResult.rows.length > 0) {
          return res.status(409).json({ message: 'El nombre de usuario ya existe' });
        }

        // Crear nuevo usuario
        client.query(
            'INSERT INTO users (username, password, is_admin, coins, score) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [username, password, isAdmin, 0, 0],
            (err, insertResult) => {
              if (err) {
                console.error('Error al crear usuario:', err);
                return res.status(500).json({ message: 'Error al crear el usuario' });
              }

              res.status(201).json({
                message: 'Usuario creado exitosamente',
                userId: insertResult.rows[0].id
              });
            }
        );
      });
    });
  });
});
app.post('/admin/toggle-freeze', (req, res) => {
  const { userId } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader) return res.status(401).json({ message: 'Falta el token' });

  const token = authHeader.split(' ')[1];

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Token inválido' });

    const adminId = decoded.userId;

    client.query('SELECT is_admin FROM users WHERE id = $1', [adminId], (err, result) => {
      if (err || !result.rows[0]?.is_admin) {
        return res.status(403).json({ message: 'No autorizado' });
      }

      // Verificar si el usuario a freezear es admin
      client.query('SELECT is_admin FROM users WHERE id = $1', [userId], (err2, userResult) => {
        if (err2) {
          console.error(err2);
          return res.status(500).json({ message: 'Error interno' });
        }

        if (userResult.rows.length === 0) {
          return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if (userResult.rows[0].is_admin) {
          return res.status(400).json({ message: 'No se puede freezeear un administrador' });
        }

        // Si no es admin, toggleamos freeze
        client.query('UPDATE users SET is_freezed = NOT is_freezed WHERE id = $1 RETURNING is_freezed', [userId], (err3, result3) => {
          if (err3) {
            console.error(err3);
            return res.status(500).json({ message: 'Error interno al freezeear' });
          }
          res.status(200).json({ is_freezed: result3.rows[0].is_freezed });
        });
      });
    });
  });
});

app.post("/get-all-skins", async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM skins");
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener todas las skins:", err);
    res.status(500).json({ error: "Error interno al obtener skins" });
  }
});


// Obtener datos del usuario
app.post("/get-user", async (req, res) => {
  const { id } = req.body;

  try {
    const result = await client.query('SELECT id, coins, score FROM users WHERE id = $1', [id]);
    console.log("Resultado:", result.rows);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al consultar la base de datos:", err);
    res.status(500).json({ error: "Error al obtener datos del usuario" });
  }
});
// Actualizar score y monedas
app.put("/update-score-coins", async (req, res) => {
  const { id, coins, score } = req.body;
  try {
    await client.query('UPDATE users SET coins = $1, score = $2 WHERE id = $3', [coins, score, id]);
    res.json({ message: "Score y monedas actualizados correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar score y monedas" });
  }
});

app.post("/get-coins", async (req, res) => {
  const { id } = req.body;

  try {
    const result = await client.query('SELECT coins FROM users WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al consultar la base de datos:", err);
    res.status(500).json({ error: "Error al obtener datos del usuario" });
  }
});