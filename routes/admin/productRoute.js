const express = require('express');
const router = express.Router();
const { getAllProducts, getCompanyProducts, getProduct, updateProduct, createProduct, deactivateProduct } = require('../../controllers/admin/productController');

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
// 상품 관련 API
// 상품 정보 가져오기
router.get('/products', getAllProducts)
router.get('/products/:company_no', getCompanyProducts)
router.get('/product/:product_no', getProduct)
// 상품 정보 수정
router.put('/change_product', upload.single('image'), updateProduct)
// 상품 정보 새로 등록
router.post('/create_product', upload.single('image'), createProduct)
// 상품 삭제 (비활성화)
router.put('/deactivate_product', deactivateProduct)

module.exports = router;
