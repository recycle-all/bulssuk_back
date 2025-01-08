const database = require('../../database/database');

// 모든 고객 정보 가져오기
exports.getUsers = async (req, res) => {
    try {
        const userResult = await database.query(
            'SELECT * FROM users WHERE status = true'
        );
        return res.status(200).json(userResult.rows);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};


// 특정 고객 정보 가져오기 
exports.getUser = async (req, res) => {
    const { user_no } = req.params;
    try {
        const userResult = await database.query(
            `SELECT * FROM users WHERE user_no = $1 AND status = true`, [user_no]
        );

        if (userResult.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json(userResult.rows[0]);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// 포인트 가져오기 
exports.getPoint = async(req,res) =>{
    try {
        const pointResult = await database.query(
            'SELECT * FROM point WHERE status = true'
        )
        return res.status(200).json(pointResult.rows)
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}



// 출석률 가져오기 
exports.getAttendanceRate = async (req, res) => {
  try {
    // user_no를 쿼리에서 가져오기
    const userId = parseInt(req.query.user_no);

    if (!userId) {
      return res.status(400).json({ error: "user_no is required" });
    }

    // 유저의 가입일 가져오기
    const userQuery = `SELECT created_at FROM users WHERE user_no = $1`;
    const userResult = await database.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const createdAt = new Date(userResult.rows[0].created_at);

    // 현재 날짜
    const today = new Date();

    // 가입일부터 오늘까지의 총 일수 계산
    const totalDays = Math.ceil((today - createdAt) / (1000 * 60 * 60 * 24));
    if (totalDays <= 0) {
      return res.json({ user_no: userId, attendanceRate: 0 });
    }

    // 출석 기록 가져오기
    const attendanceQuery = `SELECT COUNT(*) AS attended_days FROM attendance WHERE user_no = $1 AND status = true`;
    const attendanceResult = await database.query(attendanceQuery, [userId]);

    const attendedDays = parseInt(attendanceResult.rows[0].attended_days);

    // 출석률 계산 (백분율)
    const attendanceRate = Math.round((attendedDays / totalDays) * 100);

    // 응답 반환
    res.json({ user_no: userId, attendanceRate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}; 
