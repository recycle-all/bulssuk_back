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
  getAllFaqs,
  getEachFaq,
  getFaqCategories,
  getFaqCategoryName,
  ChangeFaqState,
  updateFaq,
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

// FAQ 가져오기
router.get('/all_faqs', getAllFaqs)
router.get('/faq/:faq_no',getEachFaq)
// FAQ 카테고리 가져오기
router.get('/faq_categories', getFaqCategories)
router.get('/faq_category_name/:category_id', getFaqCategoryName)
// FAQ 상태 변경
router.put('/change_faq_state',ChangeFaqState)
// FAQ 수정
router.put('/update_faq',updateFaq)
module.exports = router;
