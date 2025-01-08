const express = require('express');
const { getAllvotes } = require('../../controllers/admin/voteController');
const router = express.Router();

router.get('/all_votes',getAllvotes)

module.exports = router;
