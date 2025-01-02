const express = require('express');
const router = express.Router();

const multer = require('multer');
const path = require('path');
const { getAllTrees, getTree, UpdateTree, createTree, deactivateTree, getAllFunctions, getFunction } = require('../../controllers/admin/treeController');
// multer 설정: 원본 파일명 + 타임스탬프로 저장
const fs = require('fs');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'public/uploads/images/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const originalName = file.originalname;
    cb(null, originalName);
  },
});
const upload = multer({ storage });

//////////////////나무///////////////////
// 나무 정보 가져오기
router.get('/all_trees', getAllTrees)
router.get('/tree', getTree)
// 나무 정보 수정하기
router.put('/update_tree', upload.single('image'), UpdateTree)
// 나무 새로 등록하기
router.post('/create_tree', upload.single('image'), createTree)
// 나무 삭제 (비활성화)
router.put('/deactivate_tree', deactivateTree)

//////////////////기능///////////////////
// 기능 정보 가져오기
router.get('/all_functions', getAllFunctions)
router.get('/function', getFunction)
module.exports = router
