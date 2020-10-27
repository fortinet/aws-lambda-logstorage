node('devops-aws') {
    stage('Clean up') {
        sh 'rm -rf *'
    }

    stage('Checkout') {
        def changeBranch = "change-${GERRIT_CHANGE_NUMBER}-${GERRIT_PATCHSET_NUMBER}"
        def scmVars = checkout scm
        git url: scmVars.GIT_URL, branch: 'main'
        sh "git fetch origin ${GERRIT_REFSPEC}:${changeBranch}"
        sh "git checkout ${changeBranch}"
    }

    stage('NPM Install') {
        echo 'NPM Install..'
        sh 'npm install'
    }

    stage('Format check') {
        echo 'Format checking..'
        sh './node_modules/.bin/ftnt-devops-ci check -f "**/*.{js,json}"'
    }

    stage('Eslint') {
        echo 'Eslinting..'
        sh './node_modules/.bin/ftnt-devops-ci check -l "**/*.js"'
    }

    stage('Test') {
        echo 'Testing..'
        sh 'npm test'
    }

    stage('Build') {
        echo 'Building..'
        sh 'npm run build'
    }

    stage('Deploy') {
        dir("${workspace}/dist") {
            echo 'Unzip template'
            sh 'unzip aws-lambda-logstorage.zip -d ./'
            echo 'Create stack'
            sh './deploy_logstorage.sh'
        }
    }

    stage('Delete') {
        echo 'Delete stack'
        sh "aws cloudformation delete-stack --stack-name ${STACK}"
        sh "aws s3 rm s3://${BUCKET} --recursive"
    }
}
