"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

const nft_user_GET = async (req, res) => {
    console.log('[nft_user_GET] req', req);

    try {
        const pool = await dbPool.getPool();

        const params = req.query;
        console.log('params', params);

        if (!params) {
            return sendRes(res, 400, { code: 1101, message: '[Shift] Parameter Missing' });
        }

        if (!params.memberId || !params.memberGroupId) {
            return sendRes(res, 400, { code: 1101, message: '[Shift] Parameter Missing Check' });
        }

        const memberId = params.memberId;
        const memberGroupId = params.memberGroupId;

        //1.check Link
        const [linkInfoResult, f1] = await pool.query(dbQuery.link_check_registered.queryString, [memberId, memberGroupId]);
        console.log('linkInfoResult', linkInfoResult);

        if (linkInfoResult.length === 0) {
            return sendRes(res, 400, { code: 1001, message: "Link가 연결되지 않음." })
        }

        const kilpAddress = linkInfoResult[0].klip_address;

        //[TASK] Get token list
        const [user_token_list, f2] = await pool.query(dbQuery.user_token_list.queryString, [kilpAddress]);
        console.log('user_token_list', user_token_list);

        return sendRes(res, 200, { result: true, info: linkInfoResult[0], list: user_token_list });


    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 9000, message: 'Unexpected Error', info: err.message })
    }

}



const sendRes = (res, status, body) => {
    return res.status(status).cors({
        exposeHeaders: 'maintenance',
        headers: 'pass',
    }).json(body);
};

module.exports = { nft_user_GET };
