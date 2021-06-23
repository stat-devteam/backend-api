"use strict";

const axios = require('axios').default;
const BigNumber = require('bignumber.js');
const dbPool = require('../modules/util_rds_pool.js');
const smHandler = require('../modules/util_sm.js');
const dbQuery = require('../resource/sql.json');
const kasInfo = require('../resource/kas.json');
var moment = require('moment-timezone');
const { DelegatedCheck } = require('../modules/util_klaytn.js');
var { InsertLogSeq } = require("../modules/utils_error.js");
const tokenUtil = require("../modules/util_token.js");

const reward_sync_POST = async(req, res) => {
    const secretValue = await smHandler.getSecretValue(process.env.SM_ID);
    console.log('[reward_sync_POST] req', req);

    try {
        const pool = await dbPool.getPool();
        console.log('[Req] REWARD - SYNC');

        const body = req.body;
        console.log('[Req] body', body)
        if (!body.memberGroupId || !body.memberId || !Number.isInteger(body.serviceNumber) || !body.amount) {
            console.log('[400] - (3000) [Shift] 요청 파라미터 확인');
            return sendRes(res, 400, { code: 3000, message: '[Shift] 요청 파라미터 확인' });
        }

        const memberId = body.memberId;
        const memberGroupId = body.memberGroupId;
        const serviceNumber = body.serviceNumber;
        const amount = body.amount;
        const memo = body.memo || null;

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


        //[TASK] INSERT Transfer Table

        // [sub] get Current Balance
        const balanceData = await tokenUtil.getBalanceOf(userKlaytnAddress);

        if (balanceData.result) {}
        else {
            return sendRes(res, 400, { result: false, code: 1023, message: '[KAS] 잔액 조회 에러', info: balanceData.message });
        }
        const currentBalance = balanceData.balance;


        const txStatus = 'before_submit';
        const jobStatus = 'ready';
        const fee = null;
        const pebAmount = new BigNumber(amount).multipliedBy(new BigNumber(1e+18)).toString(10);
        const transferType = 'rwd';
        const now = moment(new Date()).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
        const serviceCallbackId = null; // sync는 콜백 없음
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
            serviceCallbackId,
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
        console.log('[KAS] sendResponse', sendResult);
        console.log('[KAS] txHash', sendResponseData.transactionHash);

        //[TASK] POLL Transaction check
        const satusCheckUrl = kasInfo.apiUrl + 'tx/' + txHash;
        const checkHeader = {
            'Authorization': secretValue.kas_authorization,
            'Content-Type': 'application/json',
            'x-chain-id': kasInfo.xChainId,
        };

        const pollFn = () => {
            return axios.get(satusCheckUrl, { headers: checkHeader });
        };
        const pollTimeout = 5000;
        const pollInteval = 300;

        let updateTxStatus = null;
        let updateJobStatus = null;
        let updateFee = null;

        let pollErrorCode = '';
        let pollErrorMessage = '';
        await poll(pollFn, pollTimeout, pollInteval).then(
            (res) => {
                console.log('[poll] response', res);
                var errorReg = new RegExp("CommitError");

                updateJobStatus = 'done';
                if (res.status === 'Committed') {

                    let isDelegated = DelegatedCheck(res);
                    console.log('[isDelegated]', isDelegated)
                    if (isDelegated) {
                        updateFee = 0;
                    }
                    else {
                        updateFee = new BigNumber(res.gasPrice * res.gasUsed).toString(10);
                    }
                    updateTxStatus = 'success';

                }
                else if (errorReg.test(res.status)) {
                    updateTxStatus = 'fail';
                    pollErrorCode = res.txError;
                    pollErrorMessage = res.errorMessage;
                }
            },
            (err) => {
                console.log('[poll] error', err);
                updateTxStatus = 'submit';
                updateJobStatus = 'ready';
            },
        );

        console.log('[POLL - Result] updateTxStatus', updateTxStatus)
        console.log('[POLL - Result] updateJobStatus', updateJobStatus)
        console.log('[POLL - Result] updateFee', updateFee)

        // [TASK] Update Transfer Status
        switch (updateTxStatus) {
            case 'success':
                // code
                let resultBody = {
                    transactionHash: txHash,
                    transferSequence: transferSeq,
                    status: 'success'
                };

                try {

                    const [updateResult, f5] = await pool.query(dbQuery.update_transfer_tx_job_fee_hash.queryString, [updateTxStatus, updateJobStatus, updateFee, txHash, transferSeq]);
                    console.log('[success] response', resultBody);
                    return sendRes(res, 200, resultBody);
                }
                catch (err) {
                    console.log('[success] update Fail');
                    console.log('[update value] tx_status : ', updateTxStatus);
                    console.log('[update value] job_status : ', updateJobStatus);
                    console.log('[update value] fee : ', updateFee);
                    console.log('[update value] txHash : ', txHash);
                    return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
                }

            case 'submit':
                try {
                    const [updateResult, f5] = await pool.query(dbQuery.update_transfer_tx_job_hash.queryString, [updateTxStatus, updateJobStatus, txHash, transferSeq]);
                    console.log('[success] updateResult', updateResult);
                    return sendRes(res, 400, {
                        code: 1051,
                        message: 'transfer transaction 결과를 알 수 없습니다.',
                        info: {
                            transactionHash: txHash,
                            transferSequence: transferSeq,
                        }
                    })
                }
                catch (err) {
                    console.log('[submit] update Fail');
                    console.log('[update value] tx_status : ', updateTxStatus);
                    console.log('[update value] job_status : ', updateJobStatus);
                    console.log('[update value] txHash : ', txHash);
                    return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
                }

            case 'fail':
                try {
                    const [updateResult, f5] = await pool.query(dbQuery.update_transfer_tx_job.queryString, [updateTxStatus, updateJobStatus, transferSeq]);
                    console.log('[fail] updateResult', updateResult);
                    const transferLogSeq = await InsertLogSeq('transfer', transferSeq, 'KAS', pollErrorCode, pollErrorMessage);
                    return sendRes(res, 400, { code: 1052, message: 'trnasfer transaction CommitError', info: { code: pollErrorCode, message: pollErrorMessage } })
                }
                catch (err) {
                    console.log('[submit] update Fail');
                    console.log('[update value] tx_status : ', updateTxStatus);
                    console.log('[update value] job_status : ', updateJobStatus);
                    return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
                }

            default:
                return sendRes(res, 400, { code: 2011, message: 'ERROR', info: 'status empty' })
        }
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }

}




function poll(fn, timeout, interval) {
    var endTime = Number(new Date()) + (timeout || 2000);
    interval = interval || 100;

    var checkCondition = function(resolve, reject) {
        var ajax = fn();
        // dive into the ajax promise
        ajax.then(function(response) {
            // If the condition is met, we're done!
            console.log('[POLL] condiftion response', response);
            console.log('[POLL] condiftion status', response.data.status);
            var errorReg = new RegExp("CommitError");

            if (response.data.status === 'Committed') {
                resolve(response.data);
            }
            else if (errorReg.test(response.data.status)) {
                resolve(response.data);
            }
            else if (Number(new Date()) < endTime) {
                // pending은 지속적으로 polling
                setTimeout(checkCondition, interval, resolve, reject);
            }
            else {
                //time out case
                reject(new Error('timed out for ' + fn + ': ' + arguments));
            }
        });
    };

    return new Promise(checkCondition);
}



const sendRes = (res, status, body) => {
    return res.status(status).cors({
        exposeHeaders: 'maintenance',
        headers: 'pass',
    }).json(body);
};

module.exports = { reward_sync_POST };
