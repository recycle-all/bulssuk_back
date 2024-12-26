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
} = require('../../controllers/user/userController');

router.post('/send_email', emailAuth); // 이메일 인증번호 전송
router.post('/verify_email', verifyNumber); // 이메일 인증번호 확인
router.post('/sign_up', signUp); // 회원가입
router.post('/id_check', idCheck); // 아이디 중복 확인
router.post('/user_login', userLogin); // 로그인
router.post('/find-id', findId); // 아이디 찾기
router.post('/password-email-auth', passwordEmailAuth); // 비밀번호 찾기용 이메일 인증번호 전송
router.post('/password-verify-number', passwordVerifyNumber); // 비밀번호 찾기용 인증번호 확인
router.post('/reset-password', resetPassword); // 비밀번호 재설정
router.post('/verify-password', verifyPassword); // 비밀번호 확인
router.post('/update-password', updatePassword); // 비밀번호 변경
module.exports = router;
