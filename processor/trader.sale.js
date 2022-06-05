"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');
const snsHandler = require('../modules/util_sns.js');
const BigNumber = require('bignumber.js');
const moment = require("moment-timezone");

const trader_sale_info_GET = async (req, res) => {
    console.log('trader_sale_info_GET', req);

    try {
        const pool = await dbPool.getPool();
        const params = req.query;

        console.log('[Req] params', params);

        if (!params) {
            return sendRes(res, 400, { code: 1101, message: '[Shift] Parameter Missing' });
        }

        if (!params.memberId || !params.memberGroupId) {
            return sendRes(res, 400, { code: 1101, message: '[Shift] Parameter Missing Check' });
        }

        let memberId = params.memberId;
        const memberGroupId = params.memberGroupId;
        const [publisherLaestRows, f1] = await pool.query(dbQuery.trader_sale_latest.queryString, [memberGroupId, memberId]);
        console.log('publisherLaestRows',publisherLaestRows)
        
 
        if(publisherLaestRows.length===0) {
            return sendRes(res, 200, { result: false , object:null});
        } else {
            let target = publisherLaestRows[0];
            let return_obj = {
                type : target.type,
                status : target.status,
                amount : target.max_publisher,
                degree : target.now_publisher,
                sales : target.sales,
            }

            //price
            let pebPrice = new BigNumber(target.starting_price);
            let klayUnit = new BigNumber(1e18);
            let klayPrice = pebPrice.dividedBy(klayUnit).toString(10);
            return_obj.price =Number(klayPrice);
                
            //start, end Date
            let initUnix = target.expired_at - target.period;
            console.log('target.expired_at',target.expired_at);
            console.log('initUnix',initUnix);

            let startDate  = target.type ==='BuyNow' ? null: moment(target.expired_at * 1000).tz('Asia/Seoul').format("YYYY-MM-DDTHH:mm:ss");
            let endDate  = target.type ==='BuyNow' ? null:moment(initUnix * 1000).tz('Asia/Seoul').format("YYYY-MM-DDTHH:mm:ss")
            return_obj.startDate =startDate;
            return_obj.endDate =endDate;
            
            
            return sendRes(res, 200, { result: true,  object: return_obj});         
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

module.exports = { trader_sale_info_GET };
