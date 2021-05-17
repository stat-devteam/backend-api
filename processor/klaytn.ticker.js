"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');
const smHandler = require('../modules/util_sm.js');
var jwt = require('jsonwebtoken');
var moment = require('moment-timezone');
const axios = require('axios').default;
const gdacInfo = require('../resource/gdac.json');

const klaytn_ticker_GET = async(req, res) => {

    try {
        console.log('[klaytn_ticker_GET] req', req);
        const secretValue = await smHandler.getSecretValue(process.env.SM_ID);
        console.log('secretValue', secretValue)
        let gdacApiKey = secretValue.gdac_api_key;
        let gdacSecretKey = secretValue.gdac_secret_key;
        console.log('gdacApiKey', gdacApiKey)
        console.log('gdacSecretKey', gdacSecretKey)

        const payload = {
            'api_key': "api:ak:" + gdacApiKey,
            'nonce': moment(new Date()).tz('Asia/Seoul').format('YYYY-MM-DDTHH:mm:ss[Z]')
        }

        console.log('payload', payload)
        const jwtToken = jwt.sign(payload, gdacSecretKey, { algorithm: 'HS256' })
        console.log('jwtToken', jwtToken)
        const headers = { 'Authorization': 'Bearer ' + jwtToken }
        console.log('headers', headers);

        const gdacResponse = await axios
            .get(gdacInfo.apiUrl, {
                headers: headers,
            })
            .catch((err) => {
                return { error: err.response }
            });

        if (gdacResponse.error) {
            console.log('gdacResponse.error', gdacResponse.error)
            let errorData = gdacResponse.error.data;
            console.log('errorData', errorData)

            let code = errorData.code;

            let errorBody = {
                result: false,
                code: code,
            };
            return sendRes(res, 400, errorBody);

        }
        else {
            console.log('gdacResponse', gdacResponse)
            let resultBody = {
                result: true,
                data: gdacResponse.data,
                last: gdacResponse.data.last
            };
            return sendRes(res, 200, resultBody);
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

module.exports = { klaytn_ticker_GET };
