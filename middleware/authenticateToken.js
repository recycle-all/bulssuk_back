const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET_KEY = process.env.SECRET_KEY || 'default-secret-key';

// SECRET_KEY 값 출력 (디버깅 용도)
// console.log('Loaded SECRET_KEY:', SECRET_KEY);

const authenticateTokens = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: '토큰이 없습니다. 인증이 필요합니다.' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      console.error('JWT Verification Error:', err.message);
      return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    }

    // console.log('JWT 디코딩 결과:', user);
    req.user = user; // 검증된 사용자 정보를 요청에 추가
    next(); // 다음 미들웨어 또는 컨트롤러로 이동
  });
};

module.exports = authenticateTokens;
