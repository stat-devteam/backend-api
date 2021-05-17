'use strict';

var moment = require('moment-timezone');
const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');
var CryptoJS = require("crypto-js");
const smHandler = require('../modules/util_sm.js');


const link_recovery_POST = async(req, res) => {
    console.log('[link_recovery_POST] req', req);

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
        const aesSecretKey = secretValue.aes_secret_key;
        var key = CryptoJS.enc.Base64.parse(aesSecretKey);
        const aesEncryptMemberId = CryptoJS.AES.encrypt(memberId, key, {
            mode: CryptoJS.mode.ECB
        }).toString();
        console.log('aesEncryptMemberId', aesEncryptMemberId)

        const [linkExistResult, f1] = await pool.query(dbQuery.link_cancel_get.queryString, [aesEncryptMemberId, memberGroupId]);

        console.log('[recovery target] linkExistResult', linkExistResult)

        if (linkExistResult.length == 0) {
            let errorBody = {
                code: 1009,
                message: '[Shift] Link 해지 대기에 요청 받은 정보가 없습니다.',
            };
            console.log('[400] - (1009) Link 해지 대기에 요청 받은 정보가 없습니다.');
            console.log('linkExistResult', linkExistResult);
            return sendRes(res, 400, errorBody);
        }
        const aesMemberId = linkExistResult[0].mbr_id;
        console.log('aesMemberId', aesMemberId);
        var originalMemberId = CryptoJS.AES.decrypt(aesMemberId, key, {
            mode: CryptoJS.mode.ECB
        }).toString(CryptoJS.enc.Utf8);
        console.log('originalMemberId', originalMemberId)

        const linkInfo = linkExistResult[0];
        const link_num = linkInfo.link_num;
        const mbr_grp_id = linkInfo.mbr_grp_id;
        const klip_address = linkInfo.klip_address;
        const svc_grp_id = linkInfo.svc_grp_id;
        const svc_id = linkInfo.svc_id;
        const klip_new = linkInfo.klip_new;
        const reg_dt = linkInfo.reg_dt;

        const [linkInsertResult, f2] = await pool.query(dbQuery.link_insert.queryString, [
            link_num,
            mbr_grp_id,
            originalMemberId,
            klip_address,
            reg_dt,
            svc_grp_id,
            svc_id,
            klip_new,
        ]);

        console.log('linkInsertResult', linkInsertResult);
        const [linkCancelDelete, f3] = await pool.query(dbQuery.link_cancel_delete.queryString, [aesEncryptMemberId, memberGroupId]);
        console.log('linkCancelDelete', linkCancelDelete);
        return sendRes(res, 200, { result: true });

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

module.exports = { link_recovery_POST };
