const router = require('express').Router();

const {
  emailAuth,
  verifyNumber,
  signUp,
  idCheck,
  userLogin,
  findId,
  passwordEmailAuth,
  passwordVerifyNumber,
  resetPassword,
  verifyPassword,
  updatePassword,
  createInquiry,
} = require('../../controllers/user/userController');
const authenticateToken = require('../../middleware/authenticateToken');

// 회원가입 및 로그인 관련 라우트
router.post('/send_email', emailAuth); // 이메일 인증번호 전송
router.post('/verify_email', verifyNumber); // 이메일 인증번호 확인
router.post('/sign_up', signUp); // 회원가입
router.post('/id_check', idCheck); // 아이디 중복 확인
router.post('/user_login', userLogin); // 로그인
router.post('/find-id', findId); // 아이디 찾기

// 비밀번호 관리 관련 라우트
router.post('/password-email-auth', passwordEmailAuth); // 비밀번호 찾기용 이메일 인증번호 전송
router.post('/password-verify-number', passwordVerifyNumber); // 비밀번호 찾기용 인증번호 확인
router.post('/reset-password', resetPassword); // 비밀번호 재설정
router.post('/verify-password', verifyPassword); // 비밀번호 확인
router.post('/update-password', updatePassword); // 비밀번호 변경

// 1:1 문의 관련 라우트
router.post('/inquiry', authenticateToken, createInquiry); // 인증된 사용자만 문의 등록 가능

module.exports = router;
