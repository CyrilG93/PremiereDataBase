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
    'addToDbBtn',
    'addSingleImportToTimeline'
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
    const payloadContents = new Map();

    // Mimic ExtendScript URI handling closely enough to verify encoding and native path recovery.
    function MockFile(uriPath) {
        encodedPaths.push(uriPath);
        const decodedPath = decodeURI(uriPath);
        this.exists = uriPath.includes('%25') || payloadContents.has(decodedPath);
        this.fsName = /^[A-Za-z]:\//.test(decodedPath)
            ? decodedPath.replace(/\//g, '\\')
            : decodedPath;
        this.open = function openFile() {
            return payloadContents.has(decodedPath);
        };
        this.read = function readFile() {
            return payloadContents.get(decodedPath) || '';
        };
        this.close = function closeFile() {};
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
        const payloadPath = '/tmp/premiere-database-import.json';
        payloadContents.set(payloadPath, JSON.stringify([
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
        ]));

        const encodedPayloadPath = Buffer.from(payloadPath, 'utf8').toString('base64');
        const result = JSON.parse(sandbox.DataBase_importFilesFromPayloadFileBase64(encodedPayloadPath));

        const pathsArePreserved = importedPaths[0] === macSourcePath
            && importedPaths[1] === 'C:\\Media\\50% mix.mov';
        const urisAreEncoded = encodedPaths.includes('/tmp/50%25%20mix.mov')
            && encodedPaths.includes('C:/Media/50%25%20mix.mov');

        if (result.totalImported !== 2 || !pathsArePreserved || !urisAreEncoded) {
            failures.push('File-backed imports do not preserve percent-bearing paths.');
        }
    } catch (error) {
        failures.push(`File-backed import validation failed: ${error.message}`);
    }
}

// Keep the client-side recovery path present so raw CEP failures are not parsed as JSON.
function validateImportBridgeRecovery() {
    const clientSource = readText(path.join(sourceRoot, 'client', 'js', 'main.js'));
    const requiredMarkers = [
        "var PDB_EVALSCRIPT_ERROR = 'EvalScript error.'",
        'function pdb_ensureHostBridgeReady()',
        'function pdb_createImportPayloadFile(filesJson)',
        'function pdb_importPayloadThroughHost(payloadPath)',
        'Import response was not valid JSON.'
    ];

    requiredMarkers.forEach((marker) => {
        if (!clientSource.includes(marker)) {
            failures.push(`Missing import bridge recovery marker: ${marker}`);
        }
    });
}

// Verify timeline insertion creates tracks when every compatible interval is occupied.
function validateTimelineInsertion() {
    const hostPath = path.join(sourceRoot, 'host', 'index.jsx');
    const insertions = [];
    const addTrackCalls = [];

    function MockFile(uriPath) {
        this.exists = true;
        this.fsName = uriPath;
    }

    MockFile.encode = function encodeFilePath(filePath) {
        return filePath;
    };

    function createClip(start, end) {
        return {
            start: { seconds: start },
            end: { seconds: end }
        };
    }

    function createTrack(clips) {
        const collection = clips.slice();
        collection.numItems = collection.length;
        return {
            clips: collection,
            isLocked: function isLocked() {
                return false;
            }
        };
    }

    const videoTracks = [
        createTrack([createClip(9, 13)]),
        createTrack([createClip(9, 13)]),
        createTrack([createClip(9, 13)])
    ];
    videoTracks.numTracks = videoTracks.length;
    const audioTracks = [
        createTrack([createClip(9, 13)]),
        createTrack([createClip(9, 13)]),
        createTrack([createClip(9, 13)])
    ];
    audioTracks.numTracks = audioTracks.length;

    const sandbox = {
        $: {
            os: 'Macintosh',
            writeln: function writeln() {}
        },
        File: MockFile,
        app: {
            enableQE: function enableQE() {},
            project: {
                rootItem: {},
                activeSequence: {
                    videoTracks,
                    audioTracks,
                    getPlayerPosition: function getPlayerPosition() {
                        return { seconds: 10 };
                    },
                    overwriteClip: function overwriteClip(projectItem, startSeconds, videoTrackIndex, audioTrackIndex) {
                        insertions.push({ projectItem, startSeconds, videoTrackIndex, audioTrackIndex });
                        return true;
                    }
                }
            }
        },
        qe: {
            project: {
                getActiveSequence: function getActiveSequence() {
                    return {
                        addTracks: function addTracks(videoTrackCount, afterVideoTrackIndex, audioTrackCount, audioTrackType, afterAudioTrackIndex) {
                            addTrackCalls.push([
                                videoTrackCount,
                                afterVideoTrackIndex,
                                audioTrackCount,
                                audioTrackType,
                                afterAudioTrackIndex
                            ]);
                            if (videoTrackCount > 0) {
                                videoTracks.push(createTrack([]));
                                videoTracks.numTracks = videoTracks.length;
                            }
                            if (audioTrackCount > 0) {
                                audioTracks.push(createTrack([]));
                                audioTracks.numTracks = audioTracks.length;
                            }
                        }
                    };
                }
            }
        },
        JSON,
        ProjectItemType: {
            BIN: 2
        }
    };

    const projectItem = {
        getInPoint: function getInPoint() {
            return { seconds: 0 };
        },
        getOutPoint: function getOutPoint() {
            return { seconds: 2 };
        }
    };

    try {
        vm.createContext(sandbox);
        vm.runInContext(readText(hostPath), sandbox, { filename: hostPath });

        const result = sandbox.DataBase_addProjectItemToTimeline(projectItem, 'video');
        const insertion = insertions[0];
        const addTrackCall = addTrackCalls[0];

        if (!result.added || !result.createdTrack || result.videoTrack !== 3 || result.audioTrack !== 3
            || !insertion || insertion.videoTrackIndex !== 3 || insertion.audioTrackIndex !== 3
            || !addTrackCall || addTrackCall.join(',') !== '1,3,1,1,3') {
            failures.push('Timeline insertion did not append and use V4/A4 without shifting existing tracks.');
        }
    } catch (error) {
        failures.push(`Timeline insertion validation failed: ${error.message}`);
    }
}

// Keep the debug panel inside the flex layout so it never covers interface controls.
function validateDebugPanelLayout() {
    const styles = readText(path.join(sourceRoot, 'client', 'css', 'style.css'));
    const debugPanelBlock = styles.match(/\.debug-panel\s*\{([\s\S]*?)\}/);

    if (!debugPanelBlock
        || !debugPanelBlock[1].includes('position: static')
        || !debugPanelBlock[1].includes('flex: 0 0 auto')) {
        failures.push('Debug panel must remain in the normal flex layout.');
    }
}

// Run all local validations and exit with a CI-friendly status code.
filesToParse.forEach(validateScriptSyntax);
validateVersionConsistency();
validateHtmlHooks();
validatePercentPathImport();
validateImportBridgeRecovery();
validateTimelineInsertion();
validateDebugPanelLayout();

if (failures.length > 0) {
    console.error('PDB validation failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log('PDB validation passed.');
