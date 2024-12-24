const database = require('../../database/database');
const nodemailer = require('nodemailer'); // nodemailer
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
dotenv.config();

const idCheck = async (req, res) => {
  const id = req.body.id;
  // 아이디 중복 검사
  const idCheck = await database.query(
    `SELECT * FROM users WHERE user_id = $1`,
    [id]
  );
  if (idCheck.rows.length > 0) {
    return res.status(400).json({ message: '이미 사용 중인 아이디입니다.' });
  } else {
    return res.status(200).json({ message: '사용 가능한 아이디 입니다.' });
  }
};

const signUp = async (req, res) => {
  try {
    const {
      user_id,
      password,
      email,
      name,
      birth_date, // 생년월일 (연도)
    } = req.body;

    // 비밀번호 해싱
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // 사용자 정보 삽입 및 user_no 반환
    const userResult = await database.query(
      `INSERT INTO users 
      (user_id, user_pw, user_email, user_name, user_birth) 
      VALUES ($1, $2, $3, $4, $5) RETURNING user_no`,
      [
        user_id,
        hash,
        email,
        name,
        birth_date, // 연도만 저장
      ]
    );

    const user_no = userResult.rows[0].user_no;

    res.status(201).json({
      message: '회원 가입을 완료하였습니다.',
      user_no,
    });
  } catch (error) {
    console.error('Error inserting data:', error.message); // 오류 로그 추가
    res.status(500).json({ error: error.message });
  }
};

// 이메일 인증 구현
const smtpTransporter = nodemailer.createTransport({
  host: 'smtp.naver.com', // naver smtp 사용
  port: 587, // 포트 587
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER, // 사용자 이메일
    pass: process.env.EMAIL_PASS, // 사용자 이메일 비밀번호
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const authNumbers = {}; // 인증번호 보관

const emailAuth = async (req, res) => {
  const email = req.body.email;
  console.log(email);
  // 6자리 랜덤 인증번호 생성
  const emailRandomNumber = Math.floor(Math.random() * 899999) + 100000;
  console.log('생성된 인증번호:', emailRandomNumber);

  const mailOption = {
    from: process.env.EMAIL_USER, // 발신자 이메일
    to: email, // 수신자 이메일
    subject: '불쑥 이메일 인증',
    html: `<h1>인증번호를 입력하세요:</h1> <p>${emailRandomNumber}</p>`,
  };

  smtpTransporter.sendMail(mailOption, (error, info) => {
    if (error) {
      console.log('이메일 전송 오류:', error);
      // res.status(500).json('메일 전송 실패');
      return res
        .status(500)
        .json({ success: false, message: '메일 전송 실패' });
    } else {
      console.log('메일 전송 성공:', info.response);
      // res.status(200).json('메일 전송 성공');
      authNumbers[email] = {
        code: emailRandomNumber,
        expires: Date.now() + 5 * 60000,
      }; // 인증번호 5분 유지
      return res.status(200).json({ success: true, message: '메일 전송 성공' });
    }
  });
};

const verifyNumber = (req, res) => {
  const { email, code } = req.body; // code가 요청에서 제대로 전달되었는지 확인
  console.log(code);
  if (!authNumbers[email]) {
    return res.status(400).json('인증번호가 존재하지 않거나 만료되었습니다.');
  }

  // 인증번호 만료 확인
  if (Date.now() > authNumbers[email].expires) {
    delete authNumbers[email];
    return res.status(400).json('인증번호가 만료되었습니다.');
  }

  // 인증번호 일치 여부 확인
  if (String(authNumbers[email].code) === String(code)) {
    delete authNumbers[email];
    return res.status(200).json('인증 성공');
  } else {
    return res.status(400).json('인증번호가 일치하지 않습니다.');
  }
};

const userLogin = async (req, res) => {
  try {
    // 요청에서 사용자 입력값 가져오기
    const { user_id, user_pw } = req.body;

    // 데이터베이스에서 사용자 정보 가져오기
    const result = await database.query(
      `SELECT * FROM users WHERE user_id = $1`,
      [user_id]
    );

    const user = result.rows[0];

    // 사용자 존재 여부 확인
    if (!user) {
      return res.status(401).json({ message: '아이디가 존재하지 않습니다.' });
    }

    // 비밀번호 확인
    const isPasswordMatch = await bcrypt.compare(user_pw, user.user_pw);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: '비밀번호가 맞지 않습니다.' });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { userId: user.user_id, userType: 'user' },
      process.env.SECRET_KEY,
      { expiresIn: '1d' }
    );

    // 로그인 성공 응답
    return res.json({
      message: '사용자님 로그인 하였습니다.',
      token,
      userId: user.user_id,
      userType: 'user',
    });
  } catch (error) {
    // 서버 오류 처리
    console.error('서버 오류:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

// 아이디 찾기
const findId = async (req, res) => {
  try {
    const { name, email } = req.body;

    // 입력값 검증
    if (!name || !email) {
      return res.status(400).json({ message: '이름과 이메일을 입력해주세요.' });
    }

    // 데이터베이스에서 사용자 검색
    const result = await database.query(
      `SELECT user_id FROM users WHERE user_name = $1 AND user_email = $2`,
      [name, email]
    );

    // 사용자 정보가 없는 경우
    if (result.rows.length === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 성공적으로 아이디 반환
    const userId = result.rows[0].user_id;
    return res.status(200).json({ message: '아이디 찾기 성공', userId });
  } catch (error) {
    console.error('Error finding user ID:', error.message);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

module.exports = {
  emailAuth,
  verifyNumber,
  signUp,
  idCheck,
  userLogin,
  findId,
};
