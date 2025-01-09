const database = require('../../database/database')

// 전체 상품 목록 다 가져오기
exports.getAllProducts = async(req, res) =>{
    try {
        const productResult = await database.query(
            `SELECT * FROM shopping ORDER BY shopping_no ASC`
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

// 상품에 해당하는 기업 이름 가져오기
exports.getCompanyName = async (req, res) => {
    const { shopping_title } = req.query;
  
    if (!shopping_title) {
      return res.status(400).json({ error: 'shopping_title is required' });
    }
  
    try {
      // Step 1: shopping_title과 같은 product_name의 company_no 찾기
      const productQuery = `
        SELECT company_no
        FROM company_product
        WHERE product_name = $1
      `;
      const productResult = await database.query(productQuery, [shopping_title]);
  
      if (productResult.rows.length === 0) {
        return res.status(404).json({ error: 'No matching company found' });
      }
  
      const companyNo = productResult.rows[0].company_no;
  
      // Step 2: company_no를 이용해 recycling_company에서 company_name 가져오기
      const companyQuery = `
        SELECT company_name
        FROM recycling_company
        WHERE company_no = $1
      `;
      const companyResult = await database.query(companyQuery, [companyNo]);
  
      if (companyResult.rows.length === 0) {
        return res.status(404).json({ error: 'No company_name found for the given company_no' });
      }
  
      const companyName = companyResult.rows[0].company_name;
      return res.status(200).json({ company_name: companyName });
    } catch (error) {
      console.error('Error fetching company name:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  // 상품에 해당하는 포인트 가져오기 
  exports.getProductPoint = async (req, res) => {
    const { product_name } = req.query;
  
    if (!product_name) {
      return res.status(400).json({ error: 'product_name is required' });
    }
  
    try {
      // Step 1: product_name과 같은 shopping_title의 shopping_point 찾기
      const shoppingQuery = `
        SELECT shopping_title, shopping_point
        FROM shopping
        WHERE shopping_title = $1
      `;
      const shoppingResult = await database.query(shoppingQuery, [product_name]);
  
      if (shoppingResult.rows.length === 0) {
        return res.status(404).json({ error: 'No matching shopping_point found' });
      }
  
      const shoppingData = shoppingResult.rows[0];
      return res.status(200).json({
        product_name: shoppingData.shopping_title, // 동일한 product_name 반환
        shopping_point: shoppingData.shopping_point, // 포인트 정보 반환
      });
    } catch (error) {
      console.error('Error fetching shopping point:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
  
