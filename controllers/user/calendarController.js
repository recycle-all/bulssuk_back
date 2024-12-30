const database = require('../../database/database');
const dotenv = require('dotenv');
dotenv.config();

// 출석 체크 가져오기
const getAttendance = async (req, res) => {
  const { user_id } = req.params;

  try {
    const userResult = await database.query(
      'SELECT user_no FROM users WHERE user_id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user_no = userResult.rows[0].user_no;

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

    const duplicateCheck = await database.query(
      'SELECT * FROM attendance WHERE user_no = $1 AND attendance_date = $2',
      [user_no, today]
    );

    if (duplicateCheck.rows.length > 0) {
      return res
        .status(400)
        .json({ message: '이미 오늘 출석 체크가 완료되었습니다.' });
    }

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

// 알람 추가
const addAlarm = async (req, res) => {
  const {
    user_id,
    user_calendar_name,
    user_calendar_every,
    user_calendar_memo,
    user_calendar_date,
    user_calendar_list,
  } = req.body;

  console.log('Received user_calendar_date:', user_calendar_date); // 디버깅용 출력

  try {
    const userResult = await database.query(
      'SELECT user_no FROM users WHERE user_id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user_no = userResult.rows[0].user_no;

    // 날짜 유효성 검사
    if (!user_calendar_date) {
      return res
        .status(400)
        .json({ message: 'user_calendar_date is required.' });
    }

    const parsedDate = new Date(user_calendar_date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format.' });
    }

    // 데이터베이스에 삽입
    const result = await database.query(
      `INSERT INTO user_calendar (user_no, user_calendar_name, user_calendar_every, user_calendar_memo, user_calendar_date, created_at, status, user_calendar_list) 
       VALUES ($1, $2, $3, $4, $5, NOW(), TRUE, $6) RETURNING *`,
      [
        user_no,
        user_calendar_name,
        user_calendar_every,
        user_calendar_memo,
        parsedDate.toISOString().split('T')[0], // YYYY-MM-DD 형식
        user_calendar_list,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding alarm:', err);
    res.status(500).send('Server error');
  }
};

// 알람 수정
const updateAlarm = async (req, res) => {
  const {
    user_id,
    user_calendar_no,
    user_calendar_name,
    user_calendar_every,
    user_calendar_memo,
    user_calendar_list, // 활성화/비활성화 여부 필드
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

    // 업데이트 쿼리
    const result = await database.query(
      `UPDATE user_calendar
       SET user_calendar_name = $1, 
           user_calendar_every = $2, 
           user_calendar_memo = $3,
           user_calendar_list = $4
       WHERE user_no = $5 AND user_calendar_no = $6
       RETURNING *`,
      [
        user_calendar_name,
        user_calendar_every,
        user_calendar_memo,
        user_calendar_list, // 활성화/비활성화 여부
        user_no,
        user_calendar_no, // 메모를 식별
      ]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: 'Alarm not found for the given date.' });
    }

    res.json({ message: 'Alarm updated successfully.', alarm: result.rows[0] });
  } catch (err) {
    console.error('Error updating alarm:', err);
    res.status(500).send('Server error');
  }
};

// 알람 리스트 가져오기
const getAlarms = async (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ message: 'user_id는 필수입니다.' });
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

    const result = await database.query(
      `SELECT user_calendar_name, user_calendar_memo, user_calendar_every, user_calendar_date, user_calendar_list, created_at
       FROM user_calendar WHERE user_no = $1 AND status = true ORDER BY user_calendar_date DESC, created_at DESC`,
      [user_no]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching alarms:', err);
    res.status(500).send('Server error');
  }
};

// 특정 날짜의 알람 리스트 가져오기
const getAlarmsByDate = async (req, res) => {
  const { user_id, user_calendar_date } = req.query;

  if (!user_id || !user_calendar_date) {
    return res
      .status(400)
      .json({ message: 'user_id and user_calendar_date are required.' });
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

    const result = await database.query(
      `SELECT user_calendar_name, user_calendar_memo, user_calendar_every, user_calendar_date, user_calendar_list
       FROM user_calendar 
       WHERE user_no = $1 AND user_calendar_date = $2 AND status = true
       ORDER BY user_calendar_date DESC, created_at DESC`,
      [user_no, user_calendar_date]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching alarms by date:', err);
    res.status(500).send('Server error');
  }
};

// 알람 삭제 (status = false)
const deactivateAlarm = async (req, res) => {
  const { user_id, user_calendar_no } = req.body;

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

    // user_calendar_date 조건으로 알람의 status를 false로 변경
    const result = await database.query(
      `UPDATE user_calendar
       SET status = false
       WHERE user_no = $1 AND user_calendar_no = $2
       RETURNING *`,
      [user_no, user_calendar_no]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: '해당 날짜의 알람을 찾을 수 없습니다.' });
    }

    res.json({
      message: '알람이 성공적으로 삭제되었습니다.',
      alarm: result.rows,
    });
  } catch (err) {
    console.error('Error deleting alarm:', err);
    res.status(500).send('Server error');
  }
};

module.exports = {
  getAttendance,
  updateAttendance,
  addAlarm,
  getAlarms,
  updateAlarm,
  getAlarmsByDate,
  deactivateAlarm,
};
