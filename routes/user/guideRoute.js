const express = require('express');
const router = express.Router();
const {
  getCategories,
  getSubcategories,
  getGuideDetails,
} = require('../../controllers/user/guideController');

router.get('/categories', getCategories);
router.get('/categories/:category_id/subcategories', getSubcategories);
router.get('/subcategories/:subcategory_id/details', getGuideDetails);

module.exports = router;
