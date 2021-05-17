"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');
const BigNumber = require('bignumber.js');
const smHandler = require('../modules/util_sm.js');
const axios = require('axios').default;
const kasInfo = require('../resource/kas.json');

const hkAccount_info_GET = async(req, res) => {
    const secretValue = await smHandler.getSecretValue(process.env.SM_ID);
    console.log('[hkAccount_info_GET] req', req);

    try {
        const pool = await dbPool.getPool();

        const accountId = req.query.accountId;

        if (!accountId) {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인' })
        }

        const [hkAccountResult, f1] = await pool.query(dbQuery.hankyung_klaytn_account_get_by_accnt_id.queryString, [accountId]);

        if (hkAccountResult.length > 0) {
            // Get current Balance
            const jsonRpcHeader = {
                'x-chain-id': kasInfo.xChainId,
                "Content-Type": "application/json"
            }
            const jsonRpcAuth = {
                username: secretValue.kas_access_key,
                password: secretValue.kas_secret_access_key,
            }
            const jsonRpcBody = { "jsonrpc": "2.0", "method": "klay_getBalance", "params": [hkAccountResult[0].address, "latest"], "id": 1 }

            const kalynJsonRpcResponse = await axios
                .post(kasInfo.jsonRpcUrl, jsonRpcBody, {
                    headers: jsonRpcHeader,
                    auth: jsonRpcAuth
                })
                .catch((err) => {
                    console.log('jsonrpc send fali', err);
                    let errorBody = {
                        code: 1023,
                        message: '[KAS] 잔액 조회 에러',
                    };
                    return { error: errorBody }
                });
            console.log('kalynJsonRpcResponse', kalynJsonRpcResponse);

            if (kalynJsonRpcResponse.error) {
                return sendRes(res, 400, kalynJsonRpcResponse.error)
            }
            //result 0x1212kjsdvsdfo
            const currentBalance = kalynJsonRpcResponse.data.result ? new BigNumber(kalynJsonRpcResponse.data.result).toString(10) : null;
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
