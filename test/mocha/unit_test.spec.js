'use strict';
const path = require('path');
const REAL_PROJECT_ROOT = path.resolve(__dirname, '../../');
var chai = require('chai');
var AWS = require('aws-sdk');
var index;
var assert = chai.assert;
var dynamoDbPutMock, eventMock, callbackMock;
describe('Unit Testing', function() {
    describe('#', function() {
        before(function() {
            process.env.TABLE_NAME = 'test-tablename';
            dynamoDbPutMock = function() {
            };
            AWS.DynamoDB.DocumentClient = function() {
                this.put = function(data, cb) {
                    dynamoDbPutMock.call(this, data, cb);
                };
            };
            index = require(path.resolve(REAL_PROJECT_ROOT, 'index'));
        });
        beforeEach(function() {
            eventMock = {
                data: {
                    sn: 'test-sn',
                    rawlog: {
                        logid: 'test-logid'
                    },
                    stitch: 'test-stitch',
                    eventtype: 'test-eventtype',
                    time: Date.now() / 1000
                },
                email: 'test@test.com'
            };
            callbackMock = function() {
            };
            dynamoDbPutMock = function() {
            };
        });
        it('#handler exists', function(done) {
            assert.isFunction(index.handler);
            done();
        });
        it('#handler call through', function(done) {
            var logItemMock = {Item: {
                email: eventMock.email,
                eventType: eventMock.data.eventtype,
                logId: eventMock.data.rawlog.logid,
                serial: eventMock.data.sn,
                stitchName: eventMock.data.stitch,
                timestamp: eventMock.data.time * 1000,
                log: {logid: eventMock.data.rawlog.logid}
            }, TableName: process.env.TABLE_NAME};

            dynamoDbPutMock = function(data, cb) {
                assert.equal(data.TableName, 'test-tablename');
                assert.deepEqual(data, logItemMock);
                assert.isFunction(cb);
            };

            index.handler(eventMock, {}, callbackMock);
            // no email specified
            delete eventMock.email;
            dynamoDbPutMock = function(data, cb) {
                assert.equal(data.Item.email, '');
                assert.isFunction(cb);
            };
            index.handler(eventMock, {}, callbackMock);
            done();
        });

        it('#handler should handle invalid event format', function(done) {
            eventMock = {
                foo: 'bar'
            };
            callbackMock = function(data) {
                assert.isObject(data, 'callback parameter is object type');
                assert.property(data, 'errorMessage',
                    'callback parameter contains property: [errorMessage]');
            };
            index.handler(eventMock, {}, callbackMock);
            done();
        });

        it('#handler should handle error in dynamodb.put', function(done) {
            var testCallbackData = {foo: 'bar'};
            // test returning no error
            callbackMock = function(callbackError, callbackData) {
                assert.isNotNull(callbackData, 'callback data should not be null');
                assert.isNull(callbackError, 'callback error should be null');
            };
            dynamoDbPutMock = function(data, dbPutCallback) {
                assert.isNotNull(data);
                dbPutCallback(null, testCallbackData);
            };
            index.handler(eventMock, {}, callbackMock);

            // test returning error
            callbackMock = function(callbackError, callbackData) {
                assert.isNotNull(callbackError, 'callback error should not be null');
                assert.isUndefined(callbackData, 'callback data should be undefined');
            };
            dynamoDbPutMock = function(data, dbPutCallback) {
                assert.isNotNull(data);
                dbPutCallback(testCallbackData, null);
            };
            index.handler(eventMock, {}, callbackMock);
            done();
        });
    });
});
