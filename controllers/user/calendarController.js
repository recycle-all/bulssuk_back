const database = require('../../database/database');
const dotenv = require('dotenv');
dotenv.config();

// 출석 체크 가져오기
const getAttendance = async (req, res) => {
  const { user_no } = req.params;

  try {
    const result = await database.query(
      'SELECT * FROM attendance WHERE user_no = $1 ORDER BY attendance_date DESC',
      [user_no]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// 출석 체크 업데이트
const updateAttendance = async (req, res) => {
  const { user_no } = req.body;
  console.log('Request Body:', req.body); // 요청 Body 확인
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // 오늘 날짜 (YYYY-MM-DD 형식)
    console.log('Today:', today); // 현재 날짜 확인

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

    const result = await database.query(
      'INSERT INTO attendance (user_no, attendance_date, status) VALUES ($1, $2, $3) RETURNING *',
      [user_no, today, true]
    );
    console.log('Insert Result:', result.rows);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// 알람 설정 추가
const addAlarm = async (req, res) => {
  const {
    user_no,
    user_calendar_name,
    user_calendar_every,
    user_calendar_memo,
    selected_date,
  } = req.body;
  try {
    // selected_date가 없으면 현재 날짜로 설정
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
    console.error(err);
    res.status(500).send('Server error');
  }
};

// 알람 리스트 가져오기
const getAlarms = async (req, res) => {
  const { user_no } = req.params; // URL의 user_no 파라미터
  const { selected_date } = req.body; // Body에서 selected_date 받기

  if (!user_no || !selected_date) {
    return res
      .status(400)
      .json({ message: 'user_no와 selected_date는 필수입니다.' });
  }

  try {
    // 선택된 날짜의 시작과 끝을 계산
    const startDate = new Date(`${selected_date}T00:00:00Z`); // 날짜 시작 (UTC 기준)
    const endDate = new Date(`${selected_date}T23:59:59Z`); // 날짜 끝 (UTC 기준)

    // 데이터베이스에서 날짜 범위로 필터링
    const result = await database.query(
      'SELECT * FROM user_calendar WHERE user_no = $1 AND created_at BETWEEN $2 AND $3',
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
};
