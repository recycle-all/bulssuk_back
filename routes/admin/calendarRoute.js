const express = require('express');
const router = express.Router();
const { getMonth, customDay, changeMonthImage, changeDay, createDay, deactivateDay, putMonthImage } = require('../../controllers/admin/calendarController');


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
// 달력관련 API
// 특정 월(Month)의 커스텀 데이터 가져오기
router.get('/custom_month/:month', getMonth);
router.put('/change_month_image', upload.single('image'), changeMonthImage);
router.post('/custom_month', upload.single('image'), putMonthImage)
// 특정 월의 일(Day)별 이벤트 데이터 가져오기
router.get('/custom_day/:year/:month', customDay);
router.put('/change_day', upload.single('image'), changeDay)
// 새로운 이벤트 등록
router.post('/create_day', upload.single('image'), createDay)
// 이벤트 삭제( 비활성화 )
router.put('/deactivate_day', deactivateDay)

module.exports = router;