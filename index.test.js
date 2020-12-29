// const process = require('process');
// const cp = require('child_process');
const path = require('path');

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
  // run docker-compose with jenkins as prerequisites for this test
  // process.env['INPUT_JOB_URL'] = 'http://localhost:8080/job/demo/';
  const ip = path.join(__dirname, 'index.js');
  console.log(ip)
  // console.log(cp.execSync(`node ${ip}`, {env: process.env}).toString());
})
