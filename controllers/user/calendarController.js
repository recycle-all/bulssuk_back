const database = require('../../database/database');
const dotenv = require('dotenv');
const path = require('path');
const moment = require('moment-timezone'); // KST 변환을 위해 import
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
    user_calendar_time,
  } = req.body;

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

    // 시간 형식 변환 (HH:MM)
    const formattedTime = user_calendar_time
      ? user_calendar_time.slice(0, 5) // "13:20:00" -> "13:20"
      : null;

    // 데이터베이스에 삽입
    const result = await database.query(
      `INSERT INTO user_calendar (user_no, user_calendar_name, user_calendar_every, user_calendar_memo, user_calendar_date, user_calendar_time, created_at, status, user_calendar_list) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), TRUE, $7) RETURNING *`,
      [
        user_no,
        user_calendar_name,
        user_calendar_every,
        user_calendar_memo,
        parsedDate.toISOString().split('T')[0], // YYYY-MM-DD 형식
        formattedTime, // 시간 변환된 값
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
    user_calendar_list,
    user_calendar_time,
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

    // 조회 결과에서 user_no를 가져옴
    const user_no = userResult.rows[0].user_no;

    // user_calendar_no가 null인지 확인
    if (!user_calendar_no) {
      return res.status(400).json({ message: 'user_calendar_no is required.' });
    }

    // 시간 형식 변환 (HH:MM)
    const formattedTime = user_calendar_time
      ? user_calendar_time.slice(0, 5) // "13:20:00" -> "13:20"
      : null;

    // 업데이트 쿼리
    const result = await database.query(
      `UPDATE user_calendar
       SET user_calendar_name = $1, 
           user_calendar_every = $2, 
           user_calendar_memo = $3,
           user_calendar_list = $4,
           user_calendar_time = $5
       WHERE user_no = $6 AND user_calendar_no = $7
       RETURNING *`,
      [
        user_calendar_name,
        user_calendar_every,
        user_calendar_memo,
        user_calendar_list, // 활성화/비활성화 여부
        formattedTime,
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
      `SELECT user_calendar_name, user_calendar_memo, user_calendar_every, user_calendar_date, user_calendar_list, TO_CHAR(user_calendar_time, 'HH24:MI') AS user_calendar_time, created_at
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
  console.log('API 요청 받음:', req.query); // 요청 로그
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
      `SELECT user_calendar_no, user_calendar_name, user_calendar_memo, 
              user_calendar_every, user_calendar_date, user_calendar_list, TO_CHAR(user_calendar_time, 'HH24:MI') AS user_calendar_time
       FROM user_calendar 
       WHERE user_no = $1 AND user_calendar_date = $2 AND status = true
       ORDER BY created_at DESC`,
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

  if (!user_calendar_no) {
    return res.status(400).json({ message: 'user_calendar_no is required.' });
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
      `UPDATE user_calendar
       SET status = false
       WHERE user_no = $1 AND user_calendar_no = $2
       RETURNING *`,
      [user_no, user_calendar_no]
    );
    console.log('Request body:', req.body);

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

// 출석체크와 포인트 지급 동시
const updateAttendanceAndPoints = async (req, res) => {
  const { user_no } = req.body;
  console.log('Request Body:', req.body);

  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // 오늘 날짜 (YYYY-MM-DD 형식)
    console.log('Today:', today);

    // 중복 체크: 동일 날짜에 이미 출석 체크된 경우 처리
    const duplicateCheck = await database.query(
      'SELECT * FROM attendance WHERE user_no = $1 AND attendance_date = $2',
      [user_no, today]
    );
    console.log('Duplicate Check Result:', duplicateCheck.rows);

    if (duplicateCheck.rows.length > 0) {
      return res
        .status(400)
        .json({ message: '이미 오늘 출석 체크가 완료되었습니다.' });
    }

    // 출석 체크 기록 추가
    const attendanceResult = await database.query(
      'INSERT INTO attendance (user_no, attendance_date, status) VALUES ($1, $2, $3) RETURNING *',
      [user_no, today, true]
    );
    console.log('Attendance Insert Result:', attendanceResult.rows[0]);

    // 포인트 추가 로직
    const previousPoint = await database.query(
      'SELECT point_total FROM point WHERE user_no = $1 ORDER BY created_at DESC LIMIT 1',
      [user_no]
    );
    const lastPointTotal =
      previousPoint.rows.length > 0 ? previousPoint.rows[0].point_total : 0;
    const pointAmount = 10; // 절대값으로 포인트 추가 (10)

    const pointResult = await database.query(
      'INSERT INTO point (user_no, point_status, point_amount, point_total, point_reason) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [
        user_no,
        'ADD', // 포인트 상태
        pointAmount,
        lastPointTotal + pointAmount, // 이전 값에 포인트 추가
        '출석체크', // 포인트 사유
      ]
    );
    console.log('Point Insert Result:', pointResult.rows[0]);

    res.json({
      attendance: attendanceResult.rows[0],
      point: pointResult.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// 해당하는 달의 출석체크 모두 가져오기
const getAttendances = async (req, res) => {
  const { user_no, year, month } = req.params; // URL에서 user_no, year, month 추출

  try {
    // 데이터베이스 쿼리 실행
    const result = await database.query(
      `SELECT * 
       FROM attendance 
       WHERE user_no = $1 
       AND EXTRACT(YEAR FROM attendance_date) = $2 
       AND EXTRACT(MONTH FROM attendance_date) = $3`,
      [user_no, year, month] // 쿼리 파라미터에 값 전달
    );

    // 결과 반환
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching attendance data:', error);
    res
      .status(500)
      .json({ message: '서버 오류로 데이터를 가져오지 못했습니다.' });
  }
};

// 달(month) 이미지 가져오기
const getMonthImage = async (req, res) => {
  const { month } = req.params;

  try {
    const query = `
      SELECT custom_month, custom_img
      FROM custom_img 
      WHERE custom_month = $1
    `;
    const result = await database.query(query, [month]);

    if (result.rows.length === 0) {
      return res.status(200).json([]);
    }

    // 파일 이름만 추출
    const rowsWithFileNameOnly = result.rows.map((row) => ({
      ...row,
      custom_img: path.basename(row.custom_img), // 파일 이름만 추출
    }));

    res.status(200).json(rowsWithFileNameOnly);
  } catch (error) {
    console.error('Error fetching custom data:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};

// 일(day) 이벤트 가져오기
const getEvent = async (req, res) => {
  const { year, month } = req.params;

  // 월 형식 맞추기 (예: 2024-12)
  const formattedMonth = `${year}-${month.padStart(2, '0')}`;

  try {
    const query = `
      SELECT manage_calendar_no, calendar_name, calendar_date, calendar_content, calendar_img
      FROM manage_calendar
      WHERE calendar_date::text LIKE $1 AND status = true 
      ORDER BY calendar_date ASC
    `;
    const result = await database.query(query, [`${formattedMonth}-%`]);
    if (result.rows.length === 0) {
      return res.status(200).json([]); // 빈 배열 반환
    }

    // UTC -> KST 변환 및 calendar_img 파일 이름만 추출
    const adjustedRows = result.rows.map((row) => ({
      ...row,
      calendar_date: moment(row.calendar_date)
        .tz('Asia/Seoul')
        .format('YYYY-MM-DD'), // KST 변환
      calendar_img: row.calendar_img ? row.calendar_img.split('/').pop() : null, // 파일 이름만 추출
    }));
    console.log(adjustedRows);
    res.status(200).json(adjustedRows);
  } catch (error) {
    console.error('Error fetching custom day data:', error.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};

// 알람 리스트 가져오기
const getAlarmsForUser = async (req, res) => {
  const { user_no } = req.params; // URL의 user_no 파라미터
  const { user_calendar_date } = req.query; // Query parameter에서 user_calendar_date 받기
  console.log(user_no);
  console.log(user_calendar_date);

  if (!user_no || !user_calendar_date) {
    return res
      .status(400)
      .json({ message: 'user_no와 user_calendar_date 필수입니다.' });
  }

  try {
    // 선택된 날짜의 시작과 끝을 계산
    const startDate = `${user_calendar_date} 00:00:00`; // 날짜 시작
    const endDate = `${user_calendar_date} 23:59:59`; // 날짜 끝

    // 데이터베이스에서 날짜 범위로 필터링
    const result = await database.query(
      `
      SELECT 
  user_no, 
  user_calendar_name, 
  TO_CHAR(user_calendar_date, 'YYYY-MM-DD') AS user_calendar_date,
  TO_CHAR(user_calendar_time, 'HH24:MI:SS') AS user_calendar_time, -- 시간 포맷
  user_calendar_every, 
  user_calendar_memo, 
  user_calendar_list, 
  status 
FROM user_calendar 
WHERE user_no = $1 
AND created_at BETWEEN $2 AND $3;
      `,
      [user_no, startDate, endDate]
    );

    if (result.rows.length > 0) {
      res.json(result.rows); // 해당 날짜의 메모 반환
    } else {
      res.status(404).json({ message: '해당 날짜에 메모가 없습니다.' });
    }
  } catch (err) {
    console.error(err);
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
  updateAttendanceAndPoints,
  getAttendances,
  getMonthImage,
  getEvent,
  getAlarmsForUser,
};
