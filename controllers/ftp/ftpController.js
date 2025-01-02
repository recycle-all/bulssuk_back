const ftp = require('basic-ftp');

exports.getImage = async (req, res) => {
  const { filename } = req.params;
  const client = new ftp.Client();

  try {
    await client.access({
      host: process.env.FTP_HOST, // 환경 변수에서 FTP 호스트 읽기
      user: process.env.FTP_USER, // 환경 변수에서 FTP 사용자 읽기
      password: process.env.FTP_PASSWORD, // 환경 변수에서 FTP 비밀번호 읽기
      secure: false,
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
