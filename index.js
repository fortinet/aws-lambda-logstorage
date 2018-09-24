'use strict';

/*
Author: Fortinet

The following Lambda function will be used for FortiOS log storage.

Currently the script has the following configurations (By environment variable):

TABLE_NAME: (DynamoDB table name)

*/


console.log('Loading Log Storage lambda function');

const AWS = require('aws-sdk');
// lock the API versions
AWS.config.apiVersions = {
    lambda: '2015-03-31',
    dynamodb: '2012-08-10',
    apiGateway: '2015-07-09'
};

const dynamodb = new AWS.DynamoDB.DocumentClient();

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

exports.handler = (event, context, callback) => {
    console.log(`Request received: \n${JSON.stringify(event)}`);
    console.log(`Context received: \n${JSON.stringify(context)}`);

    let item;

    try {
        item = new FStitchLog(event);
    } catch (e) {
        callback({
            errorMessage: 'Missing necessary log field.'
        });
        return;
    }

    console.log(`Item init: ${JSON.stringify(item, null, 2)}`);

    dynamodb.put({
        TableName: process.env.TABLE_NAME,
        Item: item
    }, function(error, data) {
        if (error) {
            let errorMessage = JSON.stringify(error, null, 2);
            console.log(`Failed to get for: ${errorMessage}`);
            callback(errorMessage);
        } else {
            console.log(`DynamoDB put succeeded: ${JSON.stringify(data, null, 2)}`);
            callback(null, item);
        }
    });
};
