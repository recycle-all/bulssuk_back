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

    // 가입 축하 포인트 지급
    await database.query(
      `INSERT INTO point 
        (user_no, point_status, point_amount, point_total, point_reason) 
        VALUES ($1, $2, $3, $4, $5);`,
      [
        user_no,
        'ADD', // 포인트 추가
        50, // 지급 포인트
        50, // 총 포인트
        '가입 축하 포인트 지급', // 지급 사유
      ]
    );

    res.status(201).json({
      message:
        '회원 가입을 완료하였습니다. 가입 축하 포인트 100p가 지급되었습니다.',
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
    const { user_id, user_pw } = req.body;

    // 사용자 조회
    const query = `
      SELECT user_id, user_pw, user_name, user_email, user_no 
      FROM users 
      WHERE user_id = $1
    `;
    const result = await database.query(query, [user_id]);

    // 아이디 존재 여부 확인
    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
    }

    const user = result.rows[0];

    // 비밀번호 검증
    const isPasswordMatch = await bcrypt.compare(user_pw, user.user_pw);
    if (!isPasswordMatch) {
      return res
        .status(401)
        .json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      {
        userId: user.user_id,
        userNo: user.user_no,
        userType: 'user', // 사용자 타입 (필요시 수정)
      },
      process.env.SECRET_KEY || 'default_secret_key', // 환경 변수에서 키 가져오기
      { expiresIn: '1d' } // 만료 시간: 1일
    );

    // 응답 데이터 반환
    return res.status(200).json({
      message: '로그인 성공!',
      token, // JWT 토큰
      userId: user.user_id,
      userNo: user.user_no,
      userType: 'user',
      name: user.user_name,
      email: user.user_email,
    });
  } catch (error) {
    console.error('서버 오류:', error.message);
    return res
      .status(500)
      .json({ message: '서버 오류가 발생했습니다.', error: error.message });
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

// 비밀번호 찾기 이메일 인증
const passwordEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: '이메일을 제공해야 합니다.' });
  }

  const emailRandomNumber = Math.floor(Math.random() * 899999) + 100000;

  try {
    const mailOption = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '비밀번호 찾기 인증번호',
      html: `<h1>인증번호:</h1> <p>${emailRandomNumber}</p>`,
    };

    await smtpTransporter.sendMail(mailOption);

    authNumbers[email] = {
      code: emailRandomNumber,
      expires: Date.now() + 5 * 60000,
      purpose: 'findPassword',
    };

    res.status(200).json({ message: '인증번호가 이메일로 발송되었습니다.' });
  } catch (error) {
    console.error('이메일 전송 오류:', error);
    res.status(500).json({ message: '이메일 전송에 실패했습니다.' });
  }
};

// 비밀번호 찾기 인증번호
const passwordVerifyNumber = (req, res) => {
  const { email, code } = req.body;

  if (!authNumbers[email]) {
    return res.status(400).json('인증번호가 존재하지 않거나 만료되었습니다.');
  }

  const authInfo = authNumbers[email];

  if (authInfo.purpose !== 'findPassword') {
    return res.status(400).json('요청 목적이 올바르지 않습니다.');
  }

  if (Date.now() > authInfo.expires) {
    delete authNumbers[email];
    return res.status(400).json('인증번호가 만료되었습니다.');
  }

  if (String(authInfo.code) === String(code)) {
    delete authNumbers[email];
    return res.status(200).json('인증 성공');
  } else {
    return res.status(400).json('인증번호가 일치하지 않습니다.');
  }
};

// 비밀번호 재설정
const resetPassword = async (req, res) => {
  try {
    const { user_id, new_password } = req.body;

    if (!user_id || !new_password) {
      return res.status(400).json({ message: '필수 입력값이 누락되었습니다.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    const result = await database.query(
      `UPDATE users SET user_pw = $1 WHERE user_id = $2`,
      [hashedPassword, user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.status(200).json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error) {
    console.error('Error resetting password:', error.message);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 회원정보수정 - 비밀번호 확인
const verifyPassword = async (req, res) => {
  try {
    const { user_id, current_password } = req.body;

    // 사용자 조회
    const result = await database.query(
      `SELECT user_pw FROM users WHERE user_id = $1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const user = result.rows[0];
    const isPasswordMatch = await bcrypt.compare(
      current_password,
      user.user_pw
    );

    if (!isPasswordMatch) {
      return res.status(401).json({ message: '비밀번호가 맞지 않습니다.' });
    }

    return res.status(200).json({ message: '비밀번호 확인 성공' });
  } catch (error) {
    console.error('Error verifying password:', error.message);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { user_id, new_password } = req.body;

    // 새 비밀번호 해싱
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    // 비밀번호 업데이트
    const result = await database.query(
      `UPDATE users SET user_pw = $1 WHERE user_id = $2`,
      [hashedPassword, user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.status(200).json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error) {
    console.error('Error resetting password:', error.message);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 1:1 문의 등록
const createInquiry = async (req, res) => {
  try {
    const { question_title, question_content } = req.body;

    // req.user에서 user_no 가져오기 (토큰 인증으로 설정된 사용자 정보)
    const user_no = req.user?.userNo;

    // 사용자 입력값 검증
    if (!user_no) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    if (!question_title || !question_content) {
      return res
        .status(400)
        .json({ message: '문의 제목과 내용을 모두 입력해주세요.' });
    }

    // 데이터베이스에 문의 등록
    const query = `
      INSERT INTO inquiry (user_no, question_title, question_content) 
      VALUES ($1, $2, $3) 
      RETURNING question_no, created_at
    `;
    const values = [user_no, question_title, question_content];

    const result = await database.query(query, values);

    // 삽입된 문의 데이터 반환
    const inquiry = result.rows[0];

    res.status(201).json({
      message: '문의가 성공적으로 등록되었습니다.',
      question_no: inquiry.question_no,
      created_at: inquiry.created_at,
    });
  } catch (error) {
    console.error('Error creating inquiry:', error.message);

    // 에러 메시지 상세 정보 추가 (디버깅용, 실제로는 최소화)
    res.status(500).json({
      message: '서버 오류가 발생했습니다. 관리자에게 문의하세요.',
      error: error.message,
    });
  }
};

// 문의 내역 조회 API
const getInquiries = async (req, res) => {
  try {
    const userNo = req.user?.userNo; // JWT에서 가져온 사용자 고유 번호

    if (!userNo) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    // 문의 내역과 답변 조회
    const query = `
      SELECT 
        i.question_no,
        i.question_title,
        i.question_content,
        TO_CHAR(i.created_at, 'YY-MM-DD HH24:MI') AS created_at,
        CASE 
          WHEN i.is_answered = '답변 완료' THEN true
          ELSE false
        END AS is_answered, -- 상태를 boolean으로 변환
        a.answer_content,
        TO_CHAR(a.created_at, 'YY-MM-DD HH24:MI') AS answer_created_at
      FROM inquiry i
      LEFT JOIN answer a ON i.question_no = a.question_no
      WHERE i.user_no = $1
      ORDER BY i.created_at DESC
    `;
    const values = [userNo];
    const result = await database.query(query, values);

    // 응답 데이터 반환
    return res.status(200).json({
      message: '문의 내역이 성공적으로 조회되었습니다.',
      inquiries: result.rows,
    });
  } catch (error) {
    console.error('Error fetching inquiries:', error.message);
    return res.status(500).json({
      message: '서버 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// 토탈 포인트
const getTotalPoints = async (req, res) => {
  try {
    // 토큰에서 userNo 가져오기
    const userNo = req.user?.userNo;

    // userNo가 없는 경우 에러 처리
    if (!userNo) {
      return res
        .status(400)
        .json({ message: '유효하지 않은 사용자 요청입니다.' });
    }

    // SQL 쿼리: 특정 유저의 총 포인트 조회
    const query = `
      SELECT point_total 
      FROM point 
      WHERE user_no = $1 
      ORDER BY created_at DESC 
      LIMIT 1;
    `;
    const values = [userNo];
    const result = await database.query(query, values);

    // 데이터 반환
    if (result.rows.length === 0) {
      return res.status(404).json({ message: '포인트 내역이 없습니다.' });
    }

    const totalPoints = result.rows[0].point_total;
    return res.status(200).json({
      message: '총 포인트 조회 성공',
      totalPoints,
    });
  } catch (error) {
    console.error('Error fetching total points:', error.message);
    return res.status(500).json({
      message: '서버 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// 포인트 상세내역
const getPoints = async (req, res) => {
  try {
    const userNo = req.user?.userNo; // JWT에서 가져온 사용자 고유 번호
    console.log('userNo:', userNo);

    if (!userNo) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    // 포인트 내역 조회
    const query = `
      SELECT 
        point_status, 
        point_amount,
        point_reason,
        TO_CHAR(created_at, 'YY-MM-DD HH24:MI') AS created_at
      FROM point
      WHERE user_no = $1
      ORDER BY created_at DESC
    `;
    const values = [userNo];
    console.log('Query Values:', values);

    const result = await database.query(query, values);
    console.log('Query Result:', result.rows);

    // 응답 데이터 반환
    return res.status(200).json({
      message: '포인트 내역이 성공적으로 조회되었습니다.',
      points: result.rows,
    });
  } catch (error) {
    console.error('Error fetching points:', error.message);
    return res.status(500).json({
      message: '서버 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

module.exports = {
  emailAuth,
  verifyNumber,
  signUp,
  idCheck,
  userLogin,
  findId,
  passwordEmail,
  passwordVerifyNumber,
  resetPassword,
  verifyPassword,
  updatePassword,
  createInquiry,
  getInquiries,
  getTotalPoints,
  getPoints,
};
