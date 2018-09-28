# FortiGate aws-lambda-logstorage
Version: 1.0.0
Last Updated on 2018-09-28

## FortiOS AWS Lambda Function Setup Guide

## Deployment Automation Instructions
### Configurable Variables
> There are two configurable environment variables in this deployment template.

| Variable Name | Type | Description |
| ------ | ------ | ------ |
| ApiGatewayResource | Text | API Gateway resource name. Additional section will be added to the API Gateway url, reflect on the ***{resource}*** part. Example: https://{api}.execute-api.{region}.amazonaws.com/{stage}/**{resource}**/. Default to ***log***|
| ApiGatewayStage | Text | API Gateway stage name. Additional section will be added to the API Gateway url, reflect on the ***{stage}*** part. Example: https://{api}.execute-api.{region}.amazonaws.com/**{stage}**/{resource}/. Default to ***dev***|
### Prepare the deployment package
Here it provides two ways:
1. Download the latest version of the complete deployment package file: ***aws-lambda-logstorage.zip*** from the project [release page](./releases)
2. Or Build it yourself by cloning this project from GitHub and building the deployment package with a simple bash command.

#### Build the deployment package yourself
To build the deployment package yourself, clone this project into the fortigate-autoscale folder in your current local directory, and enter the project directory. By the following bash commands:
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
This S3 bucket is created for deployment use, can be deleted once the deployment is completed.

## Setup Deployment Environment
You need to install the AWS CLI. After, set your AWS working region, set the BUCKET and STACK environment variables for the current Bash CLI session.

### Install AWS CLI
Please see [install the AWS Command Line Interface](https://docs.aws.amazon.com/cli/latest/userguide/installing.html) for instructions.

### Setup Environment Variables
Set the AWS working region and the Fortigate Autoscale will be deployed to this region. For information about AWS Regions, please see [AWS Regions and Endpoints](https://docs.aws.amazon.com/general/latest/gr/rande.html). The bash shell command to use is (Note: square brackets must be omitted.):
```sh
aws configure set region [REPLACE_WITH_YOUR_PREFERRED_REGION]
```

Set the deployment ***stack*** name and the S3 ***bucket*** name by running these commands (Note: square brackets must be omitted.):

```sh
export STACK=[REPLACE_WITH_YOUR_PREFERRED_STACK_NAME]
export BUCKET=[REPLACE_WITH_YOUR_PREFERRED_BUCKET_NAME]
```

### Override Template Parameters
If you want to define your ***ApiGatewayResource*** and ***ApiGatewayStage*** parameters for the deployment, create a file with name ***logstorage_params.txt***, put it along with the ***deploy_logstorage.sh*** file. Without ***logstorage_params.txt***, deployment will start with the parameters with their default value.
A sample file ***sample.logstorage_params.txt*** is given in the templates directory for your reference.

Note:
1. No spaces should be next to “=” on either sides. If spaces exists in any ParameterValue, the whole ParameterValue should be wrapped with double-quote.
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

Expand the ***Resource*** to find the APIGateway resource.
![CloudFormation Stack 02](/images/verify_deployment02.png)

Find the invoke URL:
![Api Gateway invoke url](/images/api_gateway_invoke_url.png)

Find the API Key, click on ***show*** to see it.
![Api Gateway Api key](/images/api_gateway_api_key)

### Manual Deployment Instructions

* [DynamoDB](#dynamodb)
* [Lambda Function](#lambda-function)
* [API Gateway](#api-gateway)
* [FortiOS Configuration](#fortios-configuration)

## DynamoDB
1. Choose _DynamoDB_ from AWS services.
2. Create table.
    * Choose a recognizable table name. In this case, it could be `FosLog`. Take a note of this table name, we will use it later in Lambda function code.
    * Note that _primary partition key_ and _primary sort key_ need to match the code in Lambda function. In this case, we will use:
        * __Primary partition key__: `logId` (String)
        * __Primary sort key__: `timestamp` (Number)
    * Check _use default settings_ if the default quota works for you.

## Lambda Function
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

## API Gateway
1. Choose _API Gateway_ from AWS services.
2. Create API.
    * Select _New API_. Input an API name like `FortiOS Log Storage`. For Endpoint type choice, please refer to [this post](https://aws.amazon.com/about-aws/whats-new/2017/11/amazon-api-gateway-supports-regional-api-endpoints/).
    * Create a new resource, like `log`.
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
