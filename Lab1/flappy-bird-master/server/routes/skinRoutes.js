const express = require('express');
const router = express.Router();
const skinController = require('../controllers/skinController');

// POST /api/skins/get
router.post('/get', skinController.getSkins);

// POST /api/skins/buy
router.post('/buy', skinController.buySkin);

module.exports = router;
