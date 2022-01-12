"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');
const smHandler = require('../modules/util_sm.js');
const kasHandler = require('../modules/util_kas.js');

const nft_token_GET = async(req, res) => {
    console.log('[nft_token_GET] req', req);

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

        const klipAddress = link_check_registered[0].klip_address;

        const [nft_token_get_from_trader, f2] = await pool.query(dbQuery.nft_token_get_from_trader.queryString, [trader_id, mbr_grp_id, klipAddress]);
        console.log('nft_token_get_from_trader', nft_token_get_from_trader)
        if (nft_token_get_from_trader.length <= 0) {
            let errorBody = {
                code: 7005,
                message: '해당 유저는 해당 트레이더의 NFT를 소유하고 있지 않습니다.',
            };
            console.log('[400] - (7005) 해당 유저는 해당 트레이더의 NFT를 소유하고 있지 않습니다.');
            return sendRes(res, 400, errorBody);
        }
        else {
            return sendRes(res, 200, { result: true, info: nft_token_get_from_trader });
        }

    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 9000, message: 'Unexpected Error', info: err.message })
    }

}


const nft_token_list_GET = async(req, res) => {
    console.log('[nft_validation_list_GET] req', req);

    try {
        const pool = await dbPool.getPool();

        const query = req.query;
        console.log('query', query)
        const type = query.type; //all, page
        const trader_id = query.traderId;
        const page_offset = query.pageOffset;
        const page_size = query.pageSize;

        if (!type) {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 - type' })
        }

        if (type === 'all') {
            if (trader_id) {
                const [nft_token_all_from_trader, f1] = await pool.query(dbQuery.nft_token_all_from_trader.queryString, [trader_id]);
                console.log('nft_token_all_from_trader', nft_token_all_from_trader)

                const body = {
                    list: nft_token_all_from_trader,
                }

                return sendRes(res, 200, body)

            }
            else {
                const [nft_token_all, f1] = await pool.query(dbQuery.nft_token_all.queryString, []);
                console.log('nft_token_all', nft_token_all)

                const body = {
                    list: nft_token_all,
                }
                return sendRes(res, 200, body)
            }
        }
        else if (type === 'page') {
            if (!page_offset || !page_size) {
                return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 - pageOffset, pageSize' })
            }
            let intPageOffset = parseInt(page_offset);
            let intPageSize = parseInt(page_size);
            if (trader_id) {
                const [nft_token_list_page_by_trader_id, f1] = await pool.query(dbQuery.nft_token_list_page_by_trader_id.queryString, [trader_id, intPageOffset, intPageSize]);
                console.log('nft_token_list_page_by_trader_id', nft_token_list_page_by_trader_id)
                const [nft_token_list_page_by_trader_id_count, f2] = await pool.query(dbQuery.nft_token_list_page_by_trader_id_count.queryString, [trader_id]);
                console.log('nft_token_list_page_by_trader_id_count', nft_token_list_page_by_trader_id_count)

                const body = {
                    list: nft_token_list_page_by_trader_id,
                    count: nft_token_list_page_by_trader_id_count[0].count
                }
                return sendRes(res, 200, body)
            }
            else {
                const [nft_token_list_page, f1] = await pool.query(dbQuery.nft_token_list_page.queryString, [intPageOffset, intPageSize]);
                console.log('nft_token_list_page', nft_token_list_page)
                const [nft_token_list_page_count, f2] = await pool.query(dbQuery.nft_token_list_page_count.queryString, []);
                console.log('nft_token_list_page_count', nft_token_list_page_count)

                const body = {
                    list: nft_token_list_page,
                    count: nft_token_list_page_count[0].count
                }
                return sendRes(res, 200, body)
            }

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

module.exports = { nft_token_GET, nft_token_list_GET };
