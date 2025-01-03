const router = require('express').Router();

const authenticateToken = require('../../middleware/authenticateToken');
const {
  waterTree,
  sunlightTree,
  fertilizerTree,
  levelUpToSprout,
  levelUpToBranch,
  levelUpToTree,
  levelUpToFlower,
  treeState,
} = require('../../controllers/user/treeController');

// 나무 상태 조회 라우트
router.post('/tree/state', treeState, authenticateToken);

// 물주기 라우트
router.post('/tree/water', waterTree, authenticateToken);

// 햇빛쐬기 라우트
router.post('/tree/sunlight', sunlightTree, authenticateToken);

// 비료주기 라우트
router.post('/tree/fertilizer', fertilizerTree, authenticateToken);

// 씨앗 > 새싹 라우트
router.post('/tree/level_sprout', levelUpToSprout, authenticateToken);

// 새싹 > 가지 라우트
router.post('/tree/level_branch', levelUpToBranch, authenticateToken);

// 가지 > 나무 라우트
router.post('/tree/level_tree', levelUpToTree, authenticateToken);

// 나무 > 꽃 라우트
router.post('/tree/level_flower', levelUpToFlower, authenticateToken);

module.exports = router;
