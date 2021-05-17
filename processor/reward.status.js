"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

const reward_status_GET = async(req, res) => {
    console.log('[reward_status_GET] req', req);

    try {
        const pool = await dbPool.getPool();

        const transferSequence = req.query.transferSequence;

        if (!transferSequence) {
            return sendRes(res, 400, { code: 3000, message: 'ERROR', info: '요청 파라미터 확인' })
        }
        const [satusResult, f1] = await pool.query(dbQuery.transfer_status.queryString, [transferSequence]);

        if (satusResult.length === 0) {
            return sendRes(res, 400, {
                code: 1014,
                message: 'Transfer 기록이 없습니다.',

            })
        }

        let returnBody = {
            transactionStatus: satusResult[0].tx_status
        };


        return sendRes(res, 200, returnBody);



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

module.exports = { reward_status_GET };
