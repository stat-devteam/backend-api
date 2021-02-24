"use strict";

const api = require('lambda-api')();
const smHandler = require("../modules/util_sm.js");

const testProcessor = require('../processor/test.js');
const linkListProcessor = require('../processor/link.list.js');
const linkExistProcessor = require('../processor/link.exist.js');
const rewardAsyncProcessor = require('../processor/reward.async.js');
const rewardStatusProcessor = require('../processor/reward.status.js');
const rewardSyncProcessor = require('../processor/reward.sync.js');
const rewardPromiseProcessor = require('../processor/reward.promise.js');

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
    return { status: 'ok' };
});


api.get('/test', testProcessor.test_GET);
api.get('/link/list', linkListProcessor.link_list_GET);
api.get('/link/exist', linkExistProcessor.link_exist_GET);
api.post('/reward/async', rewardAsyncProcessor.reward_async_POST);
api.get('/reward/status', rewardStatusProcessor.reward_status_GET);
api.post('/reward/sync', rewardSyncProcessor.reward_sync_POST);
api.post('/reward/promise', rewardPromiseProcessor.reward_promise_POST);


exports.handler = async(event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    return await api.run(event, context);
};
