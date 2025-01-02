const express = require('express');
const router = express.Router();
const {
  getCategories,
  getSubcategories,
  getGuideDetails,
} = require('../../controllers/user/guideController');

router.get('/categories', getCategories);
router.get('/subcategories/:category_id', getSubcategories);
router.get('/detail/:subcategory_id', getGuideDetails);

module.exports = router;
