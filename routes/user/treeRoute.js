const router = require('express').Router();

const { performTreeAction } = require('../../controllers/user/treeController');
const authenticateToken = require('../../middleware/authenticateToken');

// 물주기 API 라우트
router.post('/tree_action', authenticateToken, performTreeAction);

module.exports = router;
