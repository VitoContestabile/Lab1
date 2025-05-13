const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const gameRoutes = require('./game');
const friendsRoutes=require('./friends');
const lobbyRoutes= require('./lobby');
const userRoutes= require('./user');
const shopRoutes=require('./shop');

router.use('/auth', authRoutes);     // todas las rutas que empiezan con /auth
router.use('/admin',adminRoutes);  // todas las que empiezan con /scores
router.use('/game', gameRoutes);     // todas las que empiezan con /game
router.use('/friends', friendsRoutes);
router.use('/lobby', lobbyRoutes);
router.use('/user', userRoutes);
router.use('/shop', shopRoutes);

module.exports = router;
