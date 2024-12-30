const express = require('express');
const {
  getAttendance,
  updateAttendance,
  addAlarm,
  getAlarms,
  updateAlarm,
  getAlarmsByDate,
  deactivateAlarm,
} = require('../../controllers/user/calendarController');

const router = express.Router();

router.get('/attendance/:user_id', getAttendance);
router.post('/attendance', updateAttendance);
router.post('/alarm', addAlarm);
router.get('/alarm/:user_id', getAlarms);
router.put('/update_alarm', updateAlarm);
router.get('/date', getAlarmsByDate);
router.put('/deactivate_alarm', deactivateAlarm);

module.exports = router;
