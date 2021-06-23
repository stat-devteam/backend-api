"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

const nft_validation_list_GET = async(req, res) => {
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
                const [nft_validation_list_all_by_trader_id, f1] = await pool.query(dbQuery.nft_validation_list_all_by_trader_id.queryString, [trader_id]);
                console.log('nft_validation_list_all_by_trader_id', nft_validation_list_all_by_trader_id)

                const body = {
                    list: nft_validation_list_all_by_trader_id,
                }

                return sendRes(res, 200, body)

            }
            else {
                const [nft_validation_list_all, f1] = await pool.query(dbQuery.nft_validation_list_all.queryString, []);
                console.log('nft_validation_list_all', nft_validation_list_all)

                const body = {
                    list: nft_validation_list_all,
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
                const [nft_validation_list_page_by_trader_id, f1] = await pool.query(dbQuery.nft_validation_list_page_by_trader_id.queryString, [trader_id, intPageOffset, intPageSize]);
                console.log('nft_validation_list_page_by_trader_id', nft_validation_list_page_by_trader_id)
                const [nft_validation_list_page_by_trader_id_count, f2] = await pool.query(dbQuery.nft_validation_list_page_by_trader_id_count.queryString, [trader_id]);
                console.log('nft_validation_list_page_by_trader_id_count', nft_validation_list_page_by_trader_id_count)

                const body = {
                    list: nft_validation_list_page_by_trader_id,
                    count: nft_validation_list_page_by_trader_id_count[0].count
                }
                return sendRes(res, 200, body)
            }
            else {
                const [nft_validation_list_page, f1] = await pool.query(dbQuery.nft_validation_list_page.queryString, [intPageOffset, intPageSize]);
                console.log('nft_validation_list_page', nft_validation_list_page)
                const [nft_validation_list_page_count, f2] = await pool.query(dbQuery.nft_validation_list_page_count.queryString, []);
                console.log('nft_validation_list_page_count', nft_validation_list_page_count)

                const body = {
                    list: nft_validation_list_page,
                    count: nft_validation_list_page_count[0].count
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

module.exports = { nft_validation_list_GET };
