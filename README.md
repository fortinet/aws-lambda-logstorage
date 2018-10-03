# FortiGate aws-lambda-logstorage
Version: 1.0.0
Last Updated on 2018-09-28

## FortiOS AWS Lambda Function Setup Guide

## Deployment Automation Instructions
### Configurable Variables
> There are two configurable environment variables in this deployment template.

| Variable Name | Type | Description |
| ------ | ------ | ------ |
| ApiGatewayResource | Text | API Gateway resource name. It's an additional section added to the API Gateway url. See the ***{resource}*** part of the example. Example: https://{api}.execute-api.{region}.amazonaws.com/{stage}/**{resource}**/. Default to ***log***|
| ApiGatewayStage | Text | API Gateway stage name. It's an additional section added to the API Gateway url. See the  ***{stage}*** part of the example. Example: https://{api}.execute-api.{region}.amazonaws.com/**{stage}**/{resource}/. Default to ***dev***|
### Prepare the deployment package
Either of the following two methods can be used to prepare the deployment package:
1. Download the latest version of the complete deployment package file: ***aws-lambda-logstorage.zip*** from the project [release page](./releases)
2. Build it yourself by cloning this project from GitHub and building the deployment package with a simple bash command.

#### Build the deployment package yourself
To build the deployment package yourself, clone this project into the fortigate-autoscale folder in your current local directory, enter the project directory, and execute the following bash commands:
```sh
git clone https://github.com/fortinet/aws-lambda-logstorage.git aws-lambda-logstorage
cd aws-lambda-logstorage
npm run build
```
You can find the deployment package (***aws-lambda-logstorage.zip***) from the dist directory.
![Build Artifact](/images/build_artifact.png)
The file structure is:
![Build Artifact File Structure](/images/build_artifact_file_structure.png)

### Create an S3 Bucket for Deployment Intermediate
You need to create an S3 bucket in an AWS Region where you want to deploy this project to.
This S3 bucket is created for deployment use and can be deleted once the deployment is completed.

## Setup Deployment Environment
In order to setup the deployment environment, you need to install the AWS CLI, set your AWS working region, and set the BUCKET and STACK environment variables for the current Bash CLI session.

### Install & Configure AWS CLI
Please see [install the AWS Command Line Interface](https://docs.aws.amazon.com/cli/latest/userguide/installing.html) and [Configuring the AWS CLI - Quick Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html#cli-quick-configuration) for instructions.

### Setup Environment Variables
Set the AWS working region and the FortiGate Autoscale will be deployed to this region. For information about AWS Regions, please see [AWS Regions and Endpoints](https://docs.aws.amazon.com/general/latest/gr/rande.html). The bash shell command to use is (Note: square brackets must be omitted.):
```sh
aws configure set region [REPLACE_WITH_YOUR_PREFERRED_REGION]
```

Set the deployment ***stack*** name and the S3 ***bucket*** name by running these commands (Note: square brackets must be omitted.):

```sh
export STACK=[REPLACE_WITH_YOUR_PREFERRED_STACK_NAME]
export BUCKET=[REPLACE_WITH_YOUR_PREFERRED_BUCKET_NAME]
```

### Override Template Parameters
If you want to define your ***ApiGatewayResource*** and ***ApiGatewayStage*** parameters for the deployment, create a file named ***logstorage_params.txt*** and place it along with the ***deploy_logstorage.sh*** file. Without the ***logstorage_params.txt***, deployment will start with the parameters having their default value.
A sample file ***sample.logstorage_params.txt*** is provided in the templates directory for your reference.

Note:
1. No spaces should be next to “=” on either sides. If spaces exists in any ParameterValue, the entire ParameterValue should be wrapped within double-quotation marks.
For example:
ParameterKey=”This is just an example”

2. Template parameter overriding only happens when the ***logstorage_params.txt*** file is found on the same directory as ***deploy_logstorage.sh***.
If dollar sign ($) appears on any parameters, it must be escaped as \$. This is critical to the deployment process.

### Start a deployment process
Start the deployment by executing this command:
```sh
./deploy_logstorage.sh
```

### Verify the deployment result on AWS CloudFormation
To verify the deployment result and see the details, you can find the stack from AWS CloudFormation console by the stack name you specified. Click into it to check the details.
![CloudFormation Stack 01](/images/verify_deployment01.png)

Expand the Stack ***Resource*** section and find the resource of type ***AWS::ApiGateway::RestApi***. Click the link on its Physical ID section to navigate to the APIGateway and move on to the next step.
![CloudFormation Stack 02](/images/verify_deployment02.png)

Find the invoke URL:
![Api Gateway invoke url](/images/api_gateway_invoke_url.png)

Find the API Key, click on ***show*** to see it.
![Api Gateway Api key](/images/api_gateway_api_key)

## Manual Deployment Instructions

* [DynamoDB](#dynamodb)
* [Lambda Function](#lambda-function)
* [API Gateway](#api-gateway)
* [FortiOS Configuration](#fortios-configuration)

### DynamoDB
1. Choose _DynamoDB_ from AWS services.
2. Create table.
    * Choose a recognizable table name. In this case, it could be `FosLog`. Take a note of this table name, we will use it later in Lambda function code.
    * Note that _primary partition key_ and _primary sort key_ need to match the code in Lambda function. In order to get the Primary sort key, need to check the **Add sort key** checkbox. In this case, we will use:
        * __Primary partition key__: `logId` (must use a data type of: *String*)
        * __Primary sort key__: `timestamp` (must use a data type of: *Number*)
    *
    * Check _use default settings_ if the default quota works for you.

### Lambda Function
1. Choose _Lambda_ from AWS services.
2. Create function.
    * Choose _Author from scratch_
    * Name your Lambda function reasonably, like `fLogStorage`. Take a note of this function name, we will use it later in API Gateway configuration.
    * Use _Node.js 6.10_ as runtime.
    * Select _create new role from template(s)_. You can select _Choose an existing role_ or _Create a custom role_ if that works for you. For _Create a custom role_:
        * Name the role according to its functionality, like `fLogStorageRole`.
        * Select `Simple Microservice permissions` in Policy templates.
    * Click on *Create Function* button to create an empty function.
    * A default *index.js* file was created. Replace its content with the content of index.js in this repository.
    * In Environment variables, input a key-value pair: _TABLE_NAME_ as key and `FosLog` as value (or your own table name).
    * Click on the *Save* button on the top right to complete.

### API Gateway
1. Choose _API Gateway_ from AWS services.
2. Create API.
    * Select _New API_. Input an API name like `FortiOS Log Storage` and save. For Endpoint type choice, please refer to [this post](https://aws.amazon.com/about-aws/whats-new/2017/11/amazon-api-gateway-supports-regional-api-endpoints/).
    * From the actions dropdown menu, choose 'create resource', like `log`.
    * select the created resource, then from the actions dropdown menu, choose 'create method' to create a _POST_ method on the newly created resource. Select _Lambda Function_ as the Integration type. Then type in the name of the Lambda function and select it from the autocomplete dropdown menu. Save it afterward.
    * In Method Request, set API Key Required to `true`.
    * From the actions dropdown menu, choose 'Deploy API'.
        * from the Deploy API popup window, on *Deployment stage*, choose [new stage], name the stage like: prod (for a production stage), dev (for a development stage), or test (for a testing stage). Click on 'Deploy' button. (see the screenshot below)
        ![Api Gateway Api key](/images/deploy_api.png)
    * From the APIs > Stages section, you can find the stage you just deployed. Expand it and click on the POST method under the resource `log` (or whatever resource name you gave it.). See the screenshot below.
        ![Api Gateway Api key](/images/invoke_url.png)
    * Take a note of the invoke URL. It should look like: \<aws-api-id\>.execute-api.\<aws-region\>.amazonaws.com/\<aws-api-stage\>/\<aws-api-resource\>
3. Create a new API Key from APIs > API Keys.
    * Choose _Auto Generate_.
    * Take a note of the _API Key_.
    ![Api Gateway Api key](/images/create_api_key.png)
4. Create a new Usage Plan from APIs > Usage plan. Then click next. The settings for Throttling and Quota are recommended as below:
    * Throttling:
        * Rate: 100 request per second
        * Burst: 200 requests
    * Quota: 10000 requests Monthly
    * Associate the created API Stage. Choose the created api and corresponding stage. Click next.
    * Add the created API Key to the Usage Plan. Click done.
    * See the screenshots below
    ![Api Gateway Api key](/images/add_usage_plan.png)
    ![Api Gateway Api key](/images/add_usage_plan_api_stage.png)
    ![Api Gateway Api key](/images/add_usage_plan_api_key.png)

## FortiOS Configuration
1. In _Security Fabric_ -> _Settings_, enable _FortiGate Telemetry_.
2. In _Security Fabric_ -> Automation, click _Create New_.
    * Choose a trigger.
    * Select _AWS Lambda_ for Action.
    * Select _URL_ for API Gateway and input the invoke URL.
    * Input the API Key.
    * Click OK to save the configuration.


# Support
Note Fortinet-provided scripts (in this GitHub project and others) are not supported within regular Fortinet technical support scope.
For direct issues, please refer to the [Issues](../../issues) tab of this GitHub project.
For other questions related to the Lambda scripts, contact [github@fortinet.com](mailto:github@fortinet.com).

## License
[License](./LICENSE) © Fortinet Technologies. All rights reserved.
