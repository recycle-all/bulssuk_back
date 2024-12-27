const express = require('express');
const router = express.Router();

const { getCompanies, getCompany, updateCompany, createCompany, deactivateCompany } = require('../../controllers/admin/companyController');

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
// 기업 관련 API
// 기업 정보 가져오기 
router.get('/companies', getCompanies)
router.get('/company/:company_no', getCompany)
// 기업 정보 수정
router.put('/change_company', upload.single('image'), updateCompany)
// 기업 새로 등록
router.post('/create_company', upload.single('image'), createCompany)
// 기업 삭제 ( 비활성화 )
router.put('/deactivate_company', deactivateCompany)


module.exports = router;
