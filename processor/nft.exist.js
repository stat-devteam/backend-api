"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

const nft_exist_GET = async(req, res) => {
    console.log('[nft_exist_GET] req', req);

    try {
        const pool = await dbPool.getPool();

        const memberGroupId = req.query.memberGroupId;
        const memberId = req.query.memberId;
        const traderId = req.query.traderId;

        if (!memberGroupId || !memberId || !traderId) {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인' })
        }


        //validation link - member, tarder
        const [linkCheckRegisteredResult, f1] = await pool.query(dbQuery.link_check_registered.queryString, [memberId, memberGroupId]);
        console.log('linkCheckRegisteredResult', linkCheckRegisteredResult)
        if (linkCheckRegisteredResult.length === 0) {
            let emptyBody = {
                result: false,
                code: 1001,
                message: 'Link가 연결되지 않은 유저입니다.'
            };
            return sendRes(res, 400, emptyBody);
        }

        const [traderLinkCheckRegisteredResult, f2] = await pool.query(dbQuery.link_check_registered.queryString, [traderId, memberGroupId]);
        console.log('traderLinkCheckRegisteredResult', traderLinkCheckRegisteredResult)
        if (traderLinkCheckRegisteredResult.length === 0) {
            let emptyBody = {
                result: false,
                code: 1001,
                message: 'Link가 연결되지 않은 트레이더입니다.'
            };
            return sendRes(res, 400, emptyBody);
        }


        const [nftTokenListResult, f3] = await pool.query(dbQuery.nft_token_list_by_member_trader.queryString, [memberId, memberGroupId, traderId, memberGroupId]);
        if (nftTokenListResult.length === 0) {
            let emptyBody = {
                result: false,
                code: 7005,
                message: '해당 유저는 해당 트레이더의 NFT를 소유하고 있지 않습니다.'
            };
            return sendRes(res, 400, emptyBody);
        }
        else {
            let existBody = {
                result: true,
            }
            return sendRes(res, 200, existBody);
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

module.exports = { nft_exist_GET };
