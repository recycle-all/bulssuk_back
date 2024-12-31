const express = require('express');
const {
  getAttendance,
  updateAttendance,
  addAlarm,
  getAlarms,
  updateAlarm,
  getAlarmsByDate,
  deactivateAlarm,
  updateAttendanceAndPoints,
  getAttendances,
  getMonthImage,
  getEvent,
} = require('../../controllers/user/calendarController');

const router = express.Router();

router.get('/attendance/:user_id', getAttendance);
// router.post('/attendance', updateAttendance);
router.post('/alarm', addAlarm);
router.get('/alarm/:user_id', getAlarms);
router.put('/update_alarm', updateAlarm);
router.get('/date', getAlarmsByDate);
router.put('/deactivate_alarm', deactivateAlarm);
router.post('/attendance',updateAttendanceAndPoints)
router.get('/attendance/:user_no/:year/:month',getAttendances)
router.get('/month_image/:month', getMonthImage)
router.get('/get_event/:year/:month', getEvent)
module.exports = router;

