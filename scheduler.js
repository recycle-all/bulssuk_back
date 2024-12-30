const cron = require('node-cron');
// const faqController = require('./controllers/admin/faqController');
const axios = require('axios');

// 매주 월요일 오전 9시에 실행
cron.schedule('* * * 1 *', async () => {
  try {
    console.log('Scheduler triggered: Generating FAQ data');
    const response = await axios.post('http://localhost:8080/generate');
    console.log('Scheduler response:', response.data);
  } catch (error) {
    console.error('Error in scheduler:', error);
  }
});

// 첫 번째 */5: 매 5분마다.
// 두 번째 *: 매 시간.
// 세 번째 *: 매일.
// 네 번째 *: 매월.
// 다섯 번째 *: 요일 무관.
