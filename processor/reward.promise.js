"use strict";

const axios = require('axios').default;
const BigNumber = require('bignumber.js');
const dbPool = require('../modules/util_rds_pool.js');
const smHandler = require('../modules/util_sm.js');
const dbQuery = require('../resource/sql.json');
const kasInfo = require('../resource/kas.json');
var moment = require('moment-timezone');

const reward_promise_POST = async(req, res) => {

    try {
        const pool = await dbPool.getPool();
        console.log('[Req] REWARD - PROMISE');
        const body = req.body;
        console.log('[Req] body', body)

        if (!body.memberGroupId || !body.memberId || !Number.isInteger(body.serviceNumber) || !body.amount) {
            return sendRes(res, 400, { code: 3000, message: '[Shift] 요청 파라미터 확인' });
        }

        const memberId = body.memberId;
        const memberGroupId = body.memberGroupId;
        const serviceNumber = body.serviceNumber;
        const amount = body.amount;
        const memo = body.memo;
        const serviceCallbackUrl = body.serviceCallbackUrl ? decodeURIComponent(body.serviceCallbackUrl) : null;
        const reserveTime = body.reserveTime || null;
        const expireTime = body.expireTime || null;
        const checkLink = body.checkLink || false;

        //[VALIDATION - HK Klaytn Account exist, service - membergroup match, link exist]
        const [hkAccountResult, f3] = await pool.query(dbQuery.check_hk_klayton.queryString, [serviceNumber]);
        if (hkAccountResult.length == 0) {
            let errorBody = {
                code: 1011,
                message: '[Shift] 해당 서비스의 한경 클레이튼 정보가 없습니다.',
            };
            console.log('[400] - (1011) 해당 서비스의 한경 클레이튼 정보가 없습니다.');
            console.log('hkAccountResult', hkAccountResult);
            return sendRes(res, 400, errorBody)
        }
        const hkKlaytnAddress = hkAccountResult[0].address;
        const hkXKrn = hkAccountResult[0].x_krn;

        const [serviceResult, f1] = await pool.query(dbQuery.service_get.queryString, [serviceNumber]);
        const serviceMemberGroupId = serviceResult[0].mbr_grp_id;
        if (serviceMemberGroupId !== memberGroupId) {
            let errorBody = {
                code: 1016,
                message: '[Shift] 서비스의 memberGroupId와 입력받은 memberGroupId가 일치하지 않습니다.',
            };
            console.log('[400] - (1016) 서비스의 memberGroupId와 입력받은 memberGroupId가 일치하지 않습니다.');
            console.log('serviceMemberGroupId', serviceMemberGroupId);
            console.log('memberGroupId', memberGroupId);
            return sendRes(res, 400, errorBody)
        }

        //checkLink일때만 link exist validation
        if (checkLink) {
            const [linkResult, f2] = await pool.query(dbQuery.check_link.queryString, [memberId, memberGroupId]);
            if (linkResult.length == 0) {
                let errorBody = {
                    code: 1001,
                    message: '[Shift] Link 정보가 없습니다.',
                };
                console.log('[400] - (1001) Link 정보가 없습니다.');
                console.log('linkResult', linkResult);
                return sendRes(res, 400, errorBody);
            }
        }


        //[TASK] INSERT MEMO
        let memoResult = null;
        if (memo) {
            const [memoQueryResult, f3] = await pool.query(dbQuery.insert_memo.queryString, [memo]);
            memoResult = memoQueryResult;
        }
        console.log('[SQL] memoResult', memoResult);
        let memoSeq = null;
        if (memo && memoResult.affectedRows === 1) {
            memoSeq = parseInt(memoResult.insertId);
        }

        //[TASK] INSERT ServiceCallbackUrl
        var serviceCallbackSeq = null;
        if (serviceCallbackUrl) {
            console.log('[VALUE] serviceCallbackUrl', serviceCallbackUrl)
            const [createServiceCallbackResult, f3] = await pool.query(dbQuery.service_callback_insert.queryString, [serviceCallbackUrl]);
            serviceCallbackSeq = parseInt(createServiceCallbackResult.insertId);
            console.log('[TASK] serviceCallbackSeq', serviceCallbackSeq)
        }

        //[TASK] Insert Reward Que
        const jobStatus = 'ready';
        const jobFetchedDate = null;
        const bigNumberAmount = new BigNumber(amount).multipliedBy(new BigNumber(1e+18));
        const klay = bigNumberAmount.toString(10);
        const [insertRewardQueResult, f4] = await pool.query(dbQuery.reward_que_insert.queryString, [serviceNumber, memberId, memberGroupId, klay, reserveTime, expireTime, jobStatus, jobFetchedDate, serviceCallbackSeq, memoSeq]);
        console.log('[RESPONSE - 200] rewardQueueSequence:', insertRewardQueResult.insertId)
        return sendRes(res, 200, { rewardQueueSequence: insertRewardQueResult.insertId })

    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }

}



const sendRes = (res, status, body) => {
    return res.status(status).cors({
        exposeHeaders: 'maintenance',
        headers: 'pass',
    }).json(body);
};

module.exports = { reward_promise_POST };
