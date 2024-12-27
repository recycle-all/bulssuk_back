const database = require('../../database/database');
const dotenv = require('dotenv');
dotenv.config();

// 출석 체크 가져오기
const getAttendance = async (req, res) => {
  const { user_id } = req.params;

  try {
    // user_id로 user_no 조회
    const userResult = await database.query(
      'SELECT user_no FROM users WHERE user_id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user_no = userResult.rows[0].user_no;

    // user_no로 출석 데이터 조회
    const attendanceResult = await database.query(
      'SELECT * FROM attendance WHERE user_no = $1 ORDER BY attendance_date DESC',
      [user_no]
    );

    res.json(attendanceResult.rows);
  } catch (err) {
    console.error('Error fetching attendance history:', err);
    res.status(500).send('Server error');
  }
};

// 출석 체크 업데이트
const updateAttendance = async (req, res) => {
  const { user_id } = req.body;

  try {
    // user_id로 user_no 조회
    const userResult = await database.query(
      'SELECT user_no FROM users WHERE user_id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user_no = userResult.rows[0].user_no;

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(now.getDate()).padStart(2, '0')}`; // YYYY-MM-DD 형식

    // 중복 체크
    const duplicateCheck = await database.query(
      'SELECT * FROM attendance WHERE user_no = $1 AND attendance_date = $2',
      [user_no, today]
    );

    if (duplicateCheck.rows.length > 0) {
      return res
        .status(400)
        .json({ message: '이미 오늘 출석 체크가 완료되었습니다.' });
    }

    // 출석 체크 저장
    const result = await database.query(
      'INSERT INTO attendance (user_no, attendance_date, status) VALUES ($1, $2, $3) RETURNING *',
      [user_no, today, true]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating attendance:', err);
    res.status(500).send('Server error');
  }
};

// 알람 설정 추가
const addAlarm = async (req, res) => {
  const {
    user_id, // user_id로 받기
    user_calendar_name,
    user_calendar_every,
    user_calendar_memo,
    selected_date,
  } = req.body;

  try {
    // user_id로 user_no 조회
    const userResult = await database.query(
      'SELECT user_no FROM users WHERE user_id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user_no = userResult.rows[0].user_no;

    const dateToInsert = selected_date ? new Date(selected_date) : new Date();

    const result = await database.query(
      'INSERT INTO user_calendar (user_no, user_calendar_name, user_calendar_every, user_calendar_memo, created_at, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        user_no,
        user_calendar_name,
        user_calendar_every,
        user_calendar_memo,
        dateToInsert,
        true,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding alarm:', err);
    res.status(500).send('Server error');
  }
};

// 알람 리스트 가져오기
const getAlarms = async (req, res) => {
  const { user_id } = req.params;
  const { selected_date } = req.body;

  if (!user_id || !selected_date) {
    return res
      .status(400)
      .json({ message: 'user_id와 selected_date는 필수입니다.' });
  }

  // 날짜 형식 검증 및 변환
  const isValidDate = !isNaN(Date.parse(selected_date));
  if (!isValidDate) {
    return res.status(400).json({ message: '유효하지 않은 날짜 형식입니다.' });
  }

  try {
    const userResult = await database.query(
      'SELECT user_no FROM users WHERE user_id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user_no = userResult.rows[0].user_no;

    const startDate = new Date(`${selected_date}T00:00:00Z`);
    const endDate = new Date(`${selected_date}T23:59:59Z`);

    const result = await database.query(
      'SELECT * FROM user_calendar WHERE user_no = $1 AND created_at BETWEEN $2 AND $3',
      [user_no, startDate, endDate]
    );

    if (result.rows.length > 0) {
      res.json(result.rows);
    } else {
      res.status(404).json({ message: '해당 날짜에 메모가 없습니다.' });
    }
  } catch (err) {
    console.error('Error fetching alarms:', err);
    res.status(500).send('Server error');
  }
};

module.exports = {
  getAttendance,
  updateAttendance,
  addAlarm,
  getAlarms,
};
