const database = require('../../database/database');

// 모든 문의내역 가져오기
exports.getAllFaq = async (req, res) => {
  try {
    const inquiryResult = await database.query(
      'SELECT * FROM inquiry WHERE status = true'
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

    // 3. FastAPI 서버로 클러스터링 요청
    const response = await axios.post('http://localhost:5005/similarity', {
      questions: results.rows.map((row) => ({
        question_no: row.question_no,
        text: `${row.question_content}`,
        answer: row.answer_content,
      })),
    });

    const clusters = response.data; // FastAPI에서 반환된 데이터

    // 4. 클러스터링 결과 처리
    for (const [clusterId, clusterItems] of Object.entries(clusters)) {
      let selectedQuestion = null;
      let selectedAnswer = null;

      // 5. 유사도 기반 중복 판별
      for (const item of clusterItems) {
        const similarityResponse = await axios.post(
          'http://localhost:5005/check_similarity',
          {
            new_question: item.text,
            existing_questions: existingQuestions,
          }
        );

        if (similarityResponse.data.is_duplicate) {
          console.log(`중복된 질문입니다 : "${item.text}"`);
          continue; // 중복인 경우 삽입하지 않음
        }
        if (!similarityResponse.data.is_duplicate) {
          selectedQuestion = item.text;
          selectedAnswer = item.answer;
          break; // 중복이 아닌 질문을 찾으면 반복 종료
        }
      }

      // 적합한 질문을 찾지 못한 경우 클러스터 건너뛰기
      if (!selectedQuestion) {
        console.log(
          `All questions in cluster ${clusterId} are duplicates. Skipping.`
        );
        continue;
      }

      // 6. 중복이 아니면 데이터 삽입
      const insertQuery = `
            INSERT INTO faq (question, answer, is_approved)
            VALUES ($1, $2, $3)
          `;
      await database.query(insertQuery, [
        selectedQuestion,
        selectedAnswer,
        '대기중',
      ]);

      console.log(`New FAQ inserted: "${selectedQuestion}"`);
    }

    if (res)
      res.status(200).json({ message: 'FAQ data successfully generated' });
  } catch (error) {
    console.error('Error generating FAQ:', error);
    if (res) res.status(500).json({ error: 'Failed to generate FAQ' });
  }
};
