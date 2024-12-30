const router = require('express').Router();

const {
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
} = require('../../controllers/user/userController');
const authenticateToken = require('../../middleware/authenticateToken');

// 회원가입 및 로그인 관련 라우트
router.post('/send_email', emailAuth); // 이메일 인증번호 전송
router.post('/verify_email', verifyNumber); // 이메일 인증번호 확인
router.post('/sign_up', signUp); // 회원가입
router.post('/id_check', idCheck); // 아이디 중복 확인
router.post('/user_login', userLogin); // 로그인
router.post('/find_id', findId); // 아이디 찾기

// 비밀번호 관리 관련 라우트
router.post('/password_email', passwordEmail); // 비밀번호 찾기용 이메일 인증번호 전송
router.post('/password_verify_number', passwordVerifyNumber); // 비밀번호 찾기용 인증번호 확인
router.post('/reset_password', resetPassword); // 비밀번호 재설정
router.post('/verify_password', verifyPassword); // 비밀번호 확인
router.post('/update_password', updatePassword); // 비밀번호 변경

// 1:1 문의 관련 라우트
router.post('/inquiry', authenticateToken, createInquiry); // 인증된 사용자만 문의 등록 가능
router.get('/get-inquiries', authenticateToken, getInquiries); // 사용자 문의 내역 조회

// 포인트 관련 라우트
router.get('/total_point', authenticateToken, getTotalPoints); // 총 포인트 조회
router.get('/history_point', authenticateToken, getPoints); // 포인트 사용내역

module.exports = router;
