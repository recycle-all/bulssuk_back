require('dotenv').config(); // .env 파일에서 환경 변수 불러오기
const express = require('express');
const pool = require('./database/database'); // database.js에서 pool 불러오기
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // cookie-parser 추가
const authenticateToken = require('./middleware/authenticateToken'); // 인증 미들웨어 불러오기
const authenticateTokens = require('./middleware/middleware');
require('./scheduler'); // 스케쥴러 실행

const app = express();
const port = 8001;

app.use(express.json()); // JSON 요청 파싱
app.use(express.urlencoded({ extended: true })); // URL-encoded 요청 처리
app.use(cookieParser()); // cookie-parser 미들웨어 추가

app.use(
  cors({
    // orgin: 'http://localhost:3001',
    // origin: 'http://222.112.27.120:3001',
    credentials: true,
  })
);

// 인증 미들웨어 추가 (토큰을 쿠키에서 가져오기)
app.use('/middleware-token', authenticateToken, (req, res) => {
  res.send('미들웨어 토큰 연결');
});

// 관리자 인증 미들웨어
// 인증 미들웨어 추가 (토큰을 쿠키에서 가져오기)
app.use('/middleware-tokens', authenticateTokens, (req, res) => {
  res.send('미들웨어 토큰 연결');
});

app.get('/', (req, res) => {
  res.send('Hello World');
});

// app.use(require('./routes/admin/adminRoutes'));
app.use(require('./routes/user/userRoutes'));
app.use(require('./routes/user/reupRoute'));
app.use(require('./routes/user/guideRoute'));
app.use(require('./routes/user/calendarRoute'));

// 관리자 routes
app.use(require('./routes/admin/adminRoute'));
app.use(require('./routes/admin/calendarRoute'));
app.use(require('./routes/admin/companyRoute'));
app.use(require('./routes/admin/dashboardRoute'));
app.use(require('./routes/admin/faqRoute'));
app.use(require('./routes/admin/productRoute'));
app.use(require('./routes/admin/recycleRoute'));
app.use(require('./routes/admin/userRoute'));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
