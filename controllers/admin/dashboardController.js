const database = require('../../database/database')

// 모든 유저 수 카운트
exports.countUsers = async(req, res) =>{
    try {
        const countResult = await database.query(
            'SELECT COUNT(*) AS total_active_users FROM users WHERE status = true'
        )
        return res.status(200).json(countResult.rows[0].total_active_users)
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}