"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

const link_list_GET = async(req, res) => {
    console.log('[link_list_GET] req', req);

    try {
        const pool = await dbPool.getPool();

        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        let serviceGroupId = req.query.serviceGroupId;
        const type = req.query.type;


        if (!startDate || !endDate) {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인' })
        }

        if (!serviceGroupId) {
            console.log('all case')
            serviceGroupId = [];

            const [serviceGroupAllResult, f1] = await pool.query(dbQuery.service_group_get_all.queryString, []);
            for (let i in serviceGroupAllResult) {
                serviceGroupId.push(serviceGroupAllResult[i].svc_grp_id)
            }
            console.log('serviceGroupAllResult', serviceGroupAllResult);
        }
        console.log('serviceGroupId', serviceGroupId)

        if (type === 'count') {
            const [linkCountResult, f2] = await pool.query(dbQuery.link_get_list_count.queryString, [startDate, endDate, serviceGroupId]);
            return sendRes(res, 200, {
                count: linkCountResult[0].count,
            });

        }
        else {
            const [linkAllResult, f2] = await pool.query(dbQuery.link_get_list.queryString, [startDate, endDate, serviceGroupId]);
            return sendRes(res, 200, {
                list: linkAllResult,
            });
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

module.exports = { link_list_GET };
