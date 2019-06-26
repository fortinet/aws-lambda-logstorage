'use strict';
const path = require('path');
const sinon = require('sinon');
const REAL_PROJECT_ROOT = path.resolve(__dirname, '../../');
var chai = require('chai');
var AWS = require('aws-sdk');
var index, logger;
var assert = chai.assert;
var dynamoDbPutMock, eventMock, callbackMock;
describe('Unit Testing', function() {
    describe('#index.js', function() {
        before(function() {
            process.env.TABLE_NAME = 'test-tablename';
            dynamoDbPutMock = function() {};
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
            callbackMock = function() {};
            dynamoDbPutMock = function() {};
        });
        it('#handler exists', function(done) {
            assert.isFunction(index.handler);
            done();
        });
        it('#handler call through', function(done) {
            var logItemMock = {
                Item: {
                    email: eventMock.email,
                    eventType: eventMock.data.eventtype,
                    logId: eventMock.data.rawlog.logid,
                    serial: eventMock.data.sn,
                    stitchName: eventMock.data.stitch,
                    timestamp: eventMock.data.time * 1000,
                    log: { logid: eventMock.data.rawlog.logid }
                },
                TableName: process.env.TABLE_NAME
            };

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
                assert.property(
                    data,
                    'errorMessage',
                    'callback parameter contains property: [errorMessage]'
                );
            };
            index.handler(eventMock, {}, callbackMock);
            done();
        });

        it('#handler should handle error in dynamodb.put', function(done) {
            var testCallbackData = { foo: 'bar' };
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
    describe('#logger.js', function() {
        before(function() {
            logger = require(path.resolve(REAL_PROJECT_ROOT, 'logger'));
            logger.unwrapConsole(console);
        });
        it('#wrap and unwrap console', function() {
            assert.isUndefined(console._info, '_info should be undefined before wrap');
            assert.isUndefined(console._debug, '_debug should be undefined before wrap');
            assert.isUndefined(console._warn, '_warn should be undefined before wrap');
            assert.isUndefined(console._error, '_error should be undefined before wrap');
            logger.wrapConsole(console);
            assert.isDefined(console._info, '_info should be defined after wrap');
            assert.isDefined(console._debug, '_debug should be defined after wrap');
            assert.isDefined(console._warn, '_warn should be defined after wrap');
            assert.isDefined(console._error, '_error should be defined after wrap');
            logger.unwrapConsole(console);
            assert.isUndefined(console._info, '_info should be undefined after unwrap');
            assert.isUndefined(console._debug, '_debug should be undefined after unwrap');
            assert.isUndefined(console._warn, '_warn should be undefined after unwrap');
            assert.isUndefined(console._error, '_error should be undefined after unwrap');
        });
        describe('#check against DEBUG_MODE', function() {
            beforeEach(function() {
                delete process.env.DEBUG_MODE;
                logger.wrapConsole(console);
            });
            afterEach(function() {
                logger.unwrapConsole(console);
            });
            it('#console.info(), debug(), warn(), and error() should be called when DEBUG_MODE on', function(done) {
                process.env.DEBUG_MODE = true;
                let _infoGetCalled = false,
                    _debugGetCalled = false,
                    _warnGetCalled = false,
                    _errorGetCalled = false;
                var stubInfo = sinon.stub(console, '_info').callsFake(function() {
                    _infoGetCalled = true;
                });
                var stubDebug = sinon.stub(console, '_debug').callsFake(function() {
                    _debugGetCalled = true;
                });
                var stubWarn = sinon.stub(console, '_warn').callsFake(function() {
                    _warnGetCalled = true;
                });
                var stubError = sinon.stub(console, '_error').callsFake(function() {
                    _errorGetCalled = true;
                });
                console.log('test');
                console.info('test');
                console.warn('test');
                console.error('test');
                console.debug('test');
                stubInfo.restore();
                stubDebug.restore();
                stubWarn.restore();
                stubError.restore();

                assert.isTrue(_infoGetCalled, '_info get called');
                assert.isTrue(_debugGetCalled, '_debug get called');
                assert.isTrue(_warnGetCalled, '_warn get called');
                assert.isTrue(_errorGetCalled, '_error get called');
                done();
            });
            it('#console.info(), debug() should NOT be called when DEBUG_MODE off', function(done) {
                delete process.env.DEBUG_MODE;
                let _infoGetCalled = false,
                    _debugGetCalled = false,
                    _warnGetCalled = false,
                    _errorGetCalled = false;
                var stubInfo = sinon.stub(console, '_info').callsFake(function() {
                    _infoGetCalled = true;
                });
                var stubDebug = sinon.stub(console, '_debug').callsFake(function() {
                    _debugGetCalled = true;
                });
                var stubWarn = sinon.stub(console, '_warn').callsFake(function() {
                    _warnGetCalled = true;
                });
                var stubError = sinon.stub(console, '_error').callsFake(function() {
                    _errorGetCalled = true;
                });
                console.log('test');
                console.info('test');
                console.warn('test');
                console.error('test');
                console.debug('test');
                stubInfo.restore();
                stubDebug.restore();
                stubWarn.restore();
                stubError.restore();

                assert.isFalse(_infoGetCalled, '_info not get called');
                assert.isFalse(_debugGetCalled, '_debug not get called');
                assert.isTrue(_warnGetCalled, '_warn get called');
                assert.isTrue(_errorGetCalled, '_error get called');
                done();
            });
        });
    });
});
