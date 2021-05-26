"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

const user_info_GET = async(req, res) => {
    console.log('[user_info_GET] req', req);

    try {
        const pool = await dbPool.getPool();

        const memberId = req.query.memberId;
        const memberGroupId = req.query.memberGroupId;


        if (!memberId || !memberGroupId) {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인' })
        }

        const [linkResult, f1] = await pool.query(dbQuery.link_info_get.queryString, [memberId, memberGroupId]);
        console.log('linkResult', linkResult);
        const [linkTempResult, f2] = await pool.query(dbQuery.link_temp_info_list_get.queryString, [memberId, memberGroupId]);
        console.log('linkTempResult', linkTempResult);
        const [transferResult, f3] = await pool.query(dbQuery.transfer_info_list_get.queryString, [memberGroupId, memberId]);
        console.log('transferResult', transferResult);

        let linkObject = {}
        if (linkResult.length > 0) {
            linkObject = linkResult[0];
        }
        return sendRes(res, 200, {
            result: true,
            link: linkObject,
            linkTemp: linkTempResult,
            transfer: transferResult
        })



    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { result: false, code: 2011, message: 'ERROR', info: err.message })
    }

}



const sendRes = (res, status, body) => {
    return res.status(status).cors({
        exposeHeaders: 'maintenance',
        headers: 'pass',
    }).json(body);
};

module.exports = { user_info_GET };
