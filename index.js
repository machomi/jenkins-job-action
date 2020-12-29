const core = require('@actions/core');
const fetch = require('node-fetch');
const FormData = require('form-data');

const MAX_ATTEMPTS = 100;
const SLEEP_INTERVAL = 2000; // 2s between requests

const jobUrl = core.getInput('job_url');
const userPass = core.getInput('user_pass');
const auth = Buffer.from(userPass).toString('base64');
const wait = core.getInput('wait').toLowerCase() == "true";
const log = core.getInput('log').toLowerCase() == "true";
let params = '';
let paramsObj;
let form;
let jobUrlSuffix = "build";
try {
    params = core.getInput('params');
    if (params) {
        paramsObj = JSON.parse(params);
        form = new FormData();
        Object.keys(paramsObj).forEach((key) => {
            form.append(key, paramsObj[key]);
        });
        jobUrlSuffix += "WithParameters";
        if (!jobUrl.endsWith("/")) {
            jobUrlSuffix = "?" + jobUrlSuffix;
        }
    }
} catch (e) {
    paramsObj = {};
}
let jobExecutableUrl;
let result;

(async () => {
    try {
        const res = await fetch(jobUrl + jobUrlSuffix, {
            headers: {
                'Authorization': 'Basic ' + auth
            },
            method: "POST",
            body: form
        });

        if (res.status >= 400) {
            console.error(res);
            throw new Error("Bad response from server");
        }
        const location = res.headers.get('Location');
        if (wait && location) {

            for (let i = 0; i < MAX_ATTEMPTS; i++) {

                console.debug("attempt #" + (i + 1));

                let resp = await fetch(location + "api/json", {
                    headers: {
                        'Authorization': 'Basic ' + auth
                    }
                });
                if (resp.ok) {
                    let body = await resp.json();
                    if (body.executable) {
                        jobExecutableUrl = body.executable.url;
                        core.setOutput("url", jobExecutableUrl);
                        break;
                    }
                    // wait before next request
                    await new Promise(resolve => setTimeout(resolve, SLEEP_INTERVAL));
                } else {
                    throw new Error('Invalid response ' + resp.status);
                }
            }
            for (let i = 0; i < MAX_ATTEMPTS; i++) {

                console.debug("building #" + (i + 1));

                let resp = await fetch(jobExecutableUrl + "api/json", {
                    headers: {
                        'Authorization': 'Basic ' + auth
                    }
                });
                if (resp.ok) {
                    let body = await resp.json();
                    if (body.building == false && body.result) {
                        result = body.result;
                        core.setOutput("result", result);
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, SLEEP_INTERVAL));
                } else {
                    throw new Error('Invalid response ' + resp.status);
                }
            }
        }

        if (log) {
            console.debug("loading log stream for " + jobExecutableUrl);

            let resp = await fetch(jobExecutableUrl + "logText/progressiveText?start=0", {
                headers: {
                    'Authorization': 'Basic ' + auth
                }
            });
            if (resp.ok) {
                let body = await resp.text();
                console.log(body);
            } else {
                throw new Error('Invalid response ' + resp.status);
            }
        }
    } catch (err) {
        console.error(err);
        core.setFailed(err.message);
    }
})();
