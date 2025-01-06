const database = require('../../database/database')

///////////////////////////////////////////////////나무//////////////////////////////////////////////////
// 모든 나무 레벨 정보 가져오기 
exports.getAllTrees = async(req,res) =>{
    try {
        const treeResult = await database.query(`SELECT * FROM tree_info WHERE status = true`)
        return res.status(200).json(treeResult.rows); 
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

// 각 나무 정보 가져오기
exports.getTree = async (req, res) =>{
    const {tree_info_no} = req.body
    try {
        const treeResult = await database.query(
            `SELECT * FROM tree_info WHERE tree_info_no = $1 AND status = true`, [tree_info_no]
        )
        return res.status(200).json(treeResult.rows)
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
// 각 나무 정보 수정하기
exports.UpdateTree = async(req, res) =>{
    try {
        const {tree_info_no, admin_no, tree_info, tree_content, tree_level} = req.body
        const updated_at = new Date();
        const imageFile = req.file;
        console.log('File:', req.file); // 업로드된 파일 정보 확인
        console.log('Body:', req.body); // 기타 요청 데이터 확인
    // 필수 값 검증
    if (!tree_info_no || !admin_no || !tree_info || !tree_content || !tree_level) {
        return res.status(400).json({message: 'tree_info_no, admin_no, tree_content, tree_level은 필수입니다.'})
    }

    // 기본 쿼리 및 매개변수
    let query = `
    UPDATE tree_info 
    SET admin_no = $1, tree_info = $2,tree_content = $3, tree_level = $4, updated_at = $5
    `;

    const values = [admin_no, tree_info, tree_content, tree_level, updated_at]

    // 이미지 파일 처리
    if (imageFile) {
        const newImagePath = `/uploads/images/${imageFile.filename}`;
        query += `, tree_img = $6 WHERE tree_info_no = $7 RETURNING *`
        values.push(newImagePath, tree_info_no)
    } else {
        query += `WHERE tree_info_no = $6 RETURNING *`;
        values.push(tree_info_no)
    }

    // 디버깅 로그
    console.log('Generated Query:', query);
    console.log('Values:', values);

    // 쿼리 실행
    const result = await database.query(query, values)

    // 결과 처리 
    if (result.rowCount === 0) {
        return res.status(404).json({message: '해당 나무 데이터를 찾을 수 없습니다'})
    }

    res.status(200).json({
        message: '나무 정보가 성공적으로 수정되었습니다.',
        data: result.rows[0]
    })
    } catch (error) {
        console.error('나무 수정 중 오류 발생:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
}
// 나무 정보 새로 등록하기
exports.createTree = async (req, res) =>{
    const { tree_info, tree_content, tree_level  } = req.body
    console.log('Body:', req.body); // 요청 데이터 디버깅
    const admin_no = req.body.admin_no
    const tree_img = req.file ? req.file.path.replace(/\\/g, '/').replace('public', '') : null;
    const created_at = new Date();

    try {
        const query = `
        INSERT INTO tree_info (admin_no, tree_info, tree_content, tree_img, tree_level, created_at, updated_at, status )
        VALUES ($1, $2, $3, $4, $5, $6, $6, true)
        RETURNING tree_info_no`
        const values = [admin_no, tree_info, tree_content, tree_img, tree_level, created_at]
        const result = await database.query(query, values)

        res.status(201).json({message: '나무가 성공적으로 등록되었습니다.', tree_info_no: result.rows[0].tree_info_no})
    } catch (error) {
        console.error('나무 생성 중 오류 발생:', error.message);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
}
// 나무 삭제(비활성화)하기
exports.deactivateTree = async(req, res) =>{
    const {tree_info_no} = req.body
    if (!tree_info_no){
        return res.status(400).json({message: 'tree_info_no가 필요합니다.'})
    }
    try {
        const query = `
        UPDATE tree_info
        SET status = false
        WHERE tree_info_no = $1
        RETURNING *`

        const { rows } = await database.query(query, [tree_info_no])

        if(rows.length === 0 ){
            return res.status(404).json({message: '해당 나무를 찾을 수 없습니다. '})
        }

        res.status(200).json({message: '나무가 비활성화되었습니다', event:rows[0]})
    } catch (error) {
        console.error('나무 비활성화 중 오류 발생:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
}

///////////////////////////////////////////////////기능//////////////////////////////////////////////////
// 모든 기능 정보 가져오기
exports.getAllFunctions = async (req,res) =>{
    try {
        const functionResult = await database.query(`SELECT * FROM tree_manage WHERE status = true`)
        return res.status(200).json(functionResult.rows); 
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
// 각 기능 정보 가져오기
exports.getFunction = async (req, res) =>{
    try {
        const { tree_manage_no } = req.body
        const functionResult = await database.query(`SELECT * FROM tree_manage WHERE tree_manage_no = $1 AND status = true`,[tree_manage_no])
        return res.status(200).json(functionResult.rows)
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
// 각 기능 정보 수정하기
exports.updateFunction = async (req, res) =>{
    try {

        const {tree_manage_no, admin_no, tree_manage, manage_points} = req.body
        const updated_at = new Date();
        const imageFile = req.file;
    // 필수값 검증
    if (!tree_manage_no || !admin_no || !tree_manage || !manage_points){
        return res.status(400).json({meesage: 'tree_manange_no, admin_no, tree_manage, manage_points는 필수입니다. '})
    }


    // 기본 쿼리 및 매개변수
    let query = `
    UPDATE tree_manage
    SET admin_no = $1, tree_manage = $2, manage_points = $3, updated_at = $4
    `;

    const values = [admin_no, tree_manage, manage_points, updated_at]

    // 이미지 파일 처리 
    if (imageFile) {
        const newImagePath = `/uploads/images/${imageFile.filename}`;
        query += `, manage_img = $5 WHERE tree_manage_no = $6 RETURNING *`
        values.push(newImagePath, tree_manage_no)
    } else {
        query += `WHERE tree_manage_no = $5 RETURNING *`;
        values.push(tree_manage_no)
    }

    // 쿼리 실행
    const result = await database.query(query, values)

    // 결과 처리
    if (result.rowCount === 0){
        return res.status(404).json({message: '해당 기능 데이터를 찾을 수 없습니다. '})
    }

    res.status(200).json({
        message: '기능 정보가 성공적으로 수정되었습니다.',
        data: result.rows[0]
    })
    } catch (error) {
        console.error('기능 수정 중 오류 발생:', error.message);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
}

// 기능 정보 새로 등록하기  
exports.createFunction = async (req, res) =>{
    const {tree_manage, manage_points} = req.body
    const admin_no = req.body.admin_no
    const manage_img = req.file ? req.file.path.replace(/\\/g, '/').replace('public', '') : null;
    const created_at = new Date();

    try {
        const query = `
        INSERT INTO tree_manage (admin_no, tree_manage, manage_points, manage_img, created_at, updated_at, status)
        VALUES ($1, $2, $3, $4, $5, $5, true)
        RETURNING tree_manage_no`
        const values = [admin_no, tree_manage, manage_points, manage_img, created_at]
        const result = await database.query(query, values)

        res.status(201).json({message: '기능이 성공적으로 등록되었습니다', tree_manage_no:result.rows[0].tree_manage_no})
    } catch (error) {
        console.error('기능 생성 중 오류 발생:', error.message);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
}
// 기능 삭제(비활성화)하기
exports.deactivateFunction = async (req, res) =>{
    const {tree_manage_no } = req.body
    if (!tree_manage_no){
        return res.status(400).json({message: 'tree_manage_no가 필요합니다.'})
    }
    try {
        const query = `
        UPDATE tree_manage
        SET status = false
        WHERE tree_manage_no = $1
        RETURNING *`

        const { rows } = await database.query(query, [tree_manage_no])

        if(rows.length === 0 ){
            return res.status(404).json({message: '해당 기능을 찾을 수 없습니다. '})
        }
        res.status(200).json({message: '기능이 비활성화되었습니다', event:rows[0]})
    } catch (error) {
        console.error('기능 비활성화 중 오류 발생:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
}
