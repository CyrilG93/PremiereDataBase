#!/usr/bin/env node

// Validate the extension source without requiring extra dependencies.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Resolve all paths relative to the Source directory.
const sourceRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(sourceRoot, 'package.json');
const manifestPath = path.join(sourceRoot, 'CSXS', 'manifest.xml');
const readmePath = path.resolve(sourceRoot, '..', 'README.md');
const filesToParse = [
    path.join(sourceRoot, 'client', 'js', 'main.js'),
    path.join(sourceRoot, 'client', 'js', 'fileOperations.js'),
    path.join(sourceRoot, 'host', 'index.jsx')
];
const requiredHtmlHooks = [
    'databaseRootsList',
    'addDatabaseRootBtn',
    'newFolderBtn',
    'addToDbBtn'
];
const failures = [];

// Read a UTF-8 text file and report a useful error if it is missing.
function readText(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        failures.push(`Unable to read ${filePath}: ${error.message}`);
        return '';
    }
}

// Compile a script to catch syntax errors without executing extension code.
function validateScriptSyntax(filePath) {
    const source = readText(filePath);
    if (!source) {
        return;
    }

    try {
        new vm.Script(source, { filename: filePath });
    } catch (error) {
        failures.push(`Syntax error in ${filePath}: ${error.message}`);
    }
}

// Ensure the manifest and package versions stay aligned with the README badge.
function validateVersionConsistency() {
    const packageJson = readText(packageJsonPath);
    const manifestXml = readText(manifestPath);
    const readme = readText(readmePath);

    const packageVersionMatch = packageJson.match(/"version"\s*:\s*"([^"]+)"/);
    const manifestVersionMatch = manifestXml.match(/ExtensionBundleVersion="([^"]+)"/);
    const readmeBadgeMatch = readme.match(/version-([0-9.]+)-blue/);

    const packageVersion = packageVersionMatch ? packageVersionMatch[1] : '';
    const manifestVersion = manifestVersionMatch ? manifestVersionMatch[1] : '';
    const readmeVersion = readmeBadgeMatch ? readmeBadgeMatch[1] : '';

    if (!packageVersion || !manifestVersion || !readmeVersion) {
        failures.push('Could not read version values from package.json, manifest.xml, or README.md.');
        return;
    }

    if (packageVersion !== manifestVersion || packageVersion !== readmeVersion) {
        failures.push(`Version mismatch detected: package=${packageVersion}, manifest=${manifestVersion}, readme=${readmeVersion}`);
    }
}

// Check that the HTML still exposes the hooks required by the multi-root UI.
function validateHtmlHooks() {
    const html = readText(path.join(sourceRoot, 'client', 'index.html'));

    requiredHtmlHooks.forEach((hookId) => {
        if (!html.includes(`id="${hookId}"`)) {
            failures.push(`Missing required HTML hook: ${hookId}`);
        }
    });
}

// Execute the host import bridge with a percent-bearing filename to prevent URI regressions.
function validatePercentPathImport() {
    const hostPath = path.join(sourceRoot, 'host', 'index.jsx');
    const encodedPaths = [];
    const importedPaths = [];

    // Mimic ExtendScript URI handling closely enough to verify encoding and native path recovery.
    function MockFile(uriPath) {
        encodedPaths.push(uriPath);
        this.exists = uriPath.includes('%25');
        const decodedPath = decodeURI(uriPath);
        this.fsName = /^[A-Za-z]:\//.test(decodedPath)
            ? decodedPath.replace(/\//g, '\\')
            : decodedPath;
    }

    // Match the ExtendScript File.encode contract used by the host bridge.
    MockFile.encode = function encodeFilePath(filePath) {
        return encodeURI(filePath).replace(/#/g, '%23');
    };

    const sandbox = {
        $: {
            os: 'Macintosh',
            writeln: function writeln() {}
        },
        File: MockFile,
        app: {
            project: {
                rootItem: {},
                importFiles: function importFiles(filePaths) {
                    importedPaths.push(...filePaths);
                    return true;
                }
            }
        },
        JSON,
        ProjectItemType: {
            BIN: 2
        }
    };

    try {
        vm.createContext(sandbox);
        vm.runInContext(readText(hostPath), sandbox, { filename: hostPath });

        const macSourcePath = '/tmp/50% mix.mov';
        const windowsSourcePath = 'C:/Media/50% mix.mov';
        const result = JSON.parse(sandbox.DataBase_importFilesToProject(JSON.stringify([
            {
                name: '50% mix.mov',
                path: macSourcePath,
                binPath: ''
            },
            {
                name: '50% mix.mov',
                path: windowsSourcePath,
                binPath: ''
            }
        ])));

        const pathsArePreserved = importedPaths[0] === macSourcePath
            && importedPaths[1] === 'C:\\Media\\50% mix.mov';
        const urisAreEncoded = encodedPaths[0] === '/tmp/50%25%20mix.mov'
            && encodedPaths[1] === 'C:/Media/50%25%20mix.mov';

        if (result.totalImported !== 2 || !pathsArePreserved || !urisAreEncoded) {
            failures.push('Percent-bearing paths are not preserved by the host import bridge.');
        }
    } catch (error) {
        failures.push(`Percent path import validation failed: ${error.message}`);
    }
}

// Run all local validations and exit with a CI-friendly status code.
filesToParse.forEach(validateScriptSyntax);
validateVersionConsistency();
validateHtmlHooks();
validatePercentPathImport();

if (failures.length > 0) {
    console.error('PDB validation failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log('PDB validation passed.');
