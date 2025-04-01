const express = require('express');
const { Client } = require('pg'); // Usamos el cliente de PostgreSQL
const bodyParser = require('body-parser');
const cors = require('cors');

// Crear la aplicación Express
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Crear una nueva conexión a la base de datos
const client = new Client({
  user: 'postgres',           // Usuario de la base de datos
  host: 'localhost',             // Dirección del servidor PostgreSQL
  database: 'FlappyDB',       // Nombre de la base de datos
  password: 'Unlion2005',     // Contraseña del usuario
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
    score INT DEFAULT 0  -- Agregar el campo score
  )
`, (err, res) => {
  if (err) {
    console.error('Error al crear la tabla de usuarios', err);
  } else {
    console.log('Tabla de usuarios creada o ya existe');
  }
});

// Crear la tabla de amigos si no existe
client.query(`
  CREATE TABLE IF NOT EXISTS amigos (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,  -- Clave foránea a users
    friend_id INT REFERENCES users(id) ON DELETE CASCADE,  -- Clave foránea a users
    PRIMARY KEY (user_id, friend_id),  -- Relación muchos a muchos
    CONSTRAINT no_self_friend CHECK (user_id != friend_id)  -- No permitir que un usuario sea su propio amigo
  )
`, (err, res) => {
  if (err) {
    console.error('Error al crear la tabla de amigos', err);
  } else {
    console.log('Tabla de amigos creada o ya existe');
  }
});

// Crear la tabla de solicitudes de amistad si no existe
client.query(`
  CREATE TABLE IF NOT EXISTS friend_requests (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    friend_id INT REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, friend_id),
    CONSTRAINT no_self_request CHECK (user_id != friend_id)
  )
`, (err, res) => {
  if (err) {
    console.error('Error al crear la tabla de solicitudes de amistad', err);
  } else {
    console.log('Tabla de solicitudes de amistad creada o ya existe');
  }
});

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
  client.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error al verificar el usuario', error: err });
    }

    if (result.rows.length > 0) {
      return res.json({ message: 'Login exitoso!' });  // Respuesta de login exitoso
    } else {
      return res.status(400).json({ message: 'Usuario o contraseña incorrectos.' });
    }
  });
});

// Ruta para agregar un amigo
app.post('/add-friend', (req, res) => {
  const { userId, friendId } = req.body;

  if (!userId || !friendId) {
    return res.status(400).json({ message: 'Por favor ingresa ambos IDs.' });
  }

  // Verificar si ambos usuarios existen
  client.query('SELECT * FROM users WHERE id = $1 OR id = $2', [userId, friendId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error al verificar los usuarios', error: err });
    }

    if (result.rows.length < 2) {
      return res.status(400).json({ message: 'Uno de los usuarios no existe.' });
    }

    // Verificar si ya son amigos
    client.query('SELECT * FROM amigos WHERE user_id = $1 AND friend_id = $2', [userId, friendId], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error al verificar la amistad', error: err });
      }

      if (result.rows.length > 0) {
        return res.status(400).json({ message: 'Ya eres amigo de este usuario.' });
      }

      // Agregar la relación de amistad
      client.query('INSERT INTO amigos (user_id, friend_id) VALUES ($1, $2), ($2, $1)', [userId, friendId], (err, result) => {
        if (err) {
          return res.status(500).json({ message: 'Error al agregar amigo', error: err });
        }
        res.status(200).json({ message: 'Amigo agregado con éxito.' });
      });
    });
  });
});

// Ruta para obtener los amigos de un usuario
app.get('/friends', (req, res) => {
  const userId = 1;  // Ejemplo de ID de usuario (esto debería ser dinámico, por ejemplo, desde una sesión)
  client.query('SELECT u.id, u.username FROM users u JOIN amigos a ON u.id = a.friend_id WHERE a.user_id = $1', [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error al obtener los amigos', error: err });
    }
    res.json(result.rows);  // Enviar lista de amigos
  });
});

// Ruta para eliminar un amigo
app.delete('/delete-friend/:friendId', (req, res) => {
  const userId = 1;  // Ejemplo de ID de usuario (esto debería ser dinámico, por ejemplo, desde una sesión)
  const { friendId } = req.params;

  // Eliminar la relación de amistad
  client.query('DELETE FROM amigos WHERE user_id = $1 AND friend_id = $2', [userId, friendId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error al eliminar amigo', error: err });
    }
    res.status(200).json({ message: 'Amigo eliminado con éxito.' });
  });
});

// Ruta para enviar una solicitud de amistad
// Ruta para enviar una solicitud de amistad
app.post('/send-friend-request', (req, res) => {
  const { userId, friendId } = req.body;

  // Primero, verificar si el usuario de destino existe
  client.query('SELECT * FROM users WHERE id = $1', [friendId], (err, userResult) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al verificar el usuario', error: err });
    }

    // Si el usuario no existe
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'El usuario no existe.' });
    }

    // Verificar si ya son amigos
    client.query('SELECT * FROM amigos WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)', [userId, friendId], (err, friendResult) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al verificar la amistad', error: err });
      }

      if (friendResult.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Ya eres amigo de este usuario.' });
      }

      // Verificar si ya existe una solicitud pendiente
      client.query('SELECT * FROM friend_requests WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)', [userId, friendId], (err, requestResult) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Error al verificar solicitudes previas', error: err });
        }

        if (requestResult.rows.length > 0) {
          // Si ya existe una solicitud pendiente, responder con un mensaje adecuado
          return res.status(400).json({ success: false, message: 'Ya has enviado una solicitud de amistad a este usuario o viceversa.' });
        }

        // Si no existe una solicitud previa, insertar la nueva solicitud
        client.query('INSERT INTO friend_requests (user_id, friend_id) VALUES ($1, $2)', [userId, friendId], (err, result) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Error al enviar la solicitud.' });
          }
          return res.status(200).json({ success: true, message: 'Solicitud enviada con éxito.' });
        });
      });
    });
  });
});

// Ruta para obtener las solicitudes de amistad pendientes
app.get('/get-friend-requests', (req, res) => {
   // Este ID debería venir de la sesión/autenticación del usuario

  client.query(`
    SELECT u.id, u.username 
    FROM users u
    JOIN friend_requests fr ON u.id = fr.user_id
    WHERE fr.friend_id = $1
  `, [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error al obtener las solicitudes', error: err });
    }

    // Asegurar que result y result.rows existan antes de enviarlos
    res.json(result?.rows ?? []);
  });
});


// Ruta para enviar una solicitud de amistad
app.post('/send-friend-request', (req, res) => {
  const { userId, friendId } = req.body;

  // Primero, verificar si el usuario de destino existe
  client.query('SELECT * FROM users WHERE id = $1', [friendId], (err, userResult) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al verificar el usuario', error: err });
    }

    // Si el usuario no existe
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'El usuario no existe.' });
    }

    // Verificar si ya son amigos
    client.query('SELECT * FROM amigos WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)', [userId, friendId], (err, friendResult) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al verificar la amistad', error: err });
      }

      if (friendResult.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Ya eres amigo de este usuario.' });
      }

      // Verificar si ya existe una solicitud pendiente en cualquier dirección
      client.query(`
        SELECT * FROM friend_requests 
        WHERE (user_id = $1 AND friend_id = $2) OR 
              (user_id = $2 AND friend_id = $1)
      `, [userId, friendId], (err, requestResult) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Error al verificar solicitudes previas', error: err });
        }

        if (requestResult.rows.length > 0) {
          // Si ya existe una solicitud pendiente, responder con un mensaje específico
          return res.status(400).json({
            success: false,
            message: requestResult.rows[0].user_id === userId
              ? 'Ya has enviado una solicitud de amistad a este usuario.'
              : 'Este usuario ya te ha enviado una solicitud de amistad.'
          });
        }

        // Si no existe una solicitud previa, insertar la nueva solicitud
        client.query('INSERT INTO friend_requests (user_id, friend_id) VALUES ($1, $2)', [userId, friendId], (err, result) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Error al enviar la solicitud.' });
          }
          return res.status(200).json({ success: true, message: 'Solicitud enviada con éxito.' });
        });
      });
    });
  });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
