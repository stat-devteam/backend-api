"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

const link_exist_GET = async(req, res) => {

    try {
        const pool = await dbPool.getPool();

        const memberGroupId = req.query.memberGroupId;
        const memberId = req.query.memberId;

        if (!memberGroupId || !memberId) {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인' })
        }

        const [linkCheckRegisteredResult, f1] = await pool.query(dbQuery.link_check_registered.queryString, [memberId, memberGroupId]);

        if (linkCheckRegisteredResult.length > 0) {
            let alreadyBody = {
                result: true,
            };

            return sendRes(res, 200, alreadyBody);

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
    return res.status(status).cors().json(body);
};

module.exports = { link_exist_GET };
