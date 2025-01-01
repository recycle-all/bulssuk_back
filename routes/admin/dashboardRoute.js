const express = require('express');
const router = express.Router();
const { countUsers, inquiries, events } = require('../../controllers/admin/dashboardController');

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
router.get('/count_users', countUsers)
router.get('/not_answered_inquiries', inquiries)
router.get('/this_month_events', events)
module.exports = router;
