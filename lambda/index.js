"use strict";

const api = require('lambda-api')();
const smHandler = require("../modules/util_sm.js");
const psHandler = require('../modules/util_ps.js');
var Base64 = require("js-base64");


const testProcessor = require('../processor/test.js');
const linkListProcessor = require('../processor/link.list.js');
const linkExistProcessor = require('../processor/link.exist.js');
const rewardAsyncProcessor = require('../processor/reward.async.js');
const rewardStatusProcessor = require('../processor/reward.status.js');
const rewardSyncProcessor = require('../processor/reward.sync.js');
const rewardPromiseProcessor = require('../processor/reward.promise.js');

api.use(['/*'], async(req, res, next) => {
    console.log('Maintenance - ParameterStore Check res', res);
    console.log('Maintenance - ParameterStore Check req', req);
    const pass = req.query.pass;
    const isMaintenance = await psHandler.getParameterStoreValue(process.env.PARAMETER_STORE_VALUE, 'backend', pass);
    console.log('isMaintenance', isMaintenance)
    if (isMaintenance) {
        return res.status(400).cors().json({
            message: JSON.parse(Base64.decode(isMaintenance)).message,
        });
    }
    next();
});


api.use(['/admin/*', '/clearCache'], (req, res, next) => {
    console.log(req.coldStart, req.requestCount, req.ip, req.method, req.path, req);
    next();
});

api.finally((req, res) => {
    console.log("api.finally!");
});

api.get('/clearCache', async(req, res) => {
    console.log('clearCache', req);
    smHandler.clearCache();
    psHandler.clearCache();
    let body = { result: true };
    return res.status(200).cors().json(body);
});


api.get('/test', testProcessor.test_GET);
api.get('/link/list', linkListProcessor.link_list_GET);
api.get('/link/exist', linkExistProcessor.link_exist_GET);
api.post('/reward/async', rewardAsyncProcessor.reward_async_POST);
api.get('/reward/status', rewardStatusProcessor.reward_status_GET);
api.post('/reward/sync', rewardSyncProcessor.reward_sync_POST);
api.post('/reward/promise', rewardPromiseProcessor.reward_promise_POST);


exports.handler = async(event, context, callback) => {
    const type = event.type;
    if (type === 'alive-check') {
        console.log('[Alive-Check]')
        return;
    }
    else {
        context.callbackWaitsForEmptyEventLoop = false;
        return await api.run(event, context);
    }
};
