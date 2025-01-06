const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  uploadVote,
  userVote,
  getImage,
  updateVote,
} = require('../../controllers/user/voteController');

const router = express.Router();

// 이미지 업로드 설정
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({ storage });

// 투표 라우트
router.post('/upload', upload.single('image'), uploadVote);
router.get('/votes', userVote);
router.get('/images/:filename', getImage); // FTP 사진 제공
router.put('/updatevote', updateVote);

module.exports = router;
