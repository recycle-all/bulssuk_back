const database = require('../../database/database'); // 데이터베이스 연결 경로
const dotenv = require('dotenv');
dotenv.config();

// tree_history_no를 사용해 user_no 조회
const getUserNoByTreeHistoryNo = async (tree_history_no) => {
  try {
    const result = await database.query(
      'SELECT user_no FROM tree_history WHERE tree_history_no = $1',
      [tree_history_no]
    );
    return result.rows[0]?.user_no || null; // user_no가 없을 경우 null 반환
  } catch (error) {
    console.error('Error fetching user_no by tree_history_no:', error.message);
    throw new Error('사용자를 조회하는 데 실패했습니다.');
  }
};

// user_no를 사용해 tree_history_no 조회
const getTreeHistoryNoByUserNo = async (user_no) => {
  try {
    const result = await database.query(
      'SELECT tree_history_no FROM tree_history WHERE user_no = $1',
      [user_no]
    );
    return result.rows.map((row) => row.tree_history_no); // 배열로 반환
  } catch (error) {
    console.error('Error fetching tree_history_no by user_no:', error.message);
    throw new Error('트리 히스토리를 조회하는 데 실패했습니다.');
  }
};

// 나무 상태 ( 현재 나무 레벨, 내용, 이미지, 사용한 총 포인트) 조회
const treeState = async (req, res) => {
  const { user_no } = req.params;

  if (!user_no) {
    return res.status(400).json({ message: 'user_no가 필요합니다.' });
  }

  try {
    console.log(`Received user_no: ${user_no}`);
    const treeHistoryResult = await database.query(
      'SELECT tree_history_no, tree_status, tree_points_total FROM tree_history WHERE user_no = $1 LIMIT 1',
      [user_no]
    );

    if (treeHistoryResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: '트리 히스토리를 찾을 수 없습니다.' });
    }

    const { tree_history_no, tree_status, tree_points_total } =
      treeHistoryResult.rows[0];
    console.log(
      `Found tree_history_no: ${tree_history_no}, tree_status: ${tree_status}`
    );

    const treeInfoResult = await database.query(
      'SELECT tree_info AS tree_status, tree_content, tree_img FROM tree_info WHERE tree_info = $1',
      [tree_status]
    );

    if (treeInfoResult.rows.length === 0) {
      return res.status(404).json({
        message: 'tree_info 테이블에서 해당 상태를 찾을 수 없습니다.',
      });
    }

    const treeInfo = treeInfoResult.rows[0];
    res.status(200).json({
      message: '트리 상태와 정보를 성공적으로 조회했습니다.',
      tree_status: treeInfo.tree_status,
      tree_content: treeInfo.tree_content,
      tree_img: treeInfo.tree_img,
      tree_points_total: tree_points_total,
    });
  } catch (error) {
    console.error('Error fetching tree state:', error.message);
    res
      .status(500)
      .json({ message: '트리 상태를 조회하는 동안 오류가 발생했습니다.' });
  }
};

// 물주기 이벤트
const waterTree = async (req, res) => {
  const { user_no } = req.body; // user_no를 요청에서 가져옴
  console.log('Received user_no:', user_no);

  if (!user_no) {
    console.log('Error: user_no가 누락되었습니다.');
    return res.status(400).json({ message: 'user_no가 누락되었습니다.' });
  }

  try {
    // user_no로 tree_history_no 조회
    console.log('Fetching tree_history_no for user_no:', user_no);
    const treeHistoryNos = await getTreeHistoryNoByUserNo(user_no);
    console.log('Retrieved treeHistoryNos:', treeHistoryNos);

    if (!treeHistoryNos || treeHistoryNos.length === 0) {
      console.log('Error: 트리 히스토리를 찾을 수 없습니다.');
      return res
        .status(404)
        .json({ message: '트리 히스토리를 찾을 수 없습니다.' });
    }

    const tree_history_no = treeHistoryNos[0];
    console.log('Using tree_history_no:', tree_history_no);

    // 트랜잭션 시작
    console.log('Starting transaction...');
    await database.query('BEGIN');

    // 사용자 포인트 확인
    console.log('Checking user points for user_no:', user_no);
    const pointResult = await database.query(
      'SELECT point_total FROM point WHERE user_no = $1 ORDER BY created_at DESC LIMIT 1',
      [user_no]
    );
    const userPoints = pointResult.rows[0]?.point_total || 0;
    console.log('User points:', userPoints);

    if (userPoints < 10) {
      console.log('Error: 포인트 부족.');
      await database.query('ROLLBACK');
      return res.status(400).json({ message: '포인트가 부족합니다.' });
    }

    // tree_status 확인
    console.log('Fetching tree status for tree_history_no:', tree_history_no);
    const treeStatusResult = await database.query(
      'SELECT tree_status FROM tree_history WHERE tree_history_no = $1',
      [tree_history_no]
    );
    const treeStatus = treeStatusResult.rows[0]?.tree_status;
    console.log('Tree status:', treeStatus);

    if (!treeStatus) {
      console.log('Error: 트리 상태를 찾을 수 없습니다.');
      await database.query('ROLLBACK');
      return res.status(400).json({ message: '트리 상태를 찾을 수 없습니다.' });
    }

    const event = '물주기';
    const eventPoints = 10;
    console.log('Event:', event, ', Event Points:', eventPoints);

    const eventTable =
      treeStatus === '씨앗'
        ? 'seed'
        : treeStatus === '새싹'
        ? 'sprout'
        : treeStatus === '가지'
        ? 'branch'
        : treeStatus === '나무'
        ? 'tree'
        : null;

    console.log('Determined eventTable:', eventTable);

    if (!eventTable) {
      console.log('Error: 알 수 없는 트리 상태:', treeStatus);
      await database.query('ROLLBACK');
      return res
        .status(400)
        .json({ message: `알 수 없는 트리 상태: ${treeStatus}` });
    }

    // 이벤트 기록
    console.log(`Inserting event record into ${eventTable}`);
    await database.query(
      `INSERT INTO ${eventTable} (tree_history_no, event, event_points, created_at) VALUES ($1, $2, $3, NOW())`,
      [tree_history_no, event, eventPoints]
    );

    // tree_history 테이블 업데이트
    console.log('Updating tree_history points total...');
    await database.query(
      'UPDATE tree_history SET tree_points_total = tree_points_total + 10 WHERE tree_history_no = $1',
      [tree_history_no]
    );

    // 포인트 차감
    const cost = 10;
    const newPointTotal = userPoints - cost;
    console.log('Deducting points:', cost, 'New Total Points:', newPointTotal);
    await database.query(
      `INSERT INTO point (user_no, point_status, point_amount, point_total, point_reason, created_at) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [user_no, 'DELETE', -cost, newPointTotal, '물주기']
    );

    // 트랜잭션 커밋
    console.log('Committing transaction...');
    await database.query('COMMIT');
    console.log('Watering event successfully completed.');
    res.status(200).json({
      message: '물주기 이벤트가 성공적으로 완료되었습니다.',
      remainingPoints: newPointTotal,
    });
  } catch (error) {
    try {
      console.error('Error encountered:', error.message);
      await database.query('ROLLBACK');
      console.log('Transaction rolled back.');
    } catch (rollbackError) {
      console.error('Rollback Error:', rollbackError.message);
    }
    res
      .status(500)
      .json({ message: '물주기 이벤트 처리 중 오류가 발생했습니다.' });
  }
};

// 햇빛쐬기 이벤트
const sunlightTree = async (req, res) => {
  const { user_no } = req.body; // user_no를 요청에서 가져옴

  if (!user_no) {
    return res.status(400).json({ message: 'user_no가 누락되었습니다.' });
  }

  try {
    // user_no로 tree_history_no 조회
    const treeHistoryNos = await getTreeHistoryNoByUserNo(user_no);
    if (!treeHistoryNos || treeHistoryNos.length === 0) {
      return res
        .status(404)
        .json({ message: '트리 히스토리를 찾을 수 없습니다.' });
    }

    const tree_history_no = treeHistoryNos[0];

    // 트랜잭션 시작
    await database.query('BEGIN');

    // 사용자 포인트 확인
    const pointResult = await database.query(
      'SELECT point_total FROM point WHERE user_no = $1 ORDER BY created_at DESC LIMIT 1',
      [user_no]
    );
    const userPoints = pointResult.rows[0]?.point_total || 0;

    if (userPoints < 20) {
      await database.query('ROLLBACK');
      return res.status(400).json({ message: '포인트가 부족합니다.' });
    }

    // tree_status 확인
    const treeStatusResult = await database.query(
      'SELECT tree_status FROM tree_history WHERE tree_history_no = $1',
      [tree_history_no]
    );
    const treeStatus = treeStatusResult.rows[0]?.tree_status;

    if (!treeStatus) {
      await database.query('ROLLBACK');
      return res.status(400).json({ message: '트리 상태를 찾을 수 없습니다.' });
    }

    const event = '햇빛쐬기';
    const eventPoints = 20;

    const eventTable =
      treeStatus === '씨앗'
        ? 'seed'
        : treeStatus === '새싹'
        ? 'sprout'
        : treeStatus === '가지'
        ? 'branch'
        : treeStatus === '나무'
        ? 'tree'
        : null;

    if (!eventTable) {
      await database.query('ROLLBACK');
      return res
        .status(400)
        .json({ message: `알 수 없는 트리 상태: ${treeStatus}` });
    }

    // 이벤트 기록
    await database.query(
      `INSERT INTO ${eventTable} (tree_history_no, event, event_points, created_at) VALUES ($1, $2, $3, NOW())`,
      [tree_history_no, event, eventPoints]
    );

    // tree_history 테이블 업데이트
    await database.query(
      'UPDATE tree_history SET tree_points_total = tree_points_total + $1 WHERE tree_history_no = $2',
      [eventPoints, tree_history_no]
    );

    // 포인트 차감
    const cost = 20;
    const newPointTotal = userPoints - cost;
    await database.query(
      `INSERT INTO point (user_no, point_status, point_amount, point_total, point_reason, created_at) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [user_no, 'DELETE', -cost, newPointTotal, '햇빛쐬기']
    );

    // 트랜잭션 커밋
    await database.query('COMMIT');
    res.status(200).json({
      message: '햇빛쐬기 이벤트가 성공적으로 완료되었습니다.',
      remainingPoints: newPointTotal,
    });
  } catch (error) {
    try {
      await database.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback Error:', rollbackError.message);
    }
    console.error('Error during sunlight event:', error.message);
    res
      .status(500)
      .json({ message: '햇빛쐬기 이벤트 처리 중 오류가 발생했습니다.' });
  }
};

// 비료주기 이벤트
const fertilizerTree = async (req, res) => {
  const { user_no } = req.body; // user_no를 요청에서 가져옴

  if (!user_no) {
    return res.status(400).json({ message: 'user_no가 누락되었습니다.' });
  }

  try {
    // user_no로 tree_history_no 조회
    const treeHistoryNos = await getTreeHistoryNoByUserNo(user_no);
    if (!treeHistoryNos || treeHistoryNos.length === 0) {
      return res
        .status(404)
        .json({ message: '트리 히스토리를 찾을 수 없습니다.' });
    }

    const tree_history_no = treeHistoryNos[0];

    // 트랜잭션 시작
    await database.query('BEGIN');

    // 사용자 포인트 확인
    const pointResult = await database.query(
      'SELECT point_total FROM point WHERE user_no = $1 ORDER BY created_at DESC LIMIT 1',
      [user_no]
    );
    const userPoints = pointResult.rows[0]?.point_total || 0;

    if (userPoints < 50) {
      await database.query('ROLLBACK');
      return res.status(400).json({ message: '포인트가 부족합니다.' });
    }

    // tree_status 확인
    const treeStatusResult = await database.query(
      'SELECT tree_status FROM tree_history WHERE tree_history_no = $1',
      [tree_history_no]
    );
    const treeStatus = treeStatusResult.rows[0]?.tree_status;

    if (!treeStatus) {
      await database.query('ROLLBACK');
      return res.status(400).json({ message: '트리 상태를 찾을 수 없습니다.' });
    }

    const event = '비료주기';
    const eventPoints = 50;

    const eventTable =
      treeStatus === '씨앗'
        ? 'seed'
        : treeStatus === '새싹'
        ? 'sprout'
        : treeStatus === '가지'
        ? 'branch'
        : treeStatus === '나무'
        ? 'tree'
        : null;

    if (!eventTable) {
      await database.query('ROLLBACK');
      return res
        .status(400)
        .json({ message: `알 수 없는 트리 상태: ${treeStatus}` });
    }

    // 이벤트 기록
    await database.query(
      `INSERT INTO ${eventTable} (tree_history_no, event, event_points, created_at) VALUES ($1, $2, $3, NOW())`,
      [tree_history_no, event, eventPoints]
    );

    // tree_history 테이블 업데이트
    await database.query(
      'UPDATE tree_history SET tree_points_total = tree_points_total + $1 WHERE tree_history_no = $2',
      [eventPoints, tree_history_no]
    );

    // 포인트 차감
    const cost = 50;
    const newPointTotal = userPoints - cost;
    await database.query(
      `INSERT INTO point (user_no, point_status, point_amount, point_total, point_reason, created_at) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [user_no, 'DELETE', -cost, newPointTotal, '비료주기']
    );

    // 트랜잭션 커밋
    await database.query('COMMIT');
    res.status(200).json({
      message: '비료주기 이벤트가 성공적으로 완료되었습니다.',
      remainingPoints: newPointTotal,
    });
  } catch (error) {
    try {
      await database.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback Error:', rollbackError.message);
    }
    console.error('Error during fertilizer event:', error.message);
    res
      .status(500)
      .json({ message: '비료주기 이벤트 처리 중 오류가 발생했습니다.' });
  }
};

// 씨앗에서 새싹으로 레벨업
const levelUpToSprout = async (req, res) => {
  const { user_no } = req.body; // user_no를 요청에서 가져옴

  if (!user_no) {
    return res.status(400).json({ message: 'user_no가 누락되었습니다.' });
  }

  try {
    // user_no로 tree_history_no 조회
    const treeHistoryResult = await database.query(
      'SELECT tree_history_no, tree_points_total FROM tree_history WHERE user_no = $1',
      [user_no]
    );

    if (treeHistoryResult.rows.length === 0) {
      return res.status(404).json({
        message: '해당 user_no에 대한 트리 히스토리를 찾을 수 없습니다.',
      });
    }

    const { tree_history_no, tree_points_total: treePointsTotal } =
      treeHistoryResult.rows[0];

    // 트랜잭션 시작
    await database.query('BEGIN');

    if (treePointsTotal === undefined || treePointsTotal === null) {
      await database.query('ROLLBACK');
      return res
        .status(400)
        .json({ message: '트리 포인트 정보를 찾을 수 없습니다.' });
    }

    const levelUpThreshold = 80; // 레벨업 기준 포인트
    const excessPoints = Math.max(0, treePointsTotal - levelUpThreshold); // 초과 포인트 계산

    if (treePointsTotal < levelUpThreshold) {
      await database.query('ROLLBACK');
      return res
        .status(400)
        .json({ message: '레벨업 조건을 만족하지 못했습니다.' });
    }

    // tree_status를 '새싹'으로 업데이트
    await database.query(
      'UPDATE tree_history SET tree_status = $1 WHERE tree_history_no = $2',
      ['새싹', tree_history_no]
    );

    // sprout 테이블에 새싹 발아 이벤트 추가
    const event = '새싹 발아';
    await database.query(
      'INSERT INTO sprout (tree_history_no, event, event_points, created_at) VALUES ($1, $2, $3, NOW())',
      [tree_history_no, event, excessPoints]
    );

    // 트랜잭션 커밋
    await database.query('COMMIT');
    res.status(200).json({
      message: '새싹으로 레벨업이 성공적으로 완료되었습니다.',
      treePointsTotal,
      excessPoints,
    });
  } catch (error) {
    try {
      await database.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback Error:', rollbackError.message);
    }
    console.error('Error during level up to sprout:', error.message);
    res.status(500).json({ message: '레벨업 처리 중 오류가 발생했습니다.' });
  }
};

// 새싹에서 가지로 레벨업
const levelUpToBranch = async (req, res) => {
  const { user_no } = req.body; // user_no를 요청에서 가져옴

  if (!user_no) {
    return res.status(400).json({ message: 'user_no가 누락되었습니다.' });
  }

  try {
    // user_no로 tree_history_no 조회
    const treeHistoryResult = await database.query(
      'SELECT tree_history_no, tree_points_total FROM tree_history WHERE user_no = $1',
      [user_no]
    );

    if (treeHistoryResult.rows.length === 0) {
      return res.status(404).json({
        message: '해당 user_no에 대한 트리 히스토리를 찾을 수 없습니다.',
      });
    }

    const { tree_history_no, tree_points_total: treePointsTotal } =
      treeHistoryResult.rows[0];

    // 트랜잭션 시작
    await database.query('BEGIN');

    if (treePointsTotal === undefined || treePointsTotal === null) {
      await database.query('ROLLBACK');
      return res
        .status(400)
        .json({ message: '트리 포인트 정보를 찾을 수 없습니다.' });
    }

    const levelUpThreshold = 240; // 레벨업 기준 포인트
    const excessPoints = Math.max(0, treePointsTotal - levelUpThreshold); // 초과 포인트 계산

    if (treePointsTotal < levelUpThreshold) {
      await database.query('ROLLBACK');
      return res
        .status(400)
        .json({ message: '레벨업 조건을 만족하지 못했습니다.' });
    }

    // tree_status를 '가지'로 업데이트
    await database.query(
      'UPDATE tree_history SET tree_status = $1 WHERE tree_history_no = $2',
      ['가지', tree_history_no]
    );

    // branch 테이블에 가지 생성 이벤트 추가
    const event = '가지 생성';
    await database.query(
      'INSERT INTO branch (tree_history_no, event, event_points, created_at) VALUES ($1, $2, $3, NOW())',
      [tree_history_no, event, excessPoints]
    );

    // 트랜잭션 커밋
    await database.query('COMMIT');
    res.status(200).json({
      message: '가지로 레벨업이 성공적으로 완료되었습니다.',
      treePointsTotal,
      excessPoints,
    });
  } catch (error) {
    try {
      await database.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback Error:', rollbackError.message);
    }
    console.error('Error during level up to sprout:', error.message);
    res.status(500).json({ message: '레벨업 처리 중 오류가 발생했습니다.' });
  }
};

// 가지에서 나무로 레벨업
const levelUpToTree = async (req, res) => {
  const { user_no } = req.body; // user_no를 요청에서 가져옴

  if (!user_no) {
    return res.status(400).json({ message: 'user_no가 누락되었습니다.' });
  }

  try {
    // user_no로 tree_history_no 조회
    const treeHistoryResult = await database.query(
      'SELECT tree_history_no, tree_points_total FROM tree_history WHERE user_no = $1',
      [user_no]
    );

    if (treeHistoryResult.rows.length === 0) {
      return res.status(404).json({
        message: '해당 user_no에 대한 트리 히스토리를 찾을 수 없습니다.',
      });
    }

    const { tree_history_no, tree_points_total: treePointsTotal } =
      treeHistoryResult.rows[0];

    // 트랜잭션 시작
    await database.query('BEGIN');

    if (treePointsTotal === undefined || treePointsTotal === null) {
      await database.query('ROLLBACK');
      return res
        .status(400)
        .json({ message: '트리 포인트 정보를 찾을 수 없습니다.' });
    }

    const levelUpThreshold = 720; // 레벨업 기준 포인트
    const excessPoints = Math.max(0, treePointsTotal - levelUpThreshold); // 초과 포인트 계산

    if (treePointsTotal < levelUpThreshold) {
      await database.query('ROLLBACK');
      return res
        .status(400)
        .json({ message: '레벨업 조건을 만족하지 못했습니다.' });
    }

    // tree_status를 '나무'로 업데이트
    await database.query(
      'UPDATE tree_history SET tree_status = $1 WHERE tree_history_no = $2',
      ['나무', tree_history_no]
    );

    // tree 테이블에 나무 성장 이벤트 추가
    const event = '나무 성장';
    await database.query(
      'INSERT INTO tree (tree_history_no, event, event_points, created_at) VALUES ($1, $2, $3, NOW())',
      [tree_history_no, event, excessPoints]
    );

    // 트랜잭션 커밋
    await database.query('COMMIT');
    res.status(200).json({
      message: '나무로 레벨업이 성공적으로 완료되었습니다.',
      treePointsTotal,
      excessPoints,
    });
  } catch (error) {
    try {
      await database.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback Error:', rollbackError.message);
    }
    console.error('Error during level up to sprout:', error.message);
    res.status(500).json({ message: '레벨업 처리 중 오류가 발생했습니다.' });
  }
};

// 나무에서 꽃으로 레벨업
const levelUpToFlower = async (req, res) => {
  const { user_no } = req.body; // user_no를 요청에서 가져옴

  if (!user_no) {
    return res.status(400).json({ message: 'user_no가 누락되었습니다.' });
  }

  try {
    // user_no로 tree_history_no 조회
    const treeHistoryResult = await database.query(
      'SELECT tree_history_no, tree_points_total FROM tree_history WHERE user_no = $1',
      [user_no]
    );

    if (treeHistoryResult.rows.length === 0) {
      return res.status(404).json({
        message: '해당 user_no에 대한 트리 히스토리를 찾을 수 없습니다.',
      });
    }

    const { tree_history_no, tree_points_total: treePointsTotal } =
      treeHistoryResult.rows[0];

    // 트랜잭션 시작
    await database.query('BEGIN');

    if (treePointsTotal === undefined || treePointsTotal === null) {
      await database.query('ROLLBACK');
      return res
        .status(400)
        .json({ message: '트리 포인트 정보를 찾을 수 없습니다.' });
    }

    const levelUpThreshold = 2160; // 레벨업 기준 포인트
    const excessPoints = Math.max(0, treePointsTotal - levelUpThreshold); // 초과 포인트 계산

    if (treePointsTotal < levelUpThreshold) {
      await database.query('ROLLBACK');
      return res
        .status(400)
        .json({ message: '레벨업 조건을 만족하지 못했습니다.' });
    }

    // tree_status를 '꽃'으로 업데이트
    await database.query(
      'UPDATE tree_history SET tree_status = $1 WHERE tree_history_no = $2',
      ['꽃', tree_history_no]
    );

    // flower 테이블에 꽃 개화 이벤트 추가
    const event = '꽃 개화';
    await database.query(
      'INSERT INTO flower (tree_history_no, event, event_points, created_at) VALUES ($1, $2, $3, NOW())',
      [tree_history_no, event, excessPoints]
    );

    // 트랜잭션 커밋
    await database.query('COMMIT');
    res.status(200).json({
      message: '꽃으로 레벨업이 성공적으로 완료되었습니다.',
      treePointsTotal,
      excessPoints,
    });
  } catch (error) {
    try {
      await database.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback Error:', rollbackError.message);
    }
    console.error('Error during level up to sprout:', error.message);
    res.status(500).json({ message: '레벨업 처리 중 오류가 발생했습니다.' });
  }
};

// 물주기, 햇빛쐬기, 비료주기 이미지 조회
const TreeManage = async (req, res) => {
  try {
    // tree_manage 테이블에서 모든 데이터 조회
    const result = await database.query(
      'SELECT tree_manage_no, tree_manage, manage_points, manage_img FROM tree_manage WHERE status = true'
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: 'tree_manage 데이터를 찾을 수 없습니다.' });
    }

    res.status(200).json({
      message: 'tree_manage 데이터를 성공적으로 조회했습니다.',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching tree_manage:', error.message);
    res.status(500).json({
      message: 'tree_manage 데이터를 조회하는 동안 오류가 발생했습니다.',
    });
  }
};

module.exports = {
  getUserNoByTreeHistoryNo,
  waterTree,
  sunlightTree,
  fertilizerTree,
  levelUpToSprout,
  levelUpToBranch,
  levelUpToTree,
  levelUpToFlower,
  treeState,
  getTreeHistoryNoByUserNo,
  TreeManage,
};
