# trigger Jenkins Job action

This action triggers Jenkins Job.

## Inputs

### `job_url`

**Required** The full url to Jenkins Job. 

### `user_pass`

Credentials which allows to trigger specific job. First part is username and second part is user token. i.e. `user1:a01bc2d3e4f5g6h7`

### `wait`

Should action wait until job is finished. Default is `false`.

### `params`

If this is parametrized job then this field allows to pass parameters to it as json string.

### `log`

Should the action print output from the Jenkins job. Default is `false`.

## Outputs

### `url`

The url of job execution.

### `result`

The result of executing job. Can be either `SUCCESS` or `FAILURE`.

## Example usage

uses: machomi/trigger_jenkins_action@v1
with:
  job_url: 'Mona the Octocat'
  user_pass: user1:a01bc2d3e4f5g6h7
  wait: 'true'
  params: '{"env_name":"test","service":"demo"}'
  log: 'true'