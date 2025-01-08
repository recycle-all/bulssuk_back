const database = require('../../database/database')

exports.getAllvotes = async (req, res) =>{
    try {
        const voteResult = await database.query(
            `SELECT * FROM votes WHERE status = true`
        )
        return res.status(200).json(voteResult.rows)
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
