<h1>FortiOS AWS Lambda Function Setup Guide</h1>

Updated on 2018-06-01

**Instructions**

* [DynamoDB](#DynamoDB)
* [Lambda Function](#Lambda\ Function)
* [API Gateway](#API\ Gateway)
* [FortiOS Configuration](#FortiOS\ Configuration)

# DynamoDB
1. Choose _DynamoDB_ from AWS services.
2. Create table.
    * Choose a recognizable table name. In this case, it could be `FosLog`. Take a note of this table name, we will use it later in Lambda function code.
    * Note that _primary partition key_ and _primary sort key_ need to match the code in Lambda function. In this case, we will use:
        * __Primary partition key__: `logId` (String)
        * __Primary sort key__: `timestamp` (Number)
    * Check _use default settings_ if the default quota works for you.

# Lambda Function
1. Choose _Lambda_ from AWS services.
2. Create function.
    * Choose _Author from scrach_
    * Name your Lambda function reasonably, like `fLogStorage`. Take a note of this function name, we will use it later in API Gateway configuration.
    * Use _Node.js 6.10_ as runtime.
    * Select _create new role from template(s)_. You can select _Choose an existing role_ or _Create a custom role_ if that works for you.
        * Name the role according to its functionality, like `fLogStorageRole`.
        * Select `Simple Microservice permissions` in Policy templates.
        * Replace default _index.js_ with the corresponding one in this repository.
        * In Environment variables, input _TABLE_NAME_ -> `FosLog` (or your own table name).

# API Gateway
1. Choose _API Gateway_ from AWS services.
2. Create API.
    * Select _New API_. Input an API name like `FortiOS Log Storage`. For Endpoint type choice, please refer to [this post](https://aws.amazon.com/about-aws/whats-new/2017/11/amazon-api-gateway-supports-regional-api-endpoints/).
    * Create a new resource, like `save-log`.
    * Create a _POST_ method on the newly created resource. Select _Lambda Function_ as the Integration type. Then choose the _Lambda Function_ that was created in the previous step.
    * In Method Request, set API Key Required to `true`.
    * Deploy the created API.
    * Take a note of the invoke URL. It should look like: \<aws-api-id\>.execute-api.\<aws-region\>.amazonaws.com/\<aws-api-stage\>/\<aws-api-resource\>
3. Create a new API Key.
    * Choose _Auto Generate_.
    * Take a note of the _API Key_.
4. Create a new Usage Plan.
    * Associate the created API.
    * Add the created API Key to the Usage Plan.

# FortiOS Configuration
1. In _Security Fabric_ -> _Settings_, enable _FortiGate Telemetry_.
2. In _Security Fabric_ -> Automation, click _Create New_.
    * Choose a trigger.
    * Select _AWS Lambda_ for Action.
    * Select _URL_ for API Gateway and input the invoke URL.
    * Input the API Key.
    * Click OK to save the configuration.

