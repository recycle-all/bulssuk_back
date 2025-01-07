const database = require('../../database/database');
const FTPClient = require('ftp');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const ftpConfig = {
  host: '222.112.27.120',
  user: 'suddenly',
  password: 'suddenly',
};

// 투표 업로드
const uploadVote = async (req, res) => {
  try {
    const { vote_result, img_url } = req.body;
    const createdAt = new Date();
    const status = true;

    // 초기 투표 카운트와 옵션 설정
    const voteOptions = ['plastic', 'glass', 'metal'];
    const initialVoteCount = { plastic: 0, glass: 0, metal: 0 };
    console.log('Uploading vote:', { vote_result, img_url });

    // 데이터베이스에 저장
    const result = await database.query(
      `INSERT INTO votes (vote_result, img_url, created_at, status, option, vote_count)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        vote_result,
        img_url,
        createdAt,
        status,
        voteOptions.join(','),
        initialVoteCount,
      ]
    );

    res.status(200).json({
      message: 'Vote uploaded successfully',
    });
  } catch (error) {
    console.error('Error in uploadVote:', error.message);
    res.status(500).json({ message: 'Error uploading vote' });
  }
};

// 투표 결과 업데이트
const updateVote = async (req, res) => {
  try {
    const { user_no, vote_no, option } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // 사용자가 이미 투표했는지 확인
    const existingVote = await database.query(
      'SELECT * FROM user_votes WHERE user_no = $1 AND vote_no = $2',
      [user_no, vote_no]
    );

    if (existingVote.rows.length > 0) {
      return res.status(400).json({ message: '이미 투표 하였습니다.' });
    }

    // 사용자가 오늘 투표한 횟수 확인
    const voteCountResult = await database.query(
      `SELECT COUNT(*) AS vote_count
       FROM user_votes
       WHERE user_no = $1 AND vote_date = CURRENT_DATE`,
      [user_no]
    );

    const voteCount = parseInt(voteCountResult.rows[0].vote_count, 10);

    if (voteCount >= 10) {
      return res
        .status(400)
        .json({ message: '하루 투표 제한(10회)을 초과했습니다.' });
    }
    // 현재 투표 데이터 조회
    const voteData = await database.query(
      'SELECT vote_count FROM votes WHERE vote_no = $1',
      [vote_no]
    );

    if (voteData.rows.length === 0) {
      return res.status(404).json({ message: 'Vote not found' });
    }

    // 투표 카운트 업데이트
    const currentVoteCount = voteData.rows[0].vote_count;
    if (!currentVoteCount.hasOwnProperty(option)) {
      return res.status(400).json({ message: 'Invalid vote option' });
    }

    currentVoteCount[option] += 1;

    // 최다 투표된 옵션 계산
    const updatedResult = Object.keys(currentVoteCount).reduce((a, b) =>
      currentVoteCount[a] > currentVoteCount[b] ? a : b
    );

    // 데이터베이스 업데이트
    await database.query(
      `UPDATE votes
       SET vote_count = $1, vote_result = $2
       WHERE vote_no = $3`,
      [currentVoteCount, updatedResult, vote_no]
    );

    // 사용자 투표 기록 추가
    await database.query(
      `INSERT INTO user_votes (user_no, vote_no, option, vote_date)
       VALUES ($1, $2, $3, $4)`,
      [user_no, vote_no, option, today]
    );

    // 포인트 지급 (투표당 10포인트 지급)
    const pointAmount = 10;
    const pointReason = '투표 참여 보상';

    // 총 포인트 계산
    const { rows: totalPointsRow } = await database.query(
      `SELECT COALESCE(SUM(point_amount), 0) AS total_points
       FROM point
       WHERE user_no = $1`,
      [user_no]
    );

    const totalPoints =
      parseInt(totalPointsRow[0].total_points, 10) + pointAmount;

    // 포인트 테이블에 기록 추가
    await database.query(
      `INSERT INTO point (user_no, point_status, point_amount, point_total, point_reason, created_at, status)
       VALUES ($1, 'ADD', $2, $3, $4, NOW(), true)`,
      [user_no, pointAmount, totalPoints, pointReason]
    );

    res.status(200).json({
      message: '투표 완료',
      vote_result: updatedResult,
      daily_vote_count: voteCount,
      points_earned: pointAmount,
      total_points: totalPoints,
    });
  } catch (error) {
    console.error('Error in updateVote:', error.message);
    res.status(500).json({ message: 'Error updating vote' });
  }
};

const userVote = async (req, res) => {
  try {
    const { page = 1, limit = 10, user_no } = req.query;
    const offset = (page - 1) * limit;
    console.log(user_no);

    const result = await database.query(
      `SELECT 
         v.vote_no, 
         v.vote_result, 
         v.img_url, 
         v.vote_count, 
         v.created_at, 
         v.status, 
         EXISTS (
           SELECT 1 FROM user_votes uv 
           WHERE uv.vote_no = v.vote_no AND uv.user_no = $1
         ) AS user_voted,
         CASE 
           WHEN v.created_at <= NOW() - INTERVAL '7 days' THEN true 
           ELSE false 
         END AS expired
       FROM votes v
       WHERE v.status = true
       ORDER BY v.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user_no, limit, offset]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching votes:', error.message);
    res.status(500).json({ message: 'Error fetching votes' });
  }
};

// FTP에서 파일 읽기 함수
const fetchFTPFile = (filePath, res) => {
  const client = new FTPClient();
  client.on('ready', () => {
    client.get(filePath, (err, stream) => {
      if (err) {
        console.error('Error fetching file from FTP:', err.message);
        res.status(500).json({ message: 'Error fetching file from FTP' });
        client.end();
        return;
      }

      // 스트림을 클라이언트로 전송
      res.setHeader('Content-Type', 'image/jpeg'); // MIME 타입 설정
      stream.pipe(res);
      stream.on('end', () => {
        client.end(); // 연결 종료
      });
    });
  });

  client.connect(ftpConfig);
};

// 사진 제공 API
const getImage = (req, res) => {
  const { filename } = req.params; // 요청에서 파일명 가져오기
  // const filePath = path.join('img', filename); // FTP 디렉터리와 파일명 조합
  // const filePath = `img/${filename}`; // 슬래시로 직접 경로 조합
  const filePath = `D/FTP/suddenly/img/${filename}`; // 슬래시로 직접 경로 조합

  console.log(`Fetching image: ${filePath}`);
  fetchFTPFile(filePath, res); // FTP에서 파일 가져오기
};

module.exports = { uploadVote, userVote, getImage, updateVote };
