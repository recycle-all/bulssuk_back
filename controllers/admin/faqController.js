const database = require('../../database/database');
const axios = require('axios');

// 모든 문의내역 가져오기
exports.getAllFaq = async (req, res) => {
  try {
    const inquiryResult = await database.query(
      'SELECT * FROM inquiry WHERE status = true ORDER BY question_no ASC;'
    );
    return res.status(200).json(inquiryResult.rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// 각 문의내역 가져오기
exports.getFaq = async (req, res) => {
  const { question_no } = req.params;
  try {
    const inquiryResult = await database.query(
      'SELECT * FROM inquiry WHERE question_no = $1 AND status = true',
      [question_no]
    );
    return res.status(200).json(inquiryResult.rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
// 각 문의내역 삭제하기 (status = false)
exports.deactivateInquiry = async (req, res) => {
  const { question_no } = req.body;
  if (!question_no) {
    return res.status(400).json({ message: 'question_no가 필요합니다.' });
  }
  try {
    const query = `
        UPDATE inquiry
        SET status = false
        WHERE question_no=$1
        RETURNING *`;

    const { rows } = await database.query(query, [question_no]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: '해당 문의내역을 찾을 수 없습니다. ' });
    }
    res
      .status(200)
      .json({ message: '문의내역이 비활성화되었습니다', event: rows[0] });
  } catch (error) {
    console.error('문의내역 비활성화 중 오류 발생:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 각 문의에 해당하는 답변 가져오기
exports.getAnswer = async (req, res) => {
  const { question_no } = req.params;
  try {
    const answerResult = await database.query(
      'SELECT * FROM answer WHERE question_no = $1',
      [question_no]
    );
    return res.status(200).json(answerResult.rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// 답변 등록하기
exports.postAnswer = async (req, res) => {
  const { question_no, admin_no, answer_content } = req.body;
  if (!question_no || !admin_no || !answer_content) {
    return res.status(400).json({ message: '필요한 데이터가 누락되었습니다.' });
  }

  try {
    // 트랜잭션 시작
    await database.query('BEGIN');

    // 1. answer 테이블에 답변 추가
    await database.query(
      `INSERT INTO answer (question_no, admin_no, answer_content, created_at, updated_at, status)
         VALUES ($1, $2, $3, NOW(), NOW(), true)`,
      [question_no, admin_no, answer_content]
    );

    // 2. inquiry 테이블 상태 업데이트
    await database.query(
      `UPDATE inquiry
         SET is_answered = '답변 완료'
         WHERE question_no = $1`,
      [question_no]
    );

    // 트랜잭션 커밋
    await database.query('COMMIT');
    res.status(200).json({ message: '답변이 등록되었습니다.' });
  } catch (error) {
    // 오류 발생 시 롤백
    await database.query('ROLLBACK');
    res
      .status(500)
      .json({
        message: '답변 등록 중 오류가 발생했습니다.',
        error: error.message,
      });
  }
};

// 답변 수정하기
exports.uploadAnswer = async (req, res) => {
  const { question_no } = req.params; // 요청 경로에서 question_no 가져오기
  const { admin_no, answer_content } = req.body; // 요청 본문에서 admin_no와 answer_content 가져오기

  if (!admin_no || !answer_content) {
    return res
      .status(400)
      .json({ error: 'admin_no와 answer_content는 필수 입력값입니다.' });
  }

  try {
    // 답변이 존재하는지 확인
    const existingAnswer = await database.query(
      'SELECT * FROM answer WHERE question_no = $1',
      [question_no]
    );

    if (existingAnswer.rows.length === 0) {
      return res
        .status(404)
        .json({ error: '해당 question_no에 대한 답변이 존재하지 않습니다.' });
    }

    // 답변 수정
    await database.query(
      `UPDATE answer 
             SET answer_content = $1, admin_no = $2, updated_at = NOW()
             WHERE question_no = $3`,
      [answer_content, admin_no, question_no]
    );

    return res
      .status(200)
      .json({ message: '답변이 성공적으로 수정되었습니다.' });
  } catch (error) {
    console.error('Error updating answer:', error);
    return res.status(500).json({ error: '답변 수정 중 오류가 발생했습니다.' });
  }
};

// 답변 삭제하기 (status=false)
exports.deactivateAnswer = async (req, res) => {
  const { answer_no } = req.body;
  if (!answer_no) {
    return res.status(400).json({ message: 'answer_no가 필요합니다.' });
  }
  try {
    const query = `
        UPDATE answer
        SET status = false
        WHERE answer_no = $1
        RETURNING *`;

    const { rows } = await database.query(query, [answer_no]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: '해당 답변을 찾을 수 없습니다. ' });
    }
    res
      .status(200)
      .json({ message: '답변이 비활성화되었습니다', event: rows[0] });
  } catch (error) {
    console.error('답변 비활성화 중 오류 발생:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// FAQ 생성
exports.generateFAQ = async (req = null, res = null) => {
  try {
    console.log('Triggering FAQ generation');

    // 1. 질문 및 답변 데이터 조회
    const query = `
        SELECT i.question_no, i.question_title, i.question_content, a.answer_content
        FROM inquiry i
        JOIN answer a ON i.question_no = a.question_no
      `;
    const results = await database.query(query);

    // 2. 기존 FAQ 데이터 조회
    const existingQuestionsQuery = `SELECT question FROM faq`;
    const existingQuestionsResults = await database.query(
      existingQuestionsQuery
    );
    const existingQuestions = existingQuestionsResults.rows.map(
      (row) => row.question
    );

    // 3. FastAPI 서버로 클러스터링 요청 (기존 질문 포함)
    const response = await axios.post('http://222.112.27.120:5005/similarity', {
      questions: results.rows.map((row) => ({
        question_no: row.question_no,
        text: `${row.question_content}`,
        answer: row.answer_content,
      })),
      existing_questions: existingQuestions, // 기존 질문 리스트 포함
    });

    const generatedFaqs = response.data.generated_faqs; // FastAPI에서 반환된 FAQ 데이터

    // 4. FastAPI에서 반환된 FAQ 데이터 삽입
    for (const faq of generatedFaqs) {
      if (!faq.question || !faq.answer) {
        console.log('Invalid FAQ detected. Skipping.');
        continue; // 질문이나 답변이 없으면 건너뜀
      }

      const insertQuery = `
          INSERT INTO faq (question, answer, is_approved)
          VALUES ($1, $2, $3)
        `;
      await database.query(insertQuery, [faq.question, faq.answer, '대기중']);

      console.log(`New FAQ inserted: "${faq.question}"`);
    }

    if (res)
      res.status(200).json({ message: 'FAQ data successfully generated' });
  } catch (error) {
    console.error('Error generating FAQ:', error);
    if (res) res.status(500).json({ error: 'Failed to generate FAQ' });
  }
};

// 모든 자동생성된 FAQ 가져오기 
exports.getAllFaqs = async(req, res) =>{
  try {
      const inquiryResult = await database.query(
          'SELECT * FROM faq ORDER BY faq_no ASC'
      );
      return res.status(200).json(inquiryResult.rows)
  } catch (error) {
      return res.status(500).json({ error: error.message });
  }
}

// 각 FAQ 가져오기
exports.getEachFaq = async(req,res)=>{
  const {faq_no} = req.params
  try {
      const inquiryResult = await database.query(
          'SELECT * FROM faq WHERE faq_no=$1',[faq_no]
      )
      return res.status(200).json(inquiryResult.rows)
  } catch (error) {
      return res.status(500).json({ error: error.message });
  }
} 

// FAQ 카테고리 가져오기
exports.getFaqCategories = async(req, res)=>{
  try {
      const categoryResult = await database.query('SELECT * FROM faq_categories')
      return res.status(200).json(categoryResult.rows)
  } catch (error) {
      return res.status(500).json({ error: error.message });
  }
}

// FAQ 카테고리 이름 가져오기
exports.getFaqCategoryName = async(req, res) =>{
  const { category_id } = req.params
  try {
      const categoryResult = await database.query('SELECT category_name FROM faq_categories WHERE category_id = $1', [category_id])
      return res.status(200).json(categoryResult.rows)
  } catch (error) {
      return res.status(500).json({ error: error.message });
  }
}
// FAQ 상태값 변경
exports.ChangeFaqState = async (req, res) => {
  const { faq_no, category_id, action } = req.body; // 요청에서 데이터 가져오기

  if (!faq_no || !action) {
    return res.status(400).json({ message: 'faq_no와 action은 필수입니다.' });
  }

  try {
    // 현재 시간 가져오기
    const updated_at = new Date();

    if (action === '채택') {
      if (!category_id) {
        return res.status(400).json({ message: '카테고리를 선택해야 합니다.' });
      }

      // 카테고리가 선택된 상태에서 '채택' 처리
      await database.query(
        `
        UPDATE faq
        SET category_id = $1, is_approved = $2, updated_at = $3
        WHERE faq_no = $4
        `,
        [category_id, '채택 완료', updated_at, faq_no]
      );

      return res.status(200).json({ message: 'FAQ가 채택 완료로 업데이트되었습니다.' });
    } else if (action === '반려') {
      // '반려' 처리
      await database.query(
        `
        UPDATE faq
        SET is_approved = $1, updated_at = $2
        WHERE faq_no = $3
        `,
        ['반려', updated_at, faq_no]
      );

      return res.status(200).json({ message: 'FAQ가 반려 상태로 업데이트되었습니다.' });
    } else {
      return res.status(400).json({ message: '유효하지 않은 action 값입니다.' });
    }
  } catch (error) {
    console.error('Error updating FAQ state:', error);
    return res.status(500).json({ message: 'FAQ 상태 업데이트 중 오류가 발생했습니다.' });
  }
};

// FAQ 반려

