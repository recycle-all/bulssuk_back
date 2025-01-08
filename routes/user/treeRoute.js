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
  treeManage,
  availableCoupons,
  selectCoupon,
} = require('../../controllers/user/treeController');

// 나무 상태 조회 라우트
router.get('/tree/state/:user_no', treeState, authenticateToken);

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

// 물주기, 햇빛쐬기, 비료주기 이미지 조회 라우트
router.get('/tree/manage', treeManage);

// 쿠폰 조회 라우트
router.get('/tree/coupon', availableCoupons);

// 쿠폰 등록 라우트
router.post('/tree/select_coupon', selectCoupon);

module.exports = router;
