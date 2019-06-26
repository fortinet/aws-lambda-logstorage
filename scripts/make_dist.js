#!/usr/bin/env node
'use strict';

const path = require('path'),
    fs = require('fs'),
    logger = require('../logger');
let { exec, spawn } = require('child_process');
// the argument index for the packaging script
const ARGV_PROCESS_PACKAGING_SCRIPT_NAME = 2;
const REAL_PROJECT_ROOT = path.resolve(__dirname, '../');
logger.wrapConsole(console);
let _tempDir;

function runCmd(cmd, args = [], cwd = process.cwd(), options) {
    let output = '';
    return new Promise((resolve, reject) => {
        console.log(`run command:${cmd} ${args.join(' ')} on dir: ${cwd}`);
        let cproc = spawn(cmd, args, { cwd: cwd, shell: process.env.shell });

        cproc.stdout.on('data', function(data) {
            output += data;
            if (options && options.printStdout) {
                console.log(`stdout: ${data}`);
            }
        });

        cproc.stderr.on('data', function(data) {
            if (options && !options.supressError) {
                console.log(`stderr: ${data}`);
            } else {
                reject(data);
            }
        });

        cproc.on('error', err => {
            if (options && !options.supressError) {
                console.log(`error : ${err}`);
            } else {
                reject(err);
            }
        });

        cproc.on('close', function() {
            resolve(output);
        });
    }).catch(error => {
        // TODO: npm install can generate warning. how to handle warnings here?
        console.log(error.toString());
    });
}

// eslint-disable-next-line no-unused-vars
function execCmd(cmd, cwd = process.cwd(), options) {
    return new Promise((resolve, reject) => {
        console.log(`run command:${cmd} on dir: ${cwd}`);
        exec(cmd, { cwd: cwd }, (error, stdout, stderr) => {
            if (error) {
                if (options && !options.supressError) {
                    console.error(`exec error: ${error}`);
                } else {
                    reject(error);
                }
            }
            if (stdout && options && options.printStdout) {
                console.log(`stdout: ${stdout}`);
            }
            if (stderr && options && options.printStderr) {
                console.log(`stderr: ${stderr}`);
            }
            resolve(stdout || stderr);
        });
    }).catch(err => {
        // TODO: npm install can generate warning. how to handle warnings here?
        console.log(err.toString());
    });
}

async function isGNUBash() {
    try {
        let bashVersion = await execCmd('bash --version', process.cwd(), {
            mute: true
        });
        return bashVersion.trim().indexOf('GNU bash') !== -1;
    } catch (error) {
        return false;
    }
}

async function makeTempDir(options = {}) {
    if (!_tempDir) {
        // TODO: fix this
        // eslint-disable-next-line require-atomic-updates
        _tempDir = await runCmd('mktemp', ['-d'], process.cwd(), options);
        // eslint-disable-next-line require-atomic-updates
        _tempDir = _tempDir.trim();
    }
    return _tempDir;
}

async function removeTempDir(options = {}) {
    if (_tempDir) {
        await execCmd(`rm -rf ${_tempDir}`, process.cwd(), options);
        // eslint-disable-next-line require-atomic-updates
        _tempDir = null;
    }
    return true;
}

async function makeDir(location, cwd = process.cwd(), options = {}) {
    await execCmd(`mkdir -p ${path.resolve(cwd, location)}`, cwd, options);
}

async function copy(src, des, cwd = process.cwd(), options = {}) {
    if (!(await isGNUBash())) {
        throw new Error('Sorry, this script can only run on a GNU bash shell.');
    }
    if (path.resolve(des).indexOf(path.resolve(src)) === 0) {
        throw new Error(
            `\n\n( ͡° ͜ʖ ͡°) copying <${src}> to its subdir <${des}> creates a circular reference. I won't allow this happen.`
        );
    }
    return new Promise((resolve, reject) => {
        execCmd(`cp -rL ${src} ${des}`, cwd, options)
            .then(output => resolve(output))
            .catch(error => reject(error));
    });
}

async function copyAndDelete(src, des, excludeList = [], options = {}) {
    // copy funcapp module to temp dir
    await copy(src, des, process.cwd(), options);
    // remove unnecessary files and directories
    await remove(excludeList, des, process.cwd(), options);
    return true;
}

async function deleteSafe(location, onDir, options = {}) {
    if (!onDir) {
        console.error('<onDir> must be provided.');
        return false;
    }
    let realPath = path.resolve(onDir, location);
    if (realPath.indexOf(onDir) !== 0 || realPath === onDir || realPath === '/') {
        console.error(
            `\n\n( ͡° ͜ʖ ͡°) the locaton (${location}) falls outside directories allowed: ${onDir}, or in somewhere inappropriate to delete.`
        );
        console.error("( ͡° ͜ʖ ͡°) I don't allow you to delete it");
        return false;
    }
    await execCmd(`rm -rf ${realPath}`, onDir, options);
}

async function remove(search, cwd = process.cwd(), options = {}) {
    if (typeof search === 'string') {
        search = [search];
    }
    if (search instanceof Array) {
        for (let index in search) {
            if (typeof search[index] !== 'string') {
                break;
            }
            let foundArray = await find(search[index], cwd);
            for (let location of foundArray) {
                if (location) {
                    await deleteSafe(location, cwd, options);
                }
            }
            if (++index === search.length) {
                return true;
            }
        }
    }
    console.error('( ͡° ͜ʖ ͡°) <search> only accepts string or string array when remove.');
}

async function find(search, onDir) {
    return await execCmd(`find . -name "${search}"`, onDir, {
        printStdout: false,
        printStderr: false
    })
        .then(output => {
            return output.split('\n').filter(line => line.trim());
        })
        .catch(error => {
            console.log(error.message);
            return [];
        });
}

function readPackageJsonAt(location) {
    let packPath = path.resolve(process.cwd(), location);
    try {
        let stat = fs.statSync(packPath),
            pathInfo = path.parse(packPath);
        if (stat.isFile()) {
            return require(path.join(pathInfo.dir, 'package.json'));
        } else if (stat.isDirectory()) {
            return require(path.join(pathInfo.dir, pathInfo.base, 'package.json'));
        } else {
            return {};
        }
    } catch (error) {
        return {};
    }
}

async function moveSafe(src, des, options = {}) {
    if (!(src && des)) {
        console.error('<src> and <des> must be provided.');
        return false;
    }
    if (path.resolve(des).indexOf(path.resolve(src)) === 0) {
        throw new Error(
            `\n\n( ͡° ͜ʖ ͡°) moving <${src}> to its subdir <${des}> creates a circular reference. I won't allow this happen.`
        );
    }
    return await execCmd(`mv ${path.resolve(src)} ${path.resolve(des)}`, process.cwd(), options);
}

async function zipSafe(fileName, src, excludeList = [], options = {}) {
    let des,
        args = [],
        realPath = path.resolve(src);
    // allow to create zip file in cwd, otherwise, create in the temp dir
    if (realPath.indexOf(process.cwd()) === 0) {
        des = realPath;
    } else {
        des = path.resolve(await makeTempDir(), src);
    }
    args = args.concat(['-r', fileName, '.']);
    if (Array.isArray(excludeList) && excludeList.length > 0) {
        args.push('-x');
        args = args.concat(excludeList);
    }
    await runCmd('zip', args, des, options);
    return path.resolve(des, fileName);
}

async function npmInstallAt(location, args = [], options = {}) {
    let packageInfo = readPackageJsonAt(location);
    if (packageInfo.name) {
        let pathInfo = path.parse(path.resolve(location)),
            packPath = path.join(pathInfo.dir, pathInfo.ext ? '' : pathInfo.base);
        Object.assign(options, {
            supressError: true
        });
        return await runCmd('npm', ['install'].concat(args), packPath, {
            supressError: true
        });
    } else {
        return false;
    }
}

async function buildDeployment() {
    console.info('Making distribution zip package for: AWS Lambda');
    let rTempDir = await makeTempDir(),
        rTempDirSrcLambda = path.resolve(rTempDir, 'aws_lambda'),
        rTempDirSrcTemplate = path.resolve(rTempDir, 'templates'),
        packageInfo,
        zipFilePath,
        rDirSrcLambda = path.resolve(REAL_PROJECT_ROOT, './*'),
        rDirSrcTemplate = path.resolve(REAL_PROJECT_ROOT, './templates'),
        rDirDist = path.resolve(REAL_PROJECT_ROOT, './dist'),
        rFileSrcCloudFormationScript = path.resolve(
            REAL_PROJECT_ROOT,
            './scripts',
            'deploy_logstorage.sh'
        ),
        rFileTempSrcCloudFormationScript = path.resolve(rTempDir, 'deploy_logstorage.sh'),
        rFileSrcCloudFormationParams = path.resolve(
            REAL_PROJECT_ROOT,
            './templates',
            'sample.logstorage_params.txt'
        ),
        rFileTempCloudFormationParams = path.resolve(rTempDir, 'logstorage_params.txt'),
        zipFileName;

    // create temp dir for lambda
    await makeDir(rTempDirSrcLambda);
    // create distribution dir (if not created)
    await makeDir(rDirDist);
    // copy lambda function to temp dir
    await copyAndDelete(rDirSrcLambda, rTempDirSrcLambda, [
        'node_modules',
        '.nyc_output',
        '.vscode',
        'scripts',
        'templates',
        'test',
        'dist',
        'local*',
        'images',
        '.eslintignore',
        '.eslintrc',
        '.gitignore',
        'package-lock.json',
        '*.code-workspace'
    ]);
    // copy templates to temp dir
    await copy(rDirSrcTemplate, rTempDirSrcTemplate);
    // copy cloud formation script to temp dir
    await copy(rFileSrcCloudFormationScript, rTempDir);
    // copy cloud formation script to temp dir
    await copy(rFileSrcCloudFormationParams, rFileTempCloudFormationParams);
    // add execution permission
    await execCmd(`chmod +x ${rFileTempSrcCloudFormationScript}`, process.cwd());
    // install production dependencies
    await npmInstallAt(rTempDirSrcLambda, ['--production']);

    // read package info of module lambda
    packageInfo = readPackageJsonAt(rTempDirSrcLambda);
    zipFileName = `${packageInfo.name}.zip`;
    zipFilePath = await zipSafe(zipFileName, rTempDir);
    // copy the zip file to dist
    await moveSafe(zipFilePath, rDirDist);
    await removeTempDir();
    console.info('\n\n( ͡° ͜ʖ ͡°) package is saved as:');
    console.info(`${path.resolve(rDirDist, zipFileName)}`);
}

let scrptName = process.argv[ARGV_PROCESS_PACKAGING_SCRIPT_NAME] || 'default';
// make distribution package
switch (scrptName.toLowerCase()) {
    case 'deployment':
        buildDeployment();
        break;
    default:
        console.warn('( ͡° ͜ʖ ͡°) Usage: please use one of these commands:');
        console.warn('npm run build-deployment');
        break;
}
