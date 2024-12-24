const router = require('express').Router();
const {
  emailAuth,
  verifyNumber,
  signUp,
  idCheck,
  userLogin,
  findId,
} = require('../../controllers/user/userController');

router.post('/send_email', emailAuth);
router.post('/verify_email', verifyNumber);
router.post('/sign_up', signUp);
router.post('/id_check', idCheck);
router.post('/user_login', userLogin);
router.post('/find-id', findId);

module.exports = router;
