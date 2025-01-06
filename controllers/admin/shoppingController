const database = require('../../database/database')

// 전체 상품 목록 다 가져오기
exports.getAllProducts = async(req, res) =>{
    try {
        const productResult = await database.query(
            `SELECT * FROM shopping`
        )
        return res.status(200).json(productResult.rows);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

// 각 상품의 정보 가져오기
exports.getProduct = async (req, res) => {
    const { shopping_no } = req.query; // req.body 대신 req.query로 변경
    try {
        const productResult = await database.query(
            `SELECT * FROM shopping WHERE shopping_no = $1`, [shopping_no]
        );

        // JSON.stringify를 사용해 JSON 데이터를 문자열로 변환 (필요시)
        const products = productResult.rows.map(product => ({
            ...product,
            shopping_content: JSON.stringify(product.shopping_content)
        }));

        return res.status(200).json(products);
    } catch (error) {
        return res.status(500).json({ error: error.message }); // 에러 처리
    }
};

exports.getPointForUser = async (req, res) =>{
    const {user_no} = req.query
    try {
        const pointResult = await database.query(
            `SELECT point_total FROM point WHERE user_no = $1 ORDER BY created_at DESC LIMIT 1`,[user_no]
        )
        return res.status(200).json(pointResult.rows);
    } catch (error) {
        return res.status(500).json({ error: error.message }); // 에러 처리
    }
}

exports.getUserCoupons = async (req, res) =>{
    const {user_no} = req.query
    try {
        const couponResult = await database.query(
            `SELECT * FROM user_coupon WHERE user_no = $1 AND status = true`,[user_no]
        )
        return res.status(200).json(couponResult.rows)
    } catch (error) {
        return res.status(500).json({ error: error.message }); // 에러 처리
    }
}
