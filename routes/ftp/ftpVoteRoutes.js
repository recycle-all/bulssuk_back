const express = require('express');
const router = express.Router();
const {
  getImage,
  createVote,
  getVotes,
} = require('../../controllers/ftp/ftpVoteController');

// FTP 이미지 요청 라우트
router.get('/images/:filename', getImage);

// Votes 데이터 삽입 라우트
router.post('/vote_result', createVote);

// Votes 데이터 조회 라우트
router.get('/all_votes', getVotes);

module.exports = router;
