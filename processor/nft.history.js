"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');
const smHandler = require('../modules/util_sm.js');
const kasHandler = require('../modules/util_kas.js');


const nft_history_list_GET = async(req, res) => {
    console.log('[nft_history_list_GET] req', req);

    try {
        const pool = await dbPool.getPool();

        const query = req.query;
        console.log('query', query)
        const mbr_grp_id = query.memberGroupId;
        const cursor_id = query.cursorId;
        const cursor_size = query.cursorSize;

        if (!mbr_grp_id) {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 - memberGroupId' })
        }
        if (!cursor_id || !cursor_size) {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 - cursor info' })
        }

        let intCursorId = parseInt(cursor_id);
        let intCursorSize = parseInt(cursor_size);

        const [nft_history_list_from_cursor, f1] = await pool.query(dbQuery.nft_history_list_from_cursor.queryString, [mbr_grp_id, intCursorId, intCursorSize]);
        console.log('nft_history_list_from_cursor', nft_history_list_from_cursor)

        const body = {
            list: nft_history_list_from_cursor
        }

        return sendRes(res, 200, body)

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

module.exports = { nft_history_list_GET };
