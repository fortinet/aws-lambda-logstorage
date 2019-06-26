'use strict';

/*

The following Lambda function will be used for FortiOS log storage.

Currently the script has the following configurations (By environment variable):

TABLE_NAME: (DynamoDB table name)

Version: 1.0.0-beta

Author: Fortinet

*/

const AWS = require('aws-sdk');
const logger = require('./logger');
logger.wrapConsole(console);
console.debug('Loading Log Storage lambda function');

// lock the API versions
AWS.config.apiVersions = {
    lambda: '2015-03-31',
    dynamodb: '2012-08-10',
    apiGateway: '2015-07-09'
};

const dynamodb = new AWS.DynamoDB.DocumentClient();

const createApiGatewayResponse = function(httpStatusCode, body, headers, isBase64Encoded = false) {
    var response = {
        isBase64Encoded: !!isBase64Encoded,
        statusCode: isNaN(httpStatusCode) ? 500 : parseInt(httpStatusCode),
        body: ''
    };
    try {
        if (headers) {
            response.headers = headers;
        }
        if (body) {
            response.body = body;
        }
    } catch (error) {
        response.statusCode = 500;
        response.body = error.errorMessage;
    }
    return response;
};

function FStitchLog(params) {
    // primary fields
    this.serial = params.data.sn;
    this.logId = params.data.rawlog.logid;

    // information fields
    this.email = params.email || '';
    this.stitchName = params.data.stitch;
    this.eventType = params.data.eventtype;
    this.timestamp = params.data.time * 1000;

    // log fields
    this.log = params.data.rawlog;
}

exports.handler = async (event, context, callback) => {
    console.debug(`Request received: \n${JSON.stringify(event)}`);
    console.debug(`Context received: \n${JSON.stringify(context)}`);

    let item, responseStatusCode, body, headers;

    try {
        // make this function compatible with Api Gateway whether using aws
        // proxy integration or not.
        // TODO: fix this:
        // eslint-disable-next-line no-prototype-builtins
        body = event.hasOwnProperty('body') ? JSON.parse(event.body) : event;
        item = new FStitchLog(body);
    } catch (e) {
        callback(
            null,
            createApiGatewayResponse(500, {
                errorMessage: 'Missing necessary log field.'
            })
        );
        return;
    }

    console.debug(`Item init: ${JSON.stringify(item, null, 2)}`);

    try {
        let data = await dynamodb
            .put({
                TableName: process.env.TABLE_NAME,
                Item: item
            })
            .promise();
        responseStatusCode = 200;
        body = JSON.stringify(item);
        console.info(`DynamoDB put succeeded: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
        responseStatusCode = 500;
        body = JSON.stringify(error, null, 2);
        console.error(`Failed to get for: ${body}`);
    }
    logger.unwrapConsole(console);
    callback(null, createApiGatewayResponse(responseStatusCode, body, headers));
};
