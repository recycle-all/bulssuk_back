const database = require('../../database/database')

// 대분류 가져오기
exports.getBigCategory = async (req, res) => {
    try {
        const categoryResult = await database.query(
            'SELECT * FROM categories WHERE status = true ORDER BY category_no'
        );
        return res.status(200).json(categoryResult.rows);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
  };

// 대분류 이름, 이미지 수정
exports.updateBigCategory = async (req, res) => {
  try {
      const category_no = req.body.category_no;
      const category_name = req.body.category_name;
      const category_img = req.file ? `/uploads/images/${req.file.filename}` : null;
      const updated_at = new Date();

      let query;
      let values;

      if (category_img) {
          query = `
              UPDATE categories
              SET category_name = $1, category_img = $2, updated_at = $3
              WHERE category_no = $4
              RETURNING *`;
          values = [category_name, category_img, updated_at, category_no];
      } else {
          query = `
              UPDATE categories
              SET category_name = $1, updated_at = $2
              WHERE category_no = $3
              RETURNING *`;
          values = [category_name, updated_at, category_no];
      }

      const categoryResult = await database.query(query, values);

      if (categoryResult.rowCount === 0) {
          return res.status(404).json({ error: 'Category not found' });
      }

      return res.status(200).json({
          message: 'Category updated successfully',
          data: categoryResult.rows[0],
      });
  } catch (error) {
      console.error('Error updating category:', error);
      return res.status(500).json({ error: error.message });
  }
};

  
// 대분류 새로 추가하기
exports.createBigCategory = async (req, res) => {
  try {
      const { category_name } = req.body;
      const category_img = req.file ? `/uploads/images/${req.file.filename}` : null;
      const created_at = new Date();
      const updated_at = new Date();

      const query = `
          INSERT INTO categories (category_name, category_img, created_at, updated_at, status)
          VALUES ($1, $2, $3, $4, true)
          RETURNING *`;

      const values = [category_name, category_img, created_at, updated_at];

      const categoryResult = await database.query(query, values);

      return res.status(201).json({
          message: 'Category created successfully',
          data: categoryResult.rows[0],
      });
  } catch (error) {
      console.error('Error creating category:', error);
      return res.status(500).json({ error: error.message });
  }
};


// 중분류 가져오기
exports.getMidCategory = async (req, res) => {
  try {
      const query = `
          SELECT 
              c.category_no,
              c.category_name,
              c.category_img,
              s.subcategory_no,
              s.subcategory_name
          FROM 
              categories c
          LEFT JOIN 
              subcategories s
          ON 
              c.category_no = s.category_no
          ORDER BY 
              c.category_no, s.subcategory_no;
      `;

      const result = await database.query(query);
      return res.status(200).json(result.rows);
  } catch (error) {
      return res.status(500).json({ error: error.message });
  }
};

// 중분류, 세부사항 수정
exports.updateMidCategory = async (req, res) => {
  try {
      const { subcategory_no, subcategory_name } = req.body;
      const updated_at = new Date();

      const subcategoryQuery = `
          UPDATE subcategories
          SET subcategory_name = $1, updated_at = $2
          WHERE subcategory_no = $3
          RETURNING *`;
      const subcategoryValues = [subcategory_name, updated_at, subcategory_no];
      const subcategoryResult = await database.query(subcategoryQuery, subcategoryValues);

      if (subcategoryResult.rowCount === 0) {
          return res.status(404).json({ error: 'Subcategory not found' });
      }

      return res.status(200).json({
          message: 'Subcategory updated successfully',
          subcategory: subcategoryResult.rows[0],
      });
  } catch (error) {
      console.error('Error updating subcategory:', error);
      return res.status(500).json({ error: error.message });
  }
};


// 중분류 (세부사항) 등록
exports.createMidCategory = async (req, res) => {
  try {
      const { category_no, subcategory_name } = req.body;
      const created_at = new Date();
      const updated_at = created_at;

      const subcategoryQuery = `
          INSERT INTO subcategories (category_no, subcategory_name, created_at, updated_at, status)
          VALUES ($1, $2, $3, $4, true)
          RETURNING subcategory_no`;
      const subcategoryValues = [category_no, subcategory_name, created_at, updated_at];
      console.log(subcategoryValues);
      const subcategoryResult = await database.query(subcategoryQuery, subcategoryValues);

      return res.status(201).json({
          message: 'Subcategory created successfully',
          subcategory: subcategoryResult.rows[0],
      });
  } catch (error) {
      console.error('Error creating subcategory:', error);
      res.status(500).json({ error: error.message });
  }
};


// 세부사항 가져오기 
// controllers/guide.js
exports.getGuideContent = async (req, res) => {
  const { subcategory_no } = req.params;

  try {
      const query = `
          SELECT guide_content, guide_img 
          FROM recycling_guide 
          WHERE subcategory_no = $1`;
      const result = await database.query(query, [subcategory_no]);

      if (result.rowCount === 0) {
          return res.status(404).json({ error: 'Guide content not found' });
      }

      res.status(200).json(result.rows[0]);
  } catch (error) {
      console.error('Error fetching guide content:', error);
      res.status(500).json({ error: error.message });
  }
};

  
  
// 대분류와 참조하는 모든 항목의 status를 Inactive로 변경하는 함수
exports.deactivateCategory = async (req, res) => {
  const { category_no } = req.params;

  try {
      await database.query('BEGIN');

      await database.query(
          `UPDATE categories SET status = false WHERE category_no = $1`,
          [category_no]
      );

      await database.query(
          `UPDATE subcategories SET status = false WHERE category_no = $1`,
          [category_no]
      );

      await database.query(
          `UPDATE recycling_guide 
           SET status = false 
           WHERE subcategory_no IN (
               SELECT subcategory_no FROM subcategories WHERE category_no = $1
           )`,
          [category_no]
      );

      await database.query('COMMIT');

      res.status(200).json({
          message: 'Category and all related items set to Inactive successfully.',
      });
  } catch (error) {
      await database.query('ROLLBACK');
      console.error('Error deactivating category:', error);
      res.status(500).json({ error: error.message });
  }
};


  // recycling_subcategory와 참조하는 recycling_guide의 status를 Inactive로 변경하는 함수
  exports.deactivateSubcategory = async (req, res) => {
    const { subcategory_no } = req.params;

    try {
        await database.query('BEGIN');

        await database.query(
            `UPDATE subcategories SET status = false WHERE subcategory_no = $1`,
            [subcategory_no]
        );

        await database.query(
            `UPDATE recycling_guide SET status = false WHERE subcategory_no = $1`,
            [subcategory_no]
        );

        await database.query('COMMIT');

        res.status(200).json({
            message: 'Subcategory and related recycling_guide set to Inactive successfully.',
        });
    } catch (error) {
        await database.query('ROLLBACK');
        console.error('Error deactivating subcategory:', error);
        res.status(500).json({ error: error.message });
    }
};

  
  
