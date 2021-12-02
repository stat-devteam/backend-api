"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

const nft_list_GET = async(req, res) => {
    console.log('[nft_exist_GET] req', req);

    try {
        const pool = await dbPool.getPool();
        const type = req.query.type;
        const pageOffset = parseInt(req.query.pageOffset) || 0;
        const pageSize = parseInt(req.query.pageSize) || 10;

        if (type === 'all') {
            const memberGroupId = req.query.memberGroupId;
            if (!memberGroupId) {
                return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인' })
            }

            const [nftTokenListResult, f1] = await pool.query(dbQuery.nft_token_list_all.queryString, [memberGroupId, pageOffset, pageSize]);
            const [nftTokenListCountResult, f2] = await pool.query(dbQuery.nft_token_list_all_count.queryString, [memberGroupId]);
            return sendRes(res, 200, { result: true, list: nftTokenListResult, totalCount: nftTokenListCountResult[0].total, })
        }

        else if (type === 'member') {
            const memberGroupId = req.query.memberGroupId;
            const memberId = req.query.memberId;
            if (!memberGroupId || !memberId) {
                return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인' })
            }
            const [nftTokenListResult, f1] = await pool.query(dbQuery.nft_token_list_member.queryString, [memberGroupId, memberId, memberGroupId, pageOffset, pageSize]);
            const [nftTokenListCountResult, f2] = await pool.query(dbQuery.nft_token_list_member_count.queryString, [memberGroupId, memberId, memberGroupId]);
            return sendRes(res, 200, { result: true, list: nftTokenListResult, totalCount: nftTokenListCountResult[0].total, })
        }

        else if (type === 'trader') {
            const memberGroupId = req.query.memberGroupId;
            const traderId = req.query.traderId;
            if (!memberGroupId || !traderId) {
                return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인' })
            }
            const [nftTokenListResult, f1] = await pool.query(dbQuery.nft_token_list_trader.queryString, [traderId, memberGroupId, memberGroupId, pageOffset, pageSize]);
            const [nftTokenListCountResult, f2] = await pool.query(dbQuery.nft_token_list_trader_count.queryString, [traderId, memberGroupId, memberGroupId]);
            return sendRes(res, 200, { result: true, list: nftTokenListResult, totalCount: nftTokenListCountResult[0].total, })
        }
        else {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 - type' })

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

module.exports = { nft_list_GET };
