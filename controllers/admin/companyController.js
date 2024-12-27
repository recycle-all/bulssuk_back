const database = require('../../database/database')

//---------------------------------------------기업 정보-----------------------------------------//
// 모든 기업 정보 가져오기
exports.getCompanies = async(req, res) =>{
    try {
        const companyResult = await database.query(
            'SELECT * FROM recycling_company WHERE status = true ORDER BY company_no'
        );
        return res.status(200).json(companyResult.rows)
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

// 특정 기업 정보 가져오기 
exports.getCompany = async(req, res) =>{
    const {company_no} = req.params
    try {
        const companyResult = await database.query(
            `SELECT * FROM recycling_company WHERE company_no = $1 AND status = true`, [company_no]
        )
        if (companyResult.rowCount === 0){
            return res.status(404).json({error: 'Company not found'})
        }
        return res.status(200).json(companyResult.rows[0])
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

// 특정 기업 정보 수정
exports.updateCompany = async (req, res) => {
    try {
        const { company_no, company_name, company_content } = req.body;
        const updated_at = new Date();
        const imageFile = req.file;

        // 필수 값 검증
        if (!company_no || !company_name || !company_content) {
            return res.status(400).json({ message: 'company_no, company_name, company_content는 필수입니다.' });
        }

        // 기본 쿼리 및 매개변수
        let query = `
        UPDATE recycling_company
        SET company_name = $1, company_content = $2, updated_at = $3
        `;
        const values = [company_name, company_content, updated_at];

        // 이미지 파일 처리
        if (imageFile) {
            const newImagePath = `/uploads/images/${imageFile.filename}`;
            query += `, company_img = $4 WHERE company_no = $5 RETURNING *`;
            values.push(newImagePath, company_no);
        } else {
            query += `WHERE company_no = $4 RETURNING *`;
            values.push(company_no);
        }

        // 디버깅 로그
        console.log('Generated Query:', query);
        console.log('Values:', values);

        // 쿼리 실행
        const result = await database.query(query, values);

        // 결과 처리
        if (result.rowCount === 0) {
            return res.status(404).json({ message: '해당 기업 데이터를 찾을 수 없습니다' });
        }

        res.status(200).json({
            message: '기업 정보가 성공적으로 수정되었습니다.',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('기업 수정 중 오류 발생:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
};


// 새로운 기업 등록
exports.createCompany = async (req, res) =>{
    const {company_name, company_content} = req.body
    const admin_no = req.body.admin_no // 클라이언트로부터 admin_no 받기
    const company_img = req.file ? req.file.path.replace(/\\/g, '/').replace('public/', '') : null;
    const created_at = new Date(); // 현재 시간 추가
    try {
        const query = `
        INSERT INTO recycling_company (admin_no, company_name, company_img, company_content, created_at, updated_at, status )
        VALUES ($1, $2, $3, $4, $5, $5, true)
        RETURNING company_no`
        const values = [admin_no, company_name, company_img, company_content, created_at]
        const result = await database.query(query, values)

        res.status(201).json({message: '기업이 성공적으로 등록되었습니다.', company_no: result.rows[0].company_no })
    } catch (error) {
        console.error('이벤트 생성 중 오류 발생:', error.message);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
} 

// 기업 삭제 이벤트
exports.deactivateCompany = async (req, res)=>{
    const { company_no } = req.body
    if (!company_no){
        return res.status(400).json({ message: 'company_no가 필요합니다.' });
    }
    try {
        const query= `
        UPDATE recycling_company
        SET status = false
        WHERE company_no = $1
        RETURNING *`

        const { rows } = await database.query(query, [company_no])

        if(rows.length === 0){
            return res.status(404).json({message: '해당 기업을 찾을 수 없습니다.'})
        }

        res.status(200).json({message: '기업이 비활성화되었습니다', event:rows[0]})
    } catch (error) {
        console.error('기업 비활성화 중 오류 발생:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
}


