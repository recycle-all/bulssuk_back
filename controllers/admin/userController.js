const database = require('../../database/database');

// 모든 고객 정보 가져오기
exports.getUsers = async (req, res) => {
    try {
        const userResult = await database.query(
            'SELECT * FROM users WHERE status = true'
        );
        return res.status(200).json(userResult.rows);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};


// 특정 고객 정보 가져오기 
exports.getUser = async (req, res) => {
    const { user_no } = req.params;
    try {
        const userResult = await database.query(
            `SELECT * FROM users WHERE user_no = $1 AND status = true`, [user_no]
        );

        if (userResult.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json(userResult.rows[0]);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// 포인트 가져오기 
exports.getPoint = async(req,res) =>{
    try {
        const pointResult = await database.query(
            'SELECT * FROM point WHERE status = true'
        )
        return res.status(200).json(pointResult.rows)
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}


// 출석률 가져오기 
