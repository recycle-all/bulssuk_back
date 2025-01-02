const database = require('../../database/database'); // 데이터베이스 연결 경로

// 나무키우기 기능
const performTreeAction = async (req, res) => {
  try {
    const userNo = req.user?.userNo;
    const { cost, action } = req.body;

    // 1. 유효성 검사
    if (!userNo) {
      return res.status(400).json({ message: '유효하지 않은 사용자입니다.' });
    }

    if (!cost || typeof cost !== 'number' || cost <= 0) {
      return res.status(400).json({ message: '유효하지 않은 비용입니다.' });
    }

    if (!action || typeof action !== 'string') {
      return res.status(400).json({ message: '유효하지 않은 액션입니다.' });
    }

    // 현재 포인트 조회
    const pointsQuery = `
      SELECT point_total
      FROM point
      WHERE user_no = $1
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const pointsResult = await database.query(pointsQuery, [userNo]);
    if (pointsResult.rows.length === 0) {
      return res.status(404).json({ message: '포인트 기록이 없습니다.' });
    }

    const currentPoints = pointsResult.rows[0].point_total;
    if (currentPoints < cost) {
      return res.status(400).json({ message: '포인트가 부족합니다.' });
    }

    // 2. 포인트 차감 계산
    const newPointTotal = currentPoints - cost;

    // 트랜잭션 시작
    await database.query('BEGIN');

    try {
      // 3. `seed` 테이블에 이벤트 추가
      const seedInsertQuery = `
        INSERT INTO seed (user_no, event, event_points)
        VALUES ($1, $2, $3);
      `;
      await database.query(seedInsertQuery, [userNo, action, cost]);

      // 4. `tree_history` 테이블 업데이트
      const treeHistoryUpdateQuery = `
        UPDATE tree_history
        SET tree_points_total = tree_points_total + $1
        WHERE user_no = $2;
      `;
      await database.query(treeHistoryUpdateQuery, [cost, userNo]);

      // 5. `point` 테이블 업데이트
      const updatePointsQuery = `
        INSERT INTO point (user_no, point_status, point_amount, point_total, point_reason)
        VALUES ($1, 'DELETE', $2, $3, $4);
      `;
      await database.query(updatePointsQuery, [
        userNo,
        -cost,
        newPointTotal,
        action,
      ]);

      // 트랜잭션 커밋
      await database.query('COMMIT');

      // 성공 응답 반환
      return res.status(200).json({
        message: `${action} 성공`,
        points: newPointTotal,
      });
    } catch (error) {
      await database.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error processing tree action:', error);
    return res
      .status(500)
      .json({ message: '서버 오류가 발생했습니다.', error: error.message });
  }
};

module.exports = {
  performTreeAction,
};
