const database = require('../../database/database')

// 모든 유저 수 카운트
exports.countUsers = async(req, res) =>{
    try {
        const countResult = await database.query(
            'SELECT COUNT(*) AS total_active_users FROM users WHERE status = true'
        )
        return res.status(200).json(countResult.rows[0].total_active_users)
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

// 답변 대기중인 문의 내역 가져오기
exports.inquiries = async (req, res) =>{
    try {
        const inquiryResult = await database.query(
            `SELECT COUNT(*) AS total_not_answered_inquiries 
            FROM inquiry 
            WHERE is_answered = '답변 대기' AND status = true`
        )
        return res.status(200).json(inquiryResult.rows[0].total_not_answered_inquiries)
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.events = async (req, res) => {
    try {
      // 오늘 날짜 구하기
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1; // JavaScript는 0부터 시작하므로 +1
  
      // SQL 쿼리 실행: 이번 달의 이벤트 가져오기
      const query = `
        SELECT COUNT(*) AS total_events
        FROM manage_calendar
        WHERE EXTRACT(YEAR FROM calendar_date) = $1
          AND EXTRACT(MONTH FROM calendar_date) = $2
          AND status = true
      `;
  
      const result = await database.query(query, [currentYear, currentMonth]);
  
      // 결과 반환
      return res.status(200).json(result.rows[0].total_events);
    } catch (error) {
      console.error('Error fetching events:', error.message);
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  };
