const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/users/ (solo admins)
router.get('/', userController.getAllUsers);

// POST /api/users/create (solo admins)
router.post('/create', userController.createUser);

// POST /api/users/freeze (solo admins)
router.post('/freeze', userController.toggleFreezeUser);

module.exports = router;
