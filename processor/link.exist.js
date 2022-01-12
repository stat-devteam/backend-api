"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

const link_exist_GET = async(req, res) => {
    console.log('[link_exist_GET] req', req);

    try {
        const pool = await dbPool.getPool();

        const memberGroupId = req.query.memberGroupId;
        const memberId = req.query.memberId;

        if (!memberGroupId || !memberId) {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인' })
        }

        const [linkCheckRegisteredResult, f1] = await pool.query(dbQuery.link_check_registered.queryString, [memberId, memberGroupId]);
        console.log('linkCheckRegisteredResult', linkCheckRegisteredResult)
        if (linkCheckRegisteredResult.length > 0) {
            let alreadyBody = {
                result: true,
                info: linkCheckRegisteredResult[0],
            };
            return sendRes(res, 200, alreadyBody);
        }

        else {
            let emptyBody = {
                result: false,
                code: 1001,
                message: 'Link가 연결되지 않은 유저입니다.'
            };
            return sendRes(res, 400, emptyBody);
        }

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

module.exports = { link_exist_GET };
