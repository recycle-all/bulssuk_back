const cron = require('node-cron');
const axios = require('axios');

// 매월 1일 자정에 실행
cron.schedule('0 0 1 * *', async () => {
  try {
    console.log('Scheduler triggered: Generating FAQ data');
    const response = await axios.post('http://222.112.27.120:8001/generate');
    console.log('Scheduler response:', response.data);
  } catch (error) {
    console.error('Error in scheduler:', error);
  }
});

// 첫 번째 0: 분(자정)
// 두 번째 0: 시간(자정)
// 세 번째 1: 매월 1일
// 네 번째 *: 매월
// 다섯 번째 *: 요일 무관
