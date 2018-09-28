#!/bin/bash
if [ -z "$BUCKET" ] || [ -z "$STACK" ]
then
    echo -e "\e[1;31mTwo environment variables are required to start the deployment.\e[0m"
    echo -e "\e[1;31mUse the commands below to assign them and execute this script again. <> must be omitted.\e[0m"
    echo -e "\e[1;31mexport BUCKET=<your S3 bucket name>\e[0m"
    echo -e "\e[1;31mexport STACK=<your CloudFormation stack name>\e[0m"
    exit 1
fi
projectname="Fortigate Log Storage"
template="./templates/deploy_logstorage.json"
templatepackaged='/tmp/deploy_logstorage_packaged.json'
externalparamfile="./logstorage_params.txt"
ifparams=""
if [ -f "$externalparamfile" ]
then
    for line in $(cat $externalparamfile); do
        # IFS='=' read -r -a pair <<< "$line"
        # param="ParameterKey=${pair[0]},ParameterValue=${pair[1]}"
        # ifparams="${ifparams} ${param}"
        ifparams="${ifparams} ${line}"
    done
    [ ! -z "$ifparams" ] && ifparams=" --parameter-overrides${ifparams}"
fi
awsregion=$(aws configure get region)
echo -e "You are going to deploy $projectname\nto AWS Region:\e[96m${awsregion}\e[0m\nusing the S3 bucket:\e[96m${BUCKET}\e[0m"
echo -e "\e[96mpackaging deployment artifacts...\e[0m"
eval "aws cloudformation package --template-file $template --output-template-file $templatepackaged --use-json --s3-bucket $BUCKET"
echo -e "\e[96mdeploying...\e[0m"
eval "aws cloudformation deploy --template-file $templatepackaged --stack-name $STACK --s3-bucket $BUCKET --capabilities CAPABILITY_IAM$ifparams"