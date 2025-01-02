const database = require('../../database/database');
const ftp = require('basic-ftp');

exports.getImage = async (req, res) => {
  const { filename } = req.params;
  const client = new ftp.Client();

  try {
    await client.access({
      host: process.env.FTP_HOST, // 환경 변수에서 FTP 호스트 읽기
      user: process.env.FTP_USER, // 환경 변수에서 FTP 사용자 읽기
      password: process.env.FTP_PASSWORD, // 환경 변수에서 FTP 비밀번호 읽기
    });

    // FTP에서 파일을 스트림으로 가져와 클라이언트로 직접 전송
    res.setHeader('Content-Type', 'image/jpeg'); // MIME 타입 설정 (필요시 변경)
    await client.downloadTo(res, `/images/${filename}`); // 파일을 클라이언트로 스트리밍
  } catch (err) {
    console.error('FTP Error:', err);
    res.status(500).send('Error retrieving file');
  } finally {
    client.close(); // FTP 클라이언트 닫기
  }
};

exports.createVote = async (req, res) => {
  const { vote_result, img_url } = req.body;

  if (!vote_result || !img_url) {
    return res
      .status(400)
      .json({ message: 'vote_result and img_url are required' });
  }

  try {
    // 데이터 삽입
    await database.query(
      `INSERT INTO votes (vote_result, img_url) VALUES ($1, $2)`,
      [vote_result, img_url]
    );

    // 방금 삽입한 데이터를 확인
    const result = await database.query(
      `SELECT * FROM votes WHERE vote_result = $1 AND img_url = $2 ORDER BY created_at DESC LIMIT 1`,
      [vote_result, img_url]
    );

    res.status(200).json(result.rows[0]); // 방금 삽입한 데이터 반환
  } catch (err) {
    console.error('Error creating vote:', err);
    res.status(500).json({ message: 'Error creating vote' });
  }
};

// Votes 데이터 조회
exports.getVotes = async (req, res) => {
  try {
    const result = await database.query(
      `SELECT * FROM votes WHERE status=true`
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching votes:', err);
    res.status(500).json({ message: 'Error fetching votes' });
  }
};
