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
} = require('../../controllers/user/userController');

router.post('/send_email', emailAuth);
router.post('/verify_email', verifyNumber);
router.post('/sign_up', signUp);
router.post('/id_check', idCheck);
router.post('/user_login', userLogin);
router.post('/find-id', findId);
router.post('/password-email-auth', passwordEmailAuth);
router.post('/password-verify-number', passwordVerifyNumber);
router.post('/reset-password', resetPassword);
module.exports = router;
