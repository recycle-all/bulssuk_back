const express = require('express');
const router = express.Router();

const {
  getAllFaq,
  getAnswer,
  getFaq,
  postAnswer,
  uploadAnswer,
  deactivateInquiry,
  deactivateAnswer,
  generateFAQ,
} = require('../../controllers/admin/faqController');

// 문의내역 관련 API
// 문의내역 가져오기
router.get('/all_inquiries', getAllFaq);
router.get('/inquiry/:question_no', getFaq);
// 문의내역 삭제하기(비활성화)
router.put('/deactivate_inquiry', deactivateInquiry);
// 답변 가져오기
router.get('/answer/:question_no', getAnswer);
// 답변 등록하기
router.post('/answer', postAnswer);
// 답변 수정하기
router.put('/answer/:question_no', uploadAnswer);
// 답변 삭제하기(비활성화)
router.put('/deactivate_answer', deactivateAnswer);
// FAQ 생성
router.post('/generate', generateFAQ);

module.exports = router;
