'use strict';

const test_GET = async(req, res) => {
    return sendRes(200, { status: 'ok', num: 1 });
}

const sendRes = (status, body) => {
    var response = {
        statusCode: status,
        headers: {
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(body)
    };
    return response;
};

module.exports = { test_GET };
