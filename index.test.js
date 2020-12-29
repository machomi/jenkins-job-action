const process = require('process');
const cp = require('child_process');
const path = require('path');

test('test mocked', () => {
  // TBD mock jenkins url
});

// shows how the runner will run a javascript action with env / stdout protocol
test('test with real jenkins', () => {
  // run docker-compose with jenkins as prerequisites for this test
  // and setup demo job, generate admin token and set ENV INPUT_USER_PASS with user:token
  if (process.env['INPUT_USER_PASS']) {
    process.env['INPUT_JOB_URL'] = 'http://localhost:8080/job/demo/';
    process.env['INPUT_WAIT'] = 'true';
    process.env['INPUT_LOG'] = 'true';
    const ip = path.join(__dirname, 'index.js');
    console.log(cp.execSync(`node ${ip}`, {
      env: process.env
    }).toString());
  }
})