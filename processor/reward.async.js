"use strict";

const axios = require('axios').default;
const BigNumber = require('bignumber.js');
const dbPool = require('../modules/util_rds_pool.js');
const smHandler = require('../modules/util_sm.js');
const dbQuery = require('../resource/sql.json');
const kasInfo = require('../resource/kas.json');
var moment = require('moment-timezone');
var { InsertLogSeq } = require("../modules/utils_error.js");
const tokenUtil = require("../modules/util_token.js");

const reward_async_POST = async(req, res) => {
    const secretValue = await smHandler.getSecretValue(process.env.SM_ID);
    console.log('[reward_async_POST] req', req);

    try {
        const pool = await dbPool.getPool();

        const body = req.body;
        console.log('[Req] body', body)
        if (!body.memberGroupId || !body.memberId || !Number.isInteger(body.serviceNumber) || !body.amount) {
            return sendRes(res, 400, { code: 3000, message: '[Shift] 요청 파라미터 확인' });
        }

        const memberId = body.memberId;
        const memberGroupId = body.memberGroupId;
        const serviceNumber = body.serviceNumber;
        const amount = body.amount;
        const memo = body.memo || null;
        const serviceCallbackUrl = body.serviceCallbackUrl ? decodeURIComponent(body.serviceCallbackUrl) : null;

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
        const linkNumber = linkResult[0].link_num;
        const userKlaytnAddress = linkResult[0].klip_address;



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
            const [createServiceCallbackResult, f3] = await pool.query(dbQuery.service_callback_insert.queryString, [serviceCallbackUrl]);
            serviceCallbackSeq = parseInt(createServiceCallbackResult.insertId);

        }
        console.log('[SQL] serviceCallbackSeq', serviceCallbackSeq);


        //[TASK] INSERT Transfer Table

        // [sub] get Current Balance
        const balanceData = await tokenUtil.getBalanceOf(userKlaytnAddress);
        
        if (balanceData.result) {}
        else {
            return sendRes(res, 400, { result: false, code: 1023, message: '[KAS] 잔액 조회 에러', info: { code: balanceData.code, message: balanceData.message } });
        }
        const currentBalance = balanceData.balance;


        const txStatus = 'before_submit';
        const jobStatus = 'ready';
        const fee = null;
        const pebAmount = new BigNumber(amount).multipliedBy(new BigNumber(1e+18)).toString(10);
        const transferType = 'rwd';
        const now = moment(new Date()).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
        const transferEndDate = null;
        const initTxHash = null;

        const [insertResult, f4] = await pool.query(dbQuery.insert_transfer.queryString, [
            transferType,
            serviceNumber,
            linkNumber,
            pebAmount,
            fee,
            now,
            transferEndDate,
            initTxHash,
            txStatus,
            jobStatus,
            now,
            serviceCallbackSeq,
            memoSeq,
            currentBalance,
            userKlaytnAddress
        ]);
        console.log('[SQL] transfer before_submit insertResult', insertResult);
        const transferSeq = insertResult.insertId;
        console.log('[SQL] transferSeq', transferSeq);


        //[TASK] Klay Transfer
        const sendResult = await tokenUtil.sendToken(hkKlaytnAddress, userKlaytnAddress, amount);
        console.log('sendResult', sendResult);

        if (sendResult.result) {

        }
        else {
            let errorBody = {
                code: 2002,
                message: '[KAS] 클레이 전송 실패',
            }
            const errorCode = sendResult.code;
            const errorMessage = sendResult.message;
            const [updateResult, f1] = await pool.query(dbQuery.update_transfer_tx_job.queryString, ['fail', 'done', transferSeq]);
            const transferLogSeq = await InsertLogSeq('transfer', transferSeq, 'KAS', errorCode, errorMessage);
            return sendRes(res, 400, errorBody)
        }

        const sendResponseData = sendResult.data;
        const txHash = sendResponseData.transactionHash;
        let updateTxStatus = '';
        if (sendResponseData.status === 'Submitted') {
            updateTxStatus = 'submit';
        }
        else if (sendResponseData.status === 'Pending') {
            updateTxStatus = 'pending';
        }
        else {
            updateTxStatus = 'unknown';
        }

        let resultBody = {
            transactionHash: txHash,
            transferSequence: transferSeq,
            status: updateTxStatus,
        };

        try {
            const [updateResult, f1] = await pool.query(dbQuery.update_transfer_tx_job_hash.queryString, [updateTxStatus, 'ready', txHash, transferSeq]);
            console.log('[submit or pending] response', resultBody);
            return sendRes(res, 200, resultBody);
        }
        catch (err) {
            console.log('[submit or pending] update Fail');
            console.log('[update value] tx_status : ', updateTxStatus);
            console.log('[update value] txHash : ', txHash);
            return sendRes(res, 200, resultBody);
        }


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

module.exports = { reward_async_POST };
