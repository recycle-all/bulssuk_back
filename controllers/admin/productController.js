const database = require('../../database/database')


//---------------------------------------------상품 판매-----------------------------------------//
// 모든 상품 가져오기 
exports.getAllProducts = async(req, res) =>{
    try {
        const productResult = await database.query(
            'SELECT * FROM company_product WHERE status = true ORDER BY product_no '
        );
        return res.status(200).json(productResult.rows)
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

// 기업에 해당하는 상품 가져오기 
exports.getCompanyProducts = async(req, res)=>{
    const { company_no } = req.params
    try {
        const productResult = await database.query(
            `SELECT * FROM company_product WHERE company_no = $1 AND status = true`, [company_no]
        )
        if (productResult.rowCount ===0){
            return res.status(404).json({error: "There's no products for this company"})
        }
        return res.status(200).json(productResult.rows)
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

// 각 상품 정보 가져오기 
exports.getProduct = async(req, res) =>{
    const {product_no} = req.params
    try {
        const productResult = await database.query(
            `SELECT * FROM company_product WHERE product_no = $1 AND status = true`, [product_no]
        )
        if (productResult.rowCount === 0){
            return res.status(404).json({error: 'Product not found'})
        }
        return res.status(200).json(productResult.rows[0])
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

// 특정 상품 정보 수정하기
exports.updateProduct = async (req, res) => {
    try {
        const { product_no , product_name, product_content } = req.body;
        const updated_at = new Date();
        const imageFile = req.file;

        // 필수 값 검증
        if (!product_no || !product_name || !product_content) {
            return res.status(400).json({ message: 'product_no, product_name, product_content 필수입니다.' });
        }

        // 기본 쿼리 및 매개변수
        let query = `
        UPDATE company_product
        SET product_name = $1, product_content = $2, updated_at = $3
        `;
        const values = [product_name, product_content, updated_at];

        // 이미지 파일 처리
        if (imageFile) {
            const newImagePath = `/uploads/images/${imageFile.filename}`;
            query += `, product_img = $4 WHERE product_no = $5 RETURNING *`;
            values.push(newImagePath, product_no);
        } else {
            query += `WHERE product_no = $4 RETURNING *`;
            values.push(product_no);
        }

        // 디버깅 로그
        console.log('Generated Query:', query);
        console.log('Values:', values);

        // 쿼리 실행
        const result = await database.query(query, values);

        // 결과 처리
        if (result.rowCount === 0) {
            return res.status(404).json({ message: '해당 상품 데이터를 찾을 수 없습니다' });
        }

        res.status(200).json({
            message: '상품 정보가 성공적으로 수정되었습니다.',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('상품 수정 중 오류 발생:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
};

// 새로운 상품 등록 
exports.createProduct = async (req, res) =>{
    const {company_no, product_name, product_content} = req.body
    const product_img = req.file ? req.file.path.replace(/\\/g, '/').replace('public/', '') : null;
    const created_at = new Date(); // 현재 시간 추가
    try {
        const query = `
        INSERT INTO company_product (company_no, product_name, product_img, product_content, created_at, updated_at, status )
        VALUES ($1, $2, $3, $4, $5, $5, true)
        RETURNING product_no`
        const values = [company_no, product_name, product_img, product_content, created_at]
        const result = await database.query(query, values)

        res.status(201).json({
            message: '상품이 성공적으로 등록되었습니다.', 
            product_no: result.rows[0].product_no 
        })
    } catch (error) {
        console.error('상품 생성 중 오류 발생:', error.message);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
} 

// 상품 삭제(비활성화)하기
exports.deactivateProduct = async (req, res)=>{
    const { product_no } = req.body
    if (!product_no){
        return res.status(400).json({ message: 'product_no가 필요합니다.' });
    }
    try {
        const query= `
        UPDATE company_product
        SET status = false
        WHERE product_no = $1
        RETURNING *`

        const { rows } = await database.query(query, [product_no])

        if(rows.length === 0){
            return res.status(404).json({message: '해당 상품을 찾을 수 없습니다.'})
        }

        res.status(200).json({message: '상품이 비활성화되었습니다', event:rows[0]})
    } catch (error) {
        console.error('상품 비활성화 중 오류 발생:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
}
