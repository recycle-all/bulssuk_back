const express = require('express');
const router = express.Router();
const { allLogin, allLogout, signUp } = require('../../controllers/admin/adminController');

// 관리자 회원가입, 로그인
router.post('/admin_sign_up', signUp)
router.post('/admin_login', allLogin);
router.post('/admin_logout', allLogout);

module.exports = router;