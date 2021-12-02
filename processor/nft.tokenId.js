"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

const nft_tokenId_GET = async(req, res) => {
    console.log('[nft_tokenId_GET] req', req);

    try {
        const pool = await dbPool.getPool();

        if (!req.params.token_id) {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 - tokenId' })
        }
        const token_id = req.params.token_id;
        console.log('token_id', token_id);

        const [nftTokenResult, f1] = await pool.query(dbQuery.nft_token_by_token_id.queryString, [token_id]);
        console.log('nftTokenResult', nftTokenResult)
        if (nftTokenResult.length === 0) {
            let emptyBody = {
                result: false,
                code: 7006,
                message: '유효하지 않은 token_id 입니다.'
            };
            return sendRes(res, 400, emptyBody);
        }
        else {

            return sendRes(res, 200, { result: true, info: nftTokenResult[0] });
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

module.exports = { nft_tokenId_GET };
