const express = require('express');
const {
  getAttendance,
  updateAttendance,
  addAlarm,
  getAlarms,
} = require('../../controllers/user/calendarController');

const router = express.Router();

router.get('/attendance/:user_id', getAttendance);
router.post('/attendance', updateAttendance);
router.post('/alarm', addAlarm);
router.get('/alarm/:user_id', getAlarms);

module.exports = router;
