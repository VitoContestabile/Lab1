// routes/user.js
const express = require('express');
const router = express.Router();
const { client } = require('../config/db.js');
const { verifyToken } = require('../middleware/auth');

// Actualizar nombre del usuario
router.post('/update-username', verifyToken, (req, res) => {
    const { username } = req.body;
    const userId = req.userId; // Obtenido del middleware de verificación

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

        // Verificar que el usuario solo pueda modificar su propio perfil
        client.query('SELECT id FROM users WHERE id = $1', [userId], (err, userResult) => {
            if (err) {
                return res.status(500).json({ message: 'Error al verificar usuario', error: err });
            }

            if (userResult.rows.length === 0) {
                return res.status(404).json({ message: 'Usuario no encontrado.' });
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
});

// Obtener datos del usuario por ID
router.post('/get-user', async (req, res) => {
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

// Obtener datos del usuario por nombre de usuario
router.post('/get-user-id', (req, res) => {
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

// Obtener datos básicos del usuario
router.post('/get-user-data', async (req, res) => {
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

// Obtener las monedas del usuario
router.post('/get-coins', async (req, res) => {
    const { id } = req.body;

    try {
        const result = await client.query('SELECT coins FROM users WHERE id = $1', [id]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error al consultar la base de datos:", err);
        res.status(500).json({ error: "Error al obtener datos del usuario" });
    }
});

// Obtener perfil de usuario
router.get('/perfil/:username', async (req, res) => {
    const { username } = req.params;

    try {
        // Consulta a la base de datos para obtener los datos del usuario
        const query = 'SELECT username, score, coins, is_admin, games_played FROM users WHERE username = $1';
        const result = await client.query(query, [username]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const user = result.rows[0];

        // Responde con los datos del usuario
        return res.json({
            username: user.username,
            score: user.score,
            coins: user.coins,
            is_admin: user.is_admin,
            games_played: user.games_played
        });
    } catch (error) {
        console.error('Error al obtener el perfil:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

router.get('/perfil/:username', async (req, res) => {
    const { username } = req.params;

    try {
        // Consulta a la base de datos para obtener los datos del usuario
        const query = 'SELECT username, score, coins, is_admin, games_played FROM users WHERE username = $1';
        const result = await client.query(query, [username]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const user = result.rows[0];

        // Responde con los datos del usuario
        return res.json({
            username: user.username,
            score: user.score,
            coins: user.coins,
            is_admin: user.is_admin,
            games_played: user.games_played
        });
    } catch (error) {
        console.error('Error al obtener el perfil:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});


// Obtener ranking de usuarios
router.get('/ranking', async (req, res) => {
    try {
        const result = await client.query(
            `SELECT username, score 
       FROM users 
       WHERE is_admin=false 
       ORDER BY score DESC, username ASC 
       LIMIT 100`
        );
        res.status(200).json({ ranking: result.rows });
    } catch (err) {
        console.error('Error al obtener el ranking:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener mensajes
router.get('/get-messages', async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ error: 'Falta user_id en la consulta' });
    }

    try {
        const result = await client.query(
            `SELECT message, created_at FROM messages WHERE user_id = $1`,
            [user_id]
        );
        res.status(200).json({ messages: result.rows });
    } catch (err) {
        console.error('Error al obtener los mensajes:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

//Borrar mensajes
router.delete('/delete-message', async (req, res) => {
    const { user_id, text } = req.query;

    console.log('Solicitud de eliminación recibida:');
    console.log('- user_id:', user_id);
    console.log('- text:', text);

    if (!user_id || !text) {
        console.log('Error: Parámetros incompletos');
        return res.status(400).json({ error: 'Falta user_id o text en la consulta' });
    }

    try {
        // Primero, buscar el mensaje para verificar si existe
        const checkQuery = 'SELECT id FROM messages WHERE user_id = $1 AND message = $2';
        const checkResult = await client.query(checkQuery, [user_id, text]);

        console.log(`Mensajes encontrados: ${checkResult.rowCount}`);

        if (checkResult.rowCount === 0) {
            // Si no se encuentra el mensaje exacto, intentar con una búsqueda más flexible
            console.log('No se encontró el mensaje exacto, intentando con búsqueda por ID de usuario');

            // Obtener todos los mensajes del usuario para depuración
            const allMessages = await client.query(
                'SELECT id, message FROM messages WHERE user_id = $1',
                [user_id]
            );

            console.log(`Total de mensajes del usuario: ${allMessages.rowCount}`);
            if (allMessages.rowCount > 0) {
                console.log('Mensajes disponibles:');
                allMessages.rows.forEach((msg, i) => {
                    console.log(`${i+1}. ID: ${msg.id}, Mensaje: "${msg.message}"`);
                });
            }

            return res.status(404).json({
                message: 'No se encontró ningún mensaje para eliminar',
                debug: {
                    userMessages: allMessages.rows.length,
                    requestedText: text
                }
            });
        }

        // Si el mensaje existe, eliminarlo
        const messageId = checkResult.rows[0].id;
        console.log(`Eliminando mensaje con ID: ${messageId}`);

        const deleteResult = await client.query(
            'DELETE FROM messages WHERE id = $1',
            [messageId]
        );

        console.log(`Filas eliminadas: ${deleteResult.rowCount}`);
        res.status(200).json({
            message: 'Mensaje eliminado exitosamente',
            messageId: messageId
        });
    } catch (err) {
        console.error('Error al eliminar el mensaje:', err);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: err.message
        });
    }
});
module.exports = router;