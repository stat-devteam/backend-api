"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');
const BigNumber = require('bignumber.js');
const smHandler = require('../modules/util_sm.js');
const axios = require('axios').default;
const kasInfo = require('../resource/kas.json');
const tokenUtil = require("../modules/util_token.js");

const hkAccount_info_GET = async(req, res) => {
    const secretValue = await smHandler.getSecretValue(process.env.SM_ID);
    console.log('[hkAccount_info_GET] req', req);

    try {
        const pool = await dbPool.getPool();

        const accountId = req.query.accountId;

        if (!accountId) {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인' })
        }

        const [hkAccountResult, f1] = await pool.query(dbQuery.klaytn_account_get_by_accnt_id.queryString, [accountId]);

        if (hkAccountResult.length > 0) {

            // [sub] get Current Balance
            const balanceData = await tokenUtil.getBalanceOf(hkAccountResult[0].address);

            if (balanceData.result) {}
            else {
                return sendRes(res, 400, { result: false, code: 1023, message: '[KAS] 잔액 조회 에러', info: { code: balanceData.code, message: balanceData.message } });
            }
            const currentBalance = balanceData.balance;

            // const currentBalance = kalynJsonRpcResponse.data.result ? new BigNumber(kalynJsonRpcResponse.data.result).toString(10) : null;
            hkAccountResult[0].currentBalance = currentBalance;

            let successBody = {
                result: true,
                info: hkAccountResult[0],
            };

            return sendRes(res, 200, successBody);
        }
        else {
            let emptyBody = {
                result: false,
            };
            return sendRes(res, 200, emptyBody);
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

module.exports = { hkAccount_info_GET };
