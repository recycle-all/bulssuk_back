const database = require('../../database/database')
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs'); 
// 달에 해당하는 이미지 가져오기
exports.getMonth = async (req, res) => {
  const { month } = req.params; // month만 받음

  try {
    const query = `
      SELECT custom_month, custom_img
      FROM custom_img 
      WHERE custom_month = $1
    `;
    const result = await database.query(query, [month]);

    // 데이터가 없으면 빈 배열 반환
    if (result.rows.length === 0) {
      return res.status(200).json([]); // 빈 배열 반환
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching custom data:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};

  // 달력에 이벤트 추가
  exports.customDay = async (req, res) => {
    const { year, month } = req.params;
    const formattedMonth = `${year}-${month.padStart(2, '0')}`; // 예: 2024-12
  
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
  
      // UTC -> KST 변환
      const adjustedRows = result.rows.map(row => ({
        ...row,
        calendar_date: moment(row.calendar_date).tz('Asia/Seoul').format('YYYY-MM-DD'), // KST로 변환 후 YYYY-MM-DD 형식으로 반환
      }));
  
      res.status(200).json(adjustedRows);
    } catch (error) {
      console.error('Error fetching custom day data:', error.message);
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  };

// 월(Month) 이미지 등록
exports.putMonthImage = async (req, res) => {
  try {
    const { custom_month, admin_no } = req.body; // 요청 본문에서 custom_month와 admin_no 가져오기
    const imageFile = req.file; // 업로드된 파일 가져오기

    // 필수 데이터 확인
    console.log(custom_month);
    console.log(admin_no);
    if (!custom_month || !imageFile || !admin_no) {
      return res.status(400).json({ message: 'custom_month, admin_no와 이미지 파일이 필요합니다.' });
    }

    // 새 이미지 경로 설정
    const newImagePath = `/uploads/images/${imageFile.filename}`;

    // 업로드된 파일을 서버의 지정된 디렉토리로 이동
    const uploadDir = path.join(__dirname, '..', 'uploads', 'images');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const targetPath = path.join(uploadDir, imageFile.filename);
    fs.renameSync(imageFile.path, targetPath);

    // 현재 시간 설정
    const currentTime = new Date();

    // DB 삽입 쿼리 작성
    const query = `INSERT INTO custom_img (admin_no, custom_month, custom_img, created_at, updated_at, status) 
                   VALUES ($1, $2, $3, $4, $4, true) RETURNING custom_img_no`;
    const values = [
      admin_no, // 요청에서 전달된 admin_no 사용
      custom_month,
      newImagePath,
      currentTime,
    ];

    // 데이터베이스 쿼리 실행
    const result = await database.query(query, values);

    // 응답
    res.status(201).json({
      message: '이미지가 성공적으로 등록되었습니다.',
      data: { custom_img_no: result.rows[0].custom_img_no },
    });
  } catch (error) {
    console.error('Error registering month image:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};


  // 월(Month) 이미지 변경
  exports.changeMonthImage = async (req, res) => {
    try {
      const { custom_month } = req.body; // custom_month 가져오기
      const imageFile = req.file; // 업로드된 파일
  
      if (!custom_month || !imageFile) {
        return res.status(400).json({ message: 'custom_month와 이미지 파일이 필요합니다.' });
      }
      // 새 이미지 경로 설정
      const newImagePath = `/uploads/images/${imageFile.filename}`;
      // DB 업데이트 로직
      const query = `UPDATE custom_img SET custom_img = $1 WHERE custom_month = $2 RETURNING *`;
      const values = [newImagePath, custom_month];
      const result = await database.query(query, values);
      console.log(result);
      if (result.rowCount === 0) {
        return res.status(404).json({ message: '해당 월에 대한 데이터를 찾을 수 없습니다.' });
      }
  
      res.status(200).json({ message: '이미지가 성공적으로 변경되었습니다.', data: result.rows[0] });
    } catch (error) {
      console.error('Error updating month image:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  };
  
  // 이벤트 수정 
// 달력의 일(day) 데이터를 수정
exports.changeDay = async (req, res) => {
    try {
      const { manage_calendar_no, calendar_name, calendar_date, calendar_content } = req.body;
      const imageFile = req.file; // 업로드된 파일 (옵션)
  
      if (!manage_calendar_no || !calendar_name || !calendar_date) {
        return res.status(400).json({ message: 'manage_calendar_no, calendar_name, calendar_date는 필수입니다.' });
      }
  
      let query = `
        UPDATE manage_calendar 
        SET calendar_name = $1, calendar_date = $2, calendar_content = $3
      `;
      const values = [calendar_name, calendar_date, calendar_content];
  
      if (imageFile) {
        const newImagePath = `/uploads/images/${imageFile.filename}`;
        query += `, calendar_img = $4 WHERE manage_calendar_no = $5 RETURNING *`;
        values.push(newImagePath, manage_calendar_no); // 총 5개의 매개변수
      } else {
        query += ` WHERE manage_calendar_no = $4 RETURNING *`;
        values.push(manage_calendar_no); // 총 4개의 매개변수
      }
  
      // 데이터베이스 업데이트 실행
      const result = await database.query(query, values);
  
      if (result.rowCount === 0) {
        return res.status(404).json({ message: '해당 일 데이터를 찾을 수 없습니다.' });
      }
  
      res.status(200).json({ message: '이벤트가 성공적으로 수정되었습니다.', data: result.rows[0] });
    } catch (error) {
      console.error('이벤트 수정 중 오류 발생:', error.message);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  };
  
  // 새로운 이벤트 등록 
  exports.createDay = async (req, res) => {
    const { calendar_name, calendar_date, calendar_content } = req.body;
    const admin_no = req.body.admin_no; // 클라이언트로부터 admin_no를 받아옴
    const calendar_img = req.file ? req.file.path.replace(/\\/g, '/').replace('public/', '') : null;


    // 현재 시간을 KST로 설정
    const currentTime = moment().tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
  
    try {
      const query = `
        INSERT INTO manage_calendar (admin_no, calendar_name, calendar_date, calendar_content, calendar_img, created_at, updated_at, status)
        VALUES ($1, $2, $3, $4, $5, $6, $6, true)
        RETURNING manage_calendar_no
      `;
      const values = [admin_no, calendar_name, calendar_date, calendar_content, calendar_img, currentTime];
      const result = await database.query(query, values);
  
      res.status(201).json({ message: '이벤트가 성공적으로 생성되었습니다.', manage_calendar_no: result.rows[0].manage_calendar_no });
    } catch (error) {
      console.error('이벤트 생성 중 오류 발생:', error.message);
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  };


  // 일 이벤트 삭제(status=false)
  exports.deactivateDay = async (req, res) => {
    const { manage_calendar_no } = req.body;
  
    if (!manage_calendar_no) {
      return res.status(400).json({ message: 'manage_calendar_no가 필요합니다.' });
    }
  
    try {
      const query = `
        UPDATE manage_calendar
        SET status = false
        WHERE manage_calendar_no = $1
        RETURNING *;
      `;
  
      const { rows } = await database.query(query, [manage_calendar_no]);
  
      if (rows.length === 0) {
        return res.status(404).json({ message: '해당 이벤트를 찾을 수 없습니다.' });
      }
  
      res.status(200).json({ message: '이벤트가 비활성화되었습니다.', event: rows[0] });
    } catch (error) {
      console.error('이벤트 비활성화 중 오류 발생:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  };


