"use strict";
var axios = require("axios").default;
var smHandler = require('./util_sm.js');
const kasInfo = require('../resource/kas.json');
const BigNumber = require('bignumber.js');

const getTransactionStatus = async(tx_hash, type) => {
    //type있는 이유는 nft일 경우 xChainId 8217 고정

    console.log('[kas-util] getTransactionStatus');
    console.log('param tx_hash', tx_hash);
    const secretValue = await smHandler.getSecretValue(process.env.SM_ID);

    //[TASK] CHECK TRANSACTION [KAS]
    const satusCheckUrl = kasInfo.apiUrl + 'tx/' + tx_hash;
    const checkHeader = {
        'Authorization': secretValue.kas_authorization,
        'Content-Type': 'application/json',
        'x-chain-id': type === 'nft' ? 8217 : process.env.KAS_xChainId,
    };

    const txStatusResult = await axios
        .get(satusCheckUrl, {
            headers: checkHeader,
        })
        .catch((err) => {
            console.log('[KAS] Check Transaction ERROR', err.response);
            return { error: err.response }
        });

    console.log('txStatusResult', txStatusResult);
    if (txStatusResult.error) {
        let data = txStatusResult.error.data;
        return {
            result: false,
            data: data
        }
    }
    else {

        return {
            result: true,
            data: txStatusResult.data
        }
    }
}




module.exports = { getTransactionStatus }
