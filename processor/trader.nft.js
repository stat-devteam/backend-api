"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');
const snsHandler = require('../modules/util_sns.js');

const nft_trader_publish_GET = async (req, res) => {
    console.log('nft_trader_publish_GET', req);

    try {
        const pool = await dbPool.getPool();
        const params = req.query;

        console.log('[Req] params', params);

        if (!params) {
            return sendRes(res, 400, { code: 1101, message: '[Shift] Parameter Missing' });
        }

        if (!params.memberId || !params.memberGroupId || !params.pageOffset || !params.pageSize) {
            return sendRes(res, 400, { code: 1101, message: '[Shift] Parameter Missing Check' });
        }

        let memberId = params.memberId;
        const memberGroupId = params.memberGroupId;
        const offset = parseInt(params.pageOffset);
        const pageSize = parseInt(params.pageSize);

        //1.check Link
        const [linkInfoResult, f1] = await pool.query(dbQuery.link_check_registered.queryString, [memberId, memberGroupId]);
        console.log('linkInfoResult', linkInfoResult);

        if (linkInfoResult.length === 0) {
            return sendRes(res, 400, { code: 1001, message: "Link가 연결되지 않음." })
        }

        // check is Trader?

        const linkNum = linkInfoResult[0].link_num;

        //[TASK] Get offset list
        const [trader_publish_list, f2] = await pool.query(dbQuery.trader_publish_list.queryString, [linkNum, offset, pageSize]);
        console.log('trader_publish_list', trader_publish_list);

        //[TASK] Get total count
        const [trader_publish_list_count, f3] = await pool.query(dbQuery.trader_publish_list_count.queryString, [linkNum]);
        console.log('trader_publish_list_count', trader_publish_list_count);

        var totalCount = parseInt(trader_publish_list_count[0].total);

        //[TASK] Get summery 
        const [trader_sales_sum, f4] = await pool.query(dbQuery.trader_sales_sum.queryString, [linkNum]);
        console.log('trader_sales_sum', trader_sales_sum);

        var sales = 0;
        if (trader_sales_sum[0].sum_sales) {
            sales = parseInt(trader_sales_sum[0].sum_sales);
        }
        return sendRes(res, 200, { result: true, sales: sales, list: trader_publish_list, totalCount: totalCount });

    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

const nft_trader_last_list_GET = async (req, res) => {
    console.log('nft_trader_list_GET', req);

    try {
        const pool = await dbPool.getPool();
        const params = req.query;

        console.log('[Req] params', params);

        if (!params) {
            return sendRes(res, 400, { code: 1101, message: '[Shift] Parameter Missing' });
        }

        if (!params.memberGroupId) {
            return sendRes(res, 400, { code: 1101, message: '[Shift] Parameter Missing Check' });
        }

        const memberGroupId = params.memberGroupId;

        //[TASK] Get trader last list
        const [trader_publish_last_list, f2] = await pool.query(dbQuery.trader_publish_last_list.queryString, [memberGroupId]);
        console.log('trader_publish_last_list', trader_publish_last_list);

        return sendRes(res, 200, { result: true, list: trader_publish_last_list });

    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

const nft_trader_schedule_GET = async (req, res) => {
    console.log('nft_trader_schedule_GET', req);

    try {
        const pool = await dbPool.getPool();
        
        const nowAt = Math.round(new Date().getTime() / 1000);
        
        console.log('trader_publish_schedule_time', nowAt);

        //[TASK] Get trader last list
        const [trader_publish_schedule_list, f2] = await pool.query(dbQuery.trader_publish_schedule_list.queryString, [nowAt]);
        console.log('trader_publish_schedule_list', trader_publish_schedule_list);

        for (let i = 0; i < trader_publish_schedule_list.length; ++i) {

            const message = {
                publisherId: trader_publish_schedule_list[i].id,
                isNew: true
            };
            const resultNotification = await snsHandler.sendNotification(process.env.SNS_PUBLISH_ARN, message);
            console.log('resultNotification', resultNotification);
        }
        
        return sendRes(res, 200, { result: true, list: trader_publish_schedule_list });

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

module.exports = { nft_trader_publish_GET, nft_trader_last_list_GET, nft_trader_schedule_GET };
