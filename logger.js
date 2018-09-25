'use strict';

/*
Author: Fortinet
*/
exports = module.exports;

/**
 * Wrap the given console object. outputs using info(), debug(), warn(), and error() will be padded
 * with addtional 'info:', 'debug:', 'warn:', 'error:' respectively at the beginning. log() remains
 * unchanged. Additionally, outputs using info() and debug() will be shown or not based on the
 * node process environment variable DEBUG_MODE:
 * If proess.env.DEBUG_MODE is undefined, null, or an empty string, hide outputs for info(), debug()
 * all other cases: show outputs for info(), debug()
 * Note: This change applies to the entire process session. Remember to unwrap it after use.
 *
 * @param {Object} console The console object to wrap
 */
function wrapConsole(console) {
    if (console && typeof console.info === 'function') {
        console._info = console.info;
        console.info = function() {
            if (!process.env.DEBUG_MODE === false) {
                this._info.apply(this, ['info:'].concat(Array.from(arguments)));
            }
        };
    }
    if (console && typeof console.debug === 'function') {
        console._debug = console.debug;
        console.debug = function() {
            if (!process.env.DEBUG_MODE === false) {
                this._info.apply(this, ['debug:'].concat(Array.from(arguments)));
            }
        };
    }
    if (console && typeof console.warn === 'function') {
        console._warn = console.warn;
        console.warn = function() {
            this._warn.apply(this, ['warn:'].concat(Array.from(arguments)));
        };
    }
    if (console && typeof console.error === 'function') {
        console._error = console.error;
        console.error = function() {
            this._error.apply(this, ['error:'].concat(Array.from(arguments)));
        };
    }
}

/**
 * Try to restore the original functionality of the given console object if its log, info, warn,
 * error, and debug functions were previously wrapped.
 * @param {Object} console The wrapped console object
 */
function unwrapConsole(console) {
    if (console && typeof console._info === 'function') {
        console.info = console._info;
        delete console._info;
    }
    if (console && typeof console._debug === 'function') {
        console.debug = console._debug;
        delete console._debug;
    }
    if (console && typeof console._warn === 'function') {
        console.warn = console._warn;
        delete console._warn;
    }
    if (console && typeof console._error === 'function') {
        console.error = console._error;
        delete console._error;
    }
}
exports.wrapConsole = wrapConsole;
exports.unwrapConsole = unwrapConsole;
