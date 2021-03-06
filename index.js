const core = require('@actions/core');
const fetch = require('node-fetch');
const FormData = require('form-data');

const SLEEP_INTERVAL = 2000; // 2s between requests

const headers = {};
const jobUrl = core.getInput('job_url');
const userPass = core.getInput('user_pass');
if (userPass) {
    headers.Authorization = 'Basic ' + Buffer.from(userPass).toString('base64');
}
const wait = core.getInput('wait').toLowerCase() == "true";
const log = core.getInput('log').toLowerCase() == "true";
const waitForQueue = parseInt(core.getInput('waitForQueue'));
const waitForExecution = parseInt(core.getInput('waitForExecution'));
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
            headers: headers,
            method: "POST",
            body: form
        });

        if (res.status >= 400) {
            console.error(res);
            throw new Error(`Bad response ${res.status} from jenkins for job url ` + jobUrl + jobUrlSuffix);
        }
        const location = res.headers.get('Location');
        if (wait && location) {

            const queueStart = new Date().getTime();
            for (let i = 0; i < Number.MAX_SAFE_INTEGER; i++) {
                core.debug("attempt #" + (i + 1));

                let resp = await fetch(location + "api/json", {
                    headers: headers
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
                    throw new Error(`Invalid response ${resp.status} for url ` + location + "api/json");
                }
                let diff = new Date().getTime() - queueStart;
                if (diff / 1000 > waitForQueue) {
                    core.warning("Queue waiting time exceeded");
                    break;
                }
            }
            const execStart = new Date().getTime();
            for (let i = 0; i < Number.MAX_SAFE_INTEGER; i++) {

                core.debug("building #" + (i + 1));

                let resp = await fetch(jobExecutableUrl + "api/json", {
                    headers: headers
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
                    throw new Error(`Invalid response ${resp.status} for url ` + jobExecutableUrl + "api/json");
                }
                let diff = new Date().getTime() - execStart;
                if (diff / 1000 > waitForExecution) {
                    core.warning("Execution waiting time exceeded");
                    break;
                }
            }
        }

        if (log) {
            core.debug("loading log stream for " + jobExecutableUrl);

            let resp = await fetch(jobExecutableUrl + "logText/progressiveText?start=0", {
                headers: headers
            });
            if (resp.ok) {
                await core.group("Jenkins logs", async () => {
                    const logText = await resp.text();
                    core.info(logText);
                    return logText;
                })
            } else {
                throw new Error(`Invalid response ${resp.status} for url ` + jobExecutableUrl + "logText/progressiveText?start=0");
            }
        }
    } catch (err) {
        core.debug(err);
        core.setFailed(err.message);
    }
})();