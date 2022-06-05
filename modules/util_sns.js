"use strict";

var AWS = require('aws-sdk');

console.log("[SNS Util]", "init...");

const snsClient = new AWS.SNS({
    region: 'ap-northeast-2',
    apiVersion: '2010-03-31'
});

const sendNotification = async(arnKey, message) => {

    let params = {
        TopicArn: arnKey,
        Message: JSON.stringify(message)
    }
    console.log("[SNS Util]", "params..", params);

    const result = await snsClient.publish(params).promise();

    console.log("[SNS Util]", "[publish]", "result...", result);
    return result;
}

module.exports = { sendNotification }
