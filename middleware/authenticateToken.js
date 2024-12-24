const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401); // 토큰이 없으면 401 Unauthorized

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403); // 유효하지 않은 토큰은 403 Forbidden
    req.user = user; // 검증된 사용자 정보를 요청에 추가
    next(); // 다음 미들웨어 또는 컨트롤러로 이동
  });
};

module.exports = authenticateToken;
