const database = require('../../database/database'); // 데이터베이스 연결 경로

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

// 물주기 이벤트
const waterTree = async (req, res) => {
  const { tree_history_no } = req.body; // tree_history_no를 요청에서 가져옴

  try {
    // tree_history_no로 user_no 조회
    const user_no = await getUserNoByTreeHistoryNo(tree_history_no);
    if (!user_no) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 트랜잭션 시작
    await database.query('BEGIN');

    // 사용자 포인트 확인
    const pointResult = await database.query(
      'SELECT point_total FROM point WHERE user_no = $1',
      [user_no]
    );
    const userPoints = pointResult.rows[0]?.point_total;

    if (!userPoints || userPoints < 10) {
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

    const event = '물주기';
    const eventPoints = 10;

    if (treeStatus === '씨앗') {
      // 씨앗 상태일 때 seed 테이블에 물주기 기록
      await database.query(
        'INSERT INTO seed (tree_history_no, event, event_points, created_at) VALUES ($1, $2, $3, NOW())',
        [tree_history_no, event, eventPoints]
      );
    } else if (treeStatus === '새싹') {
      // 새싹 상태일 때 sprout 테이블에 물주기 기록
      await database.query(
        'INSERT INTO sprout (tree_history_no, event, event_points, created_at) VALUES ($1, $2, $3, NOW())',
        [tree_history_no, event, eventPoints]
      );
    } else if (treeStatus === '가지') {
      // 가지 상태일 때 branch 테이블에 물주기 기록
      await database.query(
        'INSERT INTO branch (tree_history_no, event, event_points, created_at) VALUES ($1, $2, $3, NOW())',
        [tree_history_no, event, eventPoints]
      );
    } else if (treeStatus === '나무') {
      // 나무 상태일 때 tree 테이블에 물주기 기록
      await database.query(
        'INSERT INTO tree (tree_history_no, event, event_points, created_at) VALUES ($1, $2, $3, NOW())',
        [tree_history_no, event, eventPoints]
      );
    } else {
      // 알 수 없는 상태 처리
      await database.query('ROLLBACK');
      return res
        .status(400)
        .json({ message: `알 수 없는 트리 상태: ${treeStatus}` });
    }

    // tree_history 테이블에 10p 추가
    await database.query(
      'UPDATE tree_history SET tree_points_total = tree_points_total + 10 WHERE tree_history_no = $1',
      [tree_history_no]
    );

    // 포인트 차감 계산
    const cost = 10;
    const newPointTotal = userPoints - cost;

    // 포인트 업데이트 (로그 기록 포함)
    await database.query(
      `
        INSERT INTO point (user_no, point_status, point_amount, point_total, point_reason, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `,
      [user_no, 'DELETE', -cost, newPointTotal, '물주기']
    );

    // 트랜잭션 커밋
    await database.query('COMMIT');
    res
      .status(200)
      .json({ message: '물주기 이벤트가 성공적으로 완료되었습니다.' });
  } catch (error) {
    try {
      await database.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback Error:', rollbackError.message);
    }
    console.error('Error during water event:', error.message);
    res
      .status(500)
      .json({ message: '물주기 이벤트 처리 중 오류가 발생했습니다.' });
  }
};

// 햇빛쐬기 이벤트
const sunlightTree = async (req, res) => {
  const { tree_history_no } = req.body; // tree_history_no를 요청에서 가져옴

  try {
    // tree_history_no로 user_no 조회
    const user_no = await getUserNoByTreeHistoryNo(tree_history_no);
    if (!user_no) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 트랜잭션 시작
    await database.query('BEGIN');

    // 사용자 포인트 확인
    const pointResult = await database.query(
      'SELECT point_total FROM point WHERE user_no = $1',
      [user_no]
    );
    const userPoints = pointResult.rows[0]?.point_total;

    if (!userPoints || userPoints < 20) {
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

    if (treeStatus === '씨앗') {
      // 씨앗 상태일 때 seed 테이블에 햇빛쐬기 기록
      await database.query(
        'INSERT INTO seed (tree_history_no, event, event_points, created_at) VALUES ($1, $2, $3, NOW())',
        [tree_history_no, event, eventPoints]
      );
    } else if (treeStatus === '새싹') {
      // 새싹 상태일 때 sprout 테이블에 햇빛쐬기 기록
      await database.query(
        'INSERT INTO sprout (tree_history_no, event, event_points, created_at) VALUES ($1, $2, $3, NOW())',
        [tree_history_no, event, eventPoints]
      );
    } else if (treeStatus === '가지') {
      // 가지 상태일 때 branch 테이블에 햇빛쐬기 기록
      await database.query(
        'INSERT INTO branch (tree_history_no, event, event_points, created_at) VALUES ($1, $2, $3, NOW())',
        [tree_history_no, event, eventPoints]
      );
    } else if (treeStatus === '나무') {
      // 나무 상태일 때 tree 테이블에 햇빛쐬기 기록
      await database.query(
        'INSERT INTO tree (tree_history_no, event, event_points, created_at) VALUES ($1, $2, $3, NOW())',
        [tree_history_no, event, eventPoints]
      );
    } else {
      // 알 수 없는 상태 처리
      await database.query('ROLLBACK');
      return res
        .status(400)
        .json({ message: `알 수 없는 트리 상태: ${treeStatus}` });
    }

    // tree_history 테이블에 포인트 추가
    await database.query(
      'UPDATE tree_history SET tree_points_total = tree_points_total + $1 WHERE tree_history_no = $2',
      [eventPoints, tree_history_no]
    );

    // 포인트 차감 계산
    const cost = 20;
    const newPointTotal = userPoints - cost;

    // 포인트 업데이트 (로그 기록 포함)
    await database.query(
      `
        INSERT INTO point (user_no, point_status, point_amount, point_total, point_reason, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `,
      [user_no, 'DELETE', -cost, newPointTotal, '햇빛쐬기']
    );

    // 트랜잭션 커밋
    await database.query('COMMIT');
    res
      .status(200)
      .json({ message: '햇빛쐬기 이벤트가 성공적으로 완료되었습니다.' });
  } catch (error) {
    try {
      await database.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback Error:', rollbackError.message);
    }
    console.error('Error during water event:', error.message);
    res
      .status(500)
      .json({ message: '햇빛쐬기 이벤트 처리 중 오류가 발생했습니다.' });
  }
};

// 비료주기 이벤트
const fertilizerTree = async (req, res) => {
  const { tree_history_no } = req.body; // tree_history_no를 요청에서 가져옴

  try {
    // tree_history_no로 user_no 조회
    const user_no = await getUserNoByTreeHistoryNo(tree_history_no);
    if (!user_no) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 트랜잭션 시작
    await database.query('BEGIN');

    // 사용자 포인트 확인
    const pointResult = await database.query(
      'SELECT point_total FROM point WHERE user_no = $1',
      [user_no]
    );
    const userPoints = pointResult.rows[0]?.point_total;

    if (!userPoints || userPoints < 50) {
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

    if (treeStatus === '씨앗') {
      // 씨앗 상태일 때 seed 테이블에 비료주기 기록
      await database.query(
        'INSERT INTO seed (tree_history_no, event, event_points, created_at) VALUES ($1, $2, $3, NOW())',
        [tree_history_no, event, eventPoints]
      );
    } else if (treeStatus === '새싹') {
      // 새싹 상태일 때 sprout 테이블에 비료주기 기록
      await database.query(
        'INSERT INTO sprout (tree_history_no, event, event_points, created_at) VALUES ($1, $2, $3, NOW())',
        [tree_history_no, event, eventPoints]
      );
    } else if (treeStatus === '가지') {
      // 가지 상태일 때 branch 테이블에 비료주기 기록
      await database.query(
        'INSERT INTO branch (tree_history_no, event, event_points, created_at) VALUES ($1, $2, $3, NOW())',
        [tree_history_no, event, eventPoints]
      );
    } else if (treeStatus === '나무') {
      // 나무 상태일 때 tree 테이블에 비료주기 기록
      await database.query(
        'INSERT INTO tree (tree_history_no, event, event_points, created_at) VALUES ($1, $2, $3, NOW())',
        [tree_history_no, event, eventPoints]
      );
    } else {
      // 알 수 없는 상태 처리
      await database.query('ROLLBACK');
      return res
        .status(400)
        .json({ message: `알 수 없는 트리 상태: ${treeStatus}` });
    }

    // tree_history 테이블에 포인트 추가
    await database.query(
      'UPDATE tree_history SET tree_points_total = tree_points_total + $1 WHERE tree_history_no = $2',
      [eventPoints, tree_history_no]
    );

    // 포인트 차감 계산
    const cost = 50;
    const newPointTotal = userPoints - cost;

    // 포인트 업데이트 (로그 기록 포함)
    await database.query(
      `
        INSERT INTO point (user_no, point_status, point_amount, point_total, point_reason, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `,
      [user_no, 'DELETE', -cost, newPointTotal, '비료주기']
    );

    // 트랜잭션 커밋
    await database.query('COMMIT');
    res
      .status(200)
      .json({ message: '비료주기 이벤트가 성공적으로 완료되었습니다.' });
  } catch (error) {
    try {
      await database.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback Error:', rollbackError.message);
    }
    console.error('Error during water event:', error.message);
    res
      .status(500)
      .json({ message: '햇빛쐬기 이벤트 처리 중 오류가 발생했습니다.' });
  }
};

// 씨앗에서 새싹으로 레벨업
const levelUpToSprout = async (req, res) => {
  const { tree_history_no } = req.body; // tree_history_no를 요청에서 가져옴

  try {
    // 트랜잭션 시작
    await database.query('BEGIN');

    // tree_points_total 확인
    const treeResult = await database.query(
      'SELECT tree_points_total FROM tree_history WHERE tree_history_no = $1',
      [tree_history_no]
    );
    const treePointsTotal = treeResult.rows[0]?.tree_points_total;

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
  const { tree_history_no } = req.body; // tree_history_no를 요청에서 가져옴

  try {
    // 트랜잭션 시작
    await database.query('BEGIN');

    // tree_points_total 확인
    const treeResult = await database.query(
      'SELECT tree_points_total FROM tree_history WHERE tree_history_no = $1',
      [tree_history_no]
    );
    const treePointsTotal = treeResult.rows[0]?.tree_points_total;

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
  const { tree_history_no } = req.body; // tree_history_no를 요청에서 가져옴

  try {
    // 트랜잭션 시작
    await database.query('BEGIN');

    // tree_points_total 확인
    const treeResult = await database.query(
      'SELECT tree_points_total FROM tree_history WHERE tree_history_no = $1',
      [tree_history_no]
    );
    const treePointsTotal = treeResult.rows[0]?.tree_points_total;

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
  const { tree_history_no } = req.body; // tree_history_no를 요청에서 가져옴

  try {
    // 트랜잭션 시작
    await database.query('BEGIN');

    // tree_points_total 확인
    const treeResult = await database.query(
      'SELECT tree_points_total FROM tree_history WHERE tree_history_no = $1',
      [tree_history_no]
    );
    const treePointsTotal = treeResult.rows[0]?.tree_points_total;

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

    // tree_status를 '꽃'로 업데이트
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

module.exports = {
  getUserNoByTreeHistoryNo,
  waterTree,
  sunlightTree,
  fertilizerTree,
  levelUpToSprout,
  levelUpToBranch,
  levelUpToTree,
  levelUpToFlower,
};
