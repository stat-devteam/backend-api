"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');
const smHandler = require('../modules/util_sm.js');

const nft_validation_GET = async(req, res) => {
    console.log('[nft_validation_GET] req', req);

    try {
        const pool = await dbPool.getPool();
        const klipSecretValue = await smHandler.getSecretValue(process.env.KLIP_SM_ID);

        const query = req.query;
        const mbr_id = query.memberId;
        const mbr_grp_id = query.memberGroupId;
        const trader_id = query.traderId;

        const [link_check_registered, f1] = await pool.query(dbQuery.link_check_registered.queryString, [mbr_id, mbr_grp_id]);
        if (link_check_registered.length == 0) {
            let errorBody = {
                code: 1001,
                message: 'Link가 연결되지 않은 유저입니다.'
            };
            return sendRes(res, 400, errorBody);
        }

        const [nft_validation_by_mbr_id, f2] = await pool.query(dbQuery.nft_validation_by_mbr_id.queryString, [mbr_id, mbr_grp_id, trader_id]);
        console.log('nft_validation_by_mbr_id', nft_validation_by_mbr_id)
        if (nft_validation_by_mbr_id.length <= 0) {
            let errorBody = {
                code: 7005,
                message: '해당 유저는 해당 트레이더의 NFT를 소유하고 있지 않습니다.',
            };
            console.log('[400] - (7005) 해당 유저는 해당 트레이더의 NFT를 소유하고 있지 않습니다.');
            return sendRes(res, 400, errorBody);
        }

        return sendRes(res, 200, { result: true });


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

module.exports = { nft_validation_GET };
