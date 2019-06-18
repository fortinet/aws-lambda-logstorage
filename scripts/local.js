'use strict';
/*
Author: Fortinet

This script intends to run the project in local node dev environment instead of AWS Lambda over the
cloud, for local development purpose.
Please install aws-cli and configure it with a proper AWS account you use for development.

requirements:
The lambda function entry is index.js by default. Or change it on line 54.
The lambda function entry and local.js must be situated in the same directory.

This script accept a few command line arguments. See the argument list below:

Argument list:
--entry (optional): the script entry to load. Default to 'index'
--handler (optional): the handler function to call from exports. Default to 'handler'
--event (optional): the file path to an external resource as an input event.
--set-env (optional): the file path to a script to load environment variables into process.

To load a set of variables into process.env, you can also create a separate script in the 'local'
directory. Then specify the file path as the second argument when you execute the local.js script
via 'npm run local.js' command.

*/
console.log('Start to run in local environment...');
var fs = require('fs'),
    path = require('path');

var event = null,
    context = {},
    callback = function(context, response) { // eslint-disable-line no-shadow
        console.log('handle callback is called with:', response, context);
    };

function parseArgs(argv) {
    let pairs = {};
    let key = null;
    for (let arg of argv) {
        if (typeof arg === 'string' && arg.substr(0, 2) === '--') {
            key = arg.substr(2);
        } else if (key !== null) {
            if (typeof arg === 'string') {
                pairs[key] = arg.trim();
            }
            key = null;
        }
    }
    return pairs;
}

let argv = parseArgs(process.argv);

let entry = argv.entry ? argv.entry : `${__dirname}/index`,
    handlerName = argv.handler ? argv.handler : 'handler';

if (argv['set-env']) {
    require(require.resolve(path.resolve(process.cwd(), argv['set-env'])));
}
if (argv.event && fs.existsSync(path.resolve(process.cwd(), argv['set-env']))) {
    const data = fs.readFileSync(path.resolve(process.cwd(), argv.event));
    try {
        event = JSON.parse(data.toString());
    } catch (e) {
        throw e;
    }
}

// load entry script with an event
var entryScript = require(require.resolve(entry));
console.log('Loading entry script...');
entryScript[handlerName].call(null, event, context, callback);
