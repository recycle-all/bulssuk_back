const database = require('../../database/database')
const bcrypt = require('bcrypt');

// 회원가입 함수
exports.signUp = async (req, res) => {
  try {
      const {
          admin_id,
          admin_pw,
          admin_email,
          admin_name,
          admin_phone,
      } = req.body;
 
      // 비밀번호 해싱
      const salt = await bcrypt.genSalt(10);
      
      const hash = await bcrypt.hash(admin_pw, salt);

      // 현재 시간 설정
      const currentTime = new Date();

      // 관리자 정보 삽입 및 admin_no 반환
      const adminResult = await database.query(
          `INSERT INTO admins 
          (admin_id, admin_pw, admin_email, admin_name, admin_phone, created_at, updated_at) 
          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING admin_no`,
          [
              admin_id,
              hash,
              admin_email,
              admin_name,
              admin_phone,
              currentTime,
              currentTime,
          ]
      );
      
      const admin_no = adminResult.rows[0].admin_no;
   
      res.status(201).json({
          message: "회원 가입을 완료하였습니다.",
          admin_no,
      });
  } catch (error) {
      console.log(admin_no);
      console.log(admin_name);
      console.error("Error inserting data:", error.message);
      res.status(500).json({ error: error.message });
  }
};

  
  // 로그인 함수
  exports.allLogin = async (req, res) => {
    try {
      const { admin_id, admin_pw } = req.body;
  
      // 관리자 정보 확인 (활성 상태 계정만 선택)
      const result = await database.query(
        `SELECT * FROM admins WHERE admin_id = $1 AND status = true`,
        [admin_id]
      );
  
      if (result.rows.length === 0) {
        return res.status(400).json({ message: "존재하지 않거나 비활성화된 아이디입니다." });
      }
  
      const admin = result.rows[0];
      
      // 비밀번호 확인
      const isMatch = await bcrypt.compare(admin_pw, admin.admin_pw);
      if (!isMatch) {
        return res.status(401).json({ message: "비밀번호가 일치하지 않습니다." });
      }
  
      res.status(200).json({ message: "로그인 성공!", admin_id: admin.admin_id, admin_name: admin.admin_name, admin_no: admin.admin_no, admin_email: admin.admin_email });
    } catch (error) {
      console.error("Login error:", error.message);
      res.status(500).json({ error: error.message });
    }
};

  
  // 로그아웃 함수
  exports.allLogout = async (req, res) => {
    const { userType } = req.body;
  
    // 쿠키 삭제
    res.clearCookie("isLoggedIn");
  
    let message = "로그아웃 되었습니다.";
    if (userType === "customer") {
      message = "고객님, 로그아웃 되었습니다.";
    } else if (userType === "dealer") {
      message = "딜러님, 로그아웃 되었습니다.";
    } else if (userType === "admin") {
      message = "관리자님, 로그아웃 되었습니다.";
    }
  
    return res.json({ message });
  };
  


  