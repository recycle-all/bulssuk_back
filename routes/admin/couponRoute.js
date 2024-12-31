const database = require('../../database/database')

// 쿠폰 모든 정보 가져오기
exports.getCoupons = async(req, res) =>{
    try {
        const couponResult = await database.query(
            'SELECT * FROM coupon_management WHERE status = true'
        )
        return res.status(200).json(couponResult.rows)
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

// 각 쿠폰 정보 가져오기
exports.getCoupon = async(req, res) =>{
    const {coupon_no} = req.params
    try {
        const couponResult = await database.query(
            'SELECT * FROM coupon_management WHERE coupon_no = $1 AND status = true', [coupon_no]
        )
        return res.status(200).json(couponResult.rows)
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

// 쿠폰 수정
exports.updateCoupon = async (req, res) => {

    try {
        const { coupon_no, coupon_name, coupon_type, coupon_quantity, expiration_date, admin_no } = req.body;
        const updated_at = new Date();
        const imageFile = req.file; // 이미지 파일 처리

        console.log('Request Body:', req.body);
        console.log('Uploaded File:', req.file);
        // 필수 값 검증
        if (!coupon_no || !admin_no) {
            return res.status(400).json({ message: 'coupon_no와 admin_no는 필수입니다.' });
        }

        // 기본 쿼리와 매개변수
        let query = `
        UPDATE coupon_management
        SET updated_at = $1, admin_no = $2
        `;
        const values = [updated_at, admin_no];

        // 동적으로 업데이트할 필드를 추가
        if (coupon_name) {
            query += `, coupon_name = $${values.length + 1}`;
            values.push(coupon_name);
        }
        if (coupon_type) {
            query += `, coupon_type = $${values.length + 1}`;
            values.push(coupon_type);
        }
        if (coupon_quantity) {
            query += `, coupon_quantity = $${values.length + 1}`;
            values.push(coupon_quantity);
        }
        if (expiration_date) {
            query += `, expiration_date = $${values.length + 1}`;
            values.push(expiration_date);
        }

        // 이미지 파일 처리
        if (imageFile) {
            const newImagePath = `/uploads/images/${imageFile.filename}`;
            query += `, coupon_img = $${values.length + 1}`;
            values.push(newImagePath);
        }

        // WHERE 절 추가
        query += ` WHERE coupon_no = $${values.length + 1} RETURNING *`;
        values.push(coupon_no);

        // 디버깅 로그
        console.log('Generated Query:', query);
        console.log('Values:', values);

        // 데이터베이스 쿼리 실행
        const result = await database.query(query, values);

        // 결과 처리
        if (result.rowCount === 0) {
            return res.status(404).json({ message: '해당 쿠폰 데이터를 찾을 수 없습니다.' });
        }

        res.status(200).json({
            message: '쿠폰 정보가 성공적으로 수정되었습니다.',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('쿠폰 수정 중 오류 발생:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
};

// 쿠폰 새로 등록
exports.CreateCoupon = async (req, res) => {
    try {
        const { admin_no, coupon_name, coupon_type, coupon_quantity, expiration_date, status } = req.body;
        const created_at = new Date();
        const updated_at = new Date();
        const imageFile = req.file; // 이미지 파일 처리

        // 필수 값 검증
        if (!admin_no || !coupon_name || !coupon_type || !coupon_quantity || !expiration_date ) {
            return res.status(400).json({ message: 'admin_no, coupon_name, coupon_type, coupon_quantity, expiration_date는 필수입니다.' });
        }

        // 이미지 파일 경로 처리
        const coupon_img = imageFile ? `/uploads/images/${imageFile.filename}` : null;

        // SQL 쿼리
        const query = `
        INSERT INTO coupon_management (
            admin_no, 
            coupon_name, 
            coupon_type, 
            coupon_quantity, 
            expiration_date, 
            created_at, 
            updated_at, 
            coupon_img
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`;

        const values = [
            admin_no, 
            coupon_name, 
            coupon_type, 
            coupon_quantity, 
            expiration_date, 
            created_at, 
            updated_at, 
            coupon_img
        ];

        // 데이터베이스 쿼리 실행
        const result = await database.query(query, values);

        // 결과 반환
        res.status(201).json({
            message: '새로운 쿠폰이 성공적으로 등록되었습니다.',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('쿠폰 등록 중 오류 발생:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
};
// 쿠폰 삭제(비활성화)
exports.deactivateCoupon = async (req, res) =>{
    const {coupon_no} = req.body
    if(!coupon_no){
        return res.status(400).json({
            message:'coupon_no가 필요합니다.'
        })
    }

    try {
        const query = `
        UPDATE coupon_management SET status = false WHERE coupon_no = $1 RETURNING *` 

        const {rows} = await database.query(query, [coupon_no])

        if(rows.length === 0){
            return res.status(404).json({message: '해당 쿠폰을 찾을 수 없습니다.'})
        }
        res.status(200).json({message: '쿠폰이 비활성화되었습니다.', event: rows[0]})
    } catch (error) {
        console.error('쿠폰 비활성화 중 오류 발생:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
}
