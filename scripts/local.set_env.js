'use strict';
// prepare process environment variables
// add whatever variables you want here in this file and use in local.js
process.env.AWS_REGION = 'sa-east-1';
console.log('assigning process.env.AWS_REGION:', process.env.AWS_REGION);
process.env.DEBUG_MODE = "on";
console.log('assigning process.env.DEBUG_MODE:', process.env.DEBUG_MODE);
