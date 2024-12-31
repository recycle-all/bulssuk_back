const express = require('express');
const { getCoupons, getCoupon, updateCoupon, deactivateCoupon, CreateCoupon } = require('../../controllers/admin/couponController');
const router = express.Router();
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


router.get('/coupons', getCoupons)
router.get('/coupon/:coupon_no', getCoupon)
// 쿠폰 수정
router.put('/update_coupon',upload.single('image'), updateCoupon)
// 쿠폰 새로 등록
router.post('/create_coupon',upload.single('image'),CreateCoupon)
// 쿠폰 삭제(비활성화)
router.put('/deactivate_coupon',deactivateCoupon)
module.exports = router;
