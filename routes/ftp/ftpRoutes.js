const express = require('express');
const router = express.Router();
const ftpController = require('../../controllers/ftp/ftpController');

// FTP 이미지 요청 라우트
router.get('/images/:filename', ftpController.getImage);

module.exports = router;
