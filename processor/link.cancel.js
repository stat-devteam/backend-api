'use strict';

var moment = require('moment-timezone');
const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');
var CryptoJS = require("crypto-js");
const smHandler = require('../modules/util_sm.js');


const link_cancel_POST = async(req, res) => {
    console.log('[link_cancel_POST]');

    let body = req.body;
    console.log('body', body);
    const memberId = body.memberId;
    const memberGroupId = body.memberGroupId;

    if (!body || !memberId || !memberGroupId) {
        return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 memberId, memberGroupId' })
    }

    try {
        const pool = await dbPool.getPool();
        const secretValue = await smHandler.getSecretValue(process.env.SM_ID);

        const [linkExistResult, f1] = await pool.query(dbQuery.link_check_registered.queryString, [memberId, memberGroupId]);
        //[중요] 삭제하는 원본 데이터의 기록을 남기기위한 로그
        console.log('[delete target] linkExistResult', linkExistResult)

        if (linkExistResult.length == 0) {
            let errorBody = {
                code: 1001,
                message: '[Shift] Link 해정보가 없습니다.',
            };
            console.log('[400] - (1001) Link 정보가 없습니다.');
            console.log('linkExistResult', linkExistResult);
            return sendRes(res, 400, errorBody);
        }

        const aesSecretKey = secretValue.aes_secret_key;
        const linkInfo = linkExistResult[0];
        const link_num = linkInfo.link_num;
        const mbr_grp_id = linkInfo.mbr_grp_id;
        var key = CryptoJS.enc.Base64.parse(aesSecretKey);
        const aes_mbr_id = CryptoJS.AES.encrypt(linkInfo.mbr_id, key, {
            mode: CryptoJS.mode.ECB
        }).toString();
        console.log('mbr_id', linkInfo.mbr_id)
        console.log('aes_mbr_id', aes_mbr_id)
        const klip_address = linkInfo.klip_address;
        const svc_grp_id = linkInfo.svc_grp_id;
        const svc_id = linkInfo.svc_id;
        const klip_new = linkInfo.klip_new;
        const reg_dt = linkInfo.reg_dt;

        const [linkCancelInsert, f2] = await pool.query(dbQuery.link_cancel_insert.queryString, [
            link_num,
            mbr_grp_id,
            aes_mbr_id,
            klip_address,
            reg_dt,
            svc_grp_id,
            svc_id,
            klip_new,
        ]);
        console.log('linkCancelInsert', linkCancelInsert);

        const [linkDeleteResult, f3] = await pool.query(dbQuery.link_delete.queryString, [memberId, memberGroupId]);
        console.log('linkDeleteResult', linkDeleteResult);

        return sendRes(res, 200, { result: true })

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

module.exports = { link_cancel_POST };
