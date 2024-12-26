const database = require('../../database/database');
const dotenv = require('dotenv');
dotenv.config();

// 대분류 데이터
const getCategories = async (req, res) => {
  try {
    const categories = await database.query('SELECT * FROM categories');
    res.json(categories.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// 중분류 데이터
const getSubcategories = async (req, res) => {
  const { category_id } = req.params;
  try {
    const subcategories = await database.query(
      'SELECT * FROM subcategories WHERE category_no = $1',
      [category_id]
    );
    res.json(subcategories.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// 가이드 데이터
const getGuideDetails = async (req, res) => {
  const { subcategory_id } = req.params;
  try {
    const guide = await database.query(
      'SELECT * FROM recycling_guide WHERE subcategory_no = $1',
      [subcategory_id]
    );
    res.json(guide.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getCategories,
  getSubcategories,
  getGuideDetails,
};
