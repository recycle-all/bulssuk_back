const express = require('express');
const router = express.Router();
const { getUsers, getUser, getPoint } = require('../../controllers/admin/userController');

// 고객정보 조회
router.get('/users', getUsers);
router.get('/user/:user_no', getUser);
// 포인트 조회
router.get('/point', getPoint)

module.exports = router;