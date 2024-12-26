const database = require('../../database/database');
const dotenv = require('dotenv');
dotenv.config();

// 기업 사진, 이름 조회
const getCompanies = async (req, res) => {
  try {
    const query = `
      SELECT company_img, company_name
      FROM recycling_company
      WHERE status = true
    `;
    const { rows } = await database.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching company list:', error);
    res.status(500).json({ message: 'Error fetching company list' });
  }
};

// 기업 상세 조회
const getCompanyDetails = async (req, res) => {
  const { company_id } = req.params;

  try {
    // 기업 정보 조회
    const companyQuery = `
      SELECT company_img, company_name, company_content
      FROM recycling_company
      WHERE company_no = $1 AND status = true
    `;
    const companyResult = await database.query(companyQuery, [company_id]);

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // 기업 제품 정보 조회
    const productQuery = `
      SELECT product_img, product_name
      FROM company_product
      WHERE company_no = $1
    `;
    const productResult = await database.query(productQuery, [company_id]);

    res.status(200).json({
      company: companyResult.rows[0],
      products: productResult.rows,
    });
  } catch (error) {
    console.error('Error fetching company details:', error);
    res.status(500).json({ message: 'Error fetching company details' });
  }
};

module.exports = {
  getCompanies,
  getCompanyDetails,
};
