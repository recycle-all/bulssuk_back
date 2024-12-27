const express = require('express');
const router = express.Router();
const { getBigCategory, getMidCategory, getDetail, updateBigCategory, createBigCategory, updateMidCategory, getGuideContent, createMidCategory, deactivateCategory, deactivateSubcategory } = require('../../controllers/admin/recycleController');

const multer = require('multer');
const path = require('path');
// multer 설정: 원본 파일명 + 타임스탬프로 저장
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/images/');
  },
  filename: (req, file, cb) => {
    const originalName = file.originalname;

    cb(null, originalName);
  },
});

const upload = multer({ storage });

// 재활용 가이드 조회
router.get('/big_category', getBigCategory);
// 대분류
router.put('/update_big_category', upload.single('category_image'), updateBigCategory);
router.post('/create_big_category', upload.single('category_image'), createBigCategory);
// 중분류
router.get('/mid_category', getMidCategory);
router.put('/update_mid_category', upload.single('guide_img'), updateMidCategory);
router.post('/create_mid_category', upload.single('guide_img'), createMidCategory);
// 세부사항 가져오기
router.get('/guide/:subcategory_no', getGuideContent);
// 삭제 (상태값 변경)
router.put('/deactivate_category/:category_no', deactivateCategory);
router.put('/deactivate_subcategory/:subcategory_no', deactivateSubcategory);

module.exports = router;