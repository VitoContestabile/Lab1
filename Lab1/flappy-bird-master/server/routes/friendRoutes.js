const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');

// POST /api/friends/list
router.post('/list', friendController.getFriends);

// POST /api/friends/send-request
router.post('/send-request', friendController.sendFriendRequest);

// POST /api/friends/requests
router.post('/requests', friendController.getFriendRequests);

// POST /api/friends/accept
router.post('/accept', friendController.acceptFriendRequest);

// POST /api/friends/reject
router.post('/reject', friendController.rejectFriendRequest);

module.exports = router;
