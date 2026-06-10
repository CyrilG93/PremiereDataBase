// ExtendScript for Adobe Premiere Pro - Data Base Extension
// This script runs in the Premiere Pro ExtendScript environment

// Platform detection
var IS_WINDOWS = ($.os.toLowerCase().indexOf('windows') >= 0);
var IS_MAC = !IS_WINDOWS;

// Platform-specific path separator
var PATH_SEPARATOR = IS_WINDOWS ? '\\' : '/';

// Helper function to log with platform info
function logPlatform(message) {
    $.writeln('[' + (IS_WINDOWS ? 'WIN' : 'MAC') + '] ' + message);
}

// Helper function to decode URI-encoded paths (e.g., %20 -> space)
function decodeURIPath(path) {
    if (!path) return path;
    try {
        return decodeURI(path);
    } catch (e) {
        return path;
    }
}

// Normalize path separators to forward slashes
function normalizePath(path) {
    if (!path) return '';
    return path.replace(/\\/g, '/');
}

// Encode native paths as ExtendScript URIs so literal percent signs remain part of the filename.
function createFileFromNativePath(filePath) {
    var normalizedFilePath = normalizePath(filePath);
    var encodedFilePath = File.encode(normalizedFilePath);

    // Preserve the Windows drive separator because File.encode converts the colon to %3A.
    encodedFilePath = encodedFilePath.replace(/^([A-Za-z])%3A\//i, '$1:/');

    return new File(encodedFilePath);
}

// Get current project path
function DataBase_getProjectPath() {
    try {
        if (app.project && app.project.path) {
            return normalizePath(app.project.path);
        }
        return null;
    } catch (e) {
        return null;
    }
}

// Get project folder (directory containing the .prproj file)
function DataBase_getProjectFolder() {
    var projectPath = DataBase_getProjectPath();
    if (projectPath) {
        var lastSlash = projectPath.lastIndexOf('/');
        if (lastSlash > 0) {
            return projectPath.substring(0, lastSlash);
        }
    }
    return null;
}

// Select folder dialog
function DataBase_selectFolder() {
    try {
        var folder = Folder.selectDialog("Select Database Folder");
        if (folder) {
            return normalizePath(folder.fsName);
        }
        return null;
    } catch (e) {
        return null;
    }
}

// Create or get bin by path
// Creates nested bins as needed
function getOrCreateBin(binPath) {
    if (!binPath || binPath === '') {
        return app.project.rootItem;
    }

    var parts = binPath.split('/');
    var currentBin = app.project.rootItem;

    for (var i = 0; i < parts.length; i++) {
        var binName = parts[i];
        if (!binName || binName === '') continue;

        var found = false;

        // Search for existing bin
        if (currentBin.children && currentBin.children.numItems > 0) {
            for (var j = 0; j < currentBin.children.numItems; j++) {
                var child = currentBin.children[j];
                if (child.type === ProjectItemType.BIN && child.name === binName) {
                    currentBin = child;
                    found = true;
                    break;
                }
            }
        }

        // Create bin if not found
        if (!found) {
            try {
                currentBin = currentBin.createBin(binName);
                logPlatform('Created bin: ' + binName);
            } catch (e) {
                logPlatform('Error creating bin: ' + binName + ' - ' + e.toString());
                return app.project.rootItem;
            }
        }
    }

    return currentBin;
}

// Find a project item that references the imported native media path.
function findProjectItemByMediaPath(nativePath) {
    try {
        var matches = app.project.rootItem.findItemsMatchingMediaPath(nativePath, 1);
        if (matches && matches.length > 0) {
            return matches[0];
        }
    } catch (e) {
        logPlatform('Unable to find imported project item: ' + e.toString());
    }

    return null;
}

// Convert a Premiere Time value to seconds while tolerating missing streams.
function getTimeSeconds(timeValue) {
    if (!timeValue) return null;

    var seconds = Number(timeValue.seconds);
    return isNaN(seconds) ? null : seconds;
}

// Read the source duration used to reserve an empty timeline interval.
function getProjectItemDurationSeconds(projectItem, mediaType) {
    var mediaCode = mediaType === 'audio' ? 2 : 1;

    try {
        var inPoint = projectItem.getInPoint(mediaCode);
        var outPoint = projectItem.getOutPoint(mediaCode);
        var inSeconds = getTimeSeconds(inPoint);
        var outSeconds = getTimeSeconds(outPoint);

        if (inSeconds !== null && outSeconds !== null && outSeconds > inSeconds) {
            return outSeconds - inSeconds;
        }
    } catch (typedDurationError) {
        logPlatform('Unable to read typed media duration: ' + typedDurationError.toString());
    }

    try {
        var fallbackInPoint = projectItem.getInPoint();
        var fallbackOutPoint = projectItem.getOutPoint();
        var fallbackInSeconds = getTimeSeconds(fallbackInPoint);
        var fallbackOutSeconds = getTimeSeconds(fallbackOutPoint);

        if (fallbackInSeconds !== null && fallbackOutSeconds !== null && fallbackOutSeconds > fallbackInSeconds) {
            return fallbackOutSeconds - fallbackInSeconds;
        }
    } catch (fallbackDurationError) {
        logPlatform('Unable to read fallback media duration: ' + fallbackDurationError.toString());
    }

    return null;
}

// Return whether a track has no clip overlapping the requested interval.
function isTrackRangeAvailable(track, startSeconds, endSeconds) {
    if (!track || !track.clips) return false;

    if (typeof track.isLocked === 'function' && track.isLocked()) {
        return false;
    }

    for (var i = 0; i < track.clips.numItems; i++) {
        var clipStart = getTimeSeconds(track.clips[i].start);
        var clipEnd = getTimeSeconds(track.clips[i].end);

        if (clipStart === null || clipEnd === null) {
            return false;
        }

        if (clipStart < endSeconds && clipEnd > startSeconds) {
            return false;
        }
    }

    return true;
}

// Find the first existing track with enough free space for the imported media.
function findAvailableTrackIndex(trackCollection, startSeconds, endSeconds) {
    if (!trackCollection) return -1;

    for (var i = 0; i < trackCollection.numTracks; i++) {
        if (isTrackRangeAvailable(trackCollection[i], startSeconds, endSeconds)) {
            return i;
        }
    }

    return -1;
}

// Add missing video or audio tracks through Premiere's internal QE API.
function createMissingTimelineTracks(sequence, createVideoTrack, createAudioTrack) {
    var beforeVideoTracks = sequence && sequence.videoTracks ? Number(sequence.videoTracks.numTracks || 0) : 0;
    var beforeAudioTracks = sequence && sequence.audioTracks ? Number(sequence.audioTracks.numTracks || 0) : 0;
    var attempted = false;
    var creationResult = {
        created: false,
        videoTrackIndex: -1,
        audioTrackIndex: -1
    };

    try {
        if (typeof app.enableQE !== 'function') {
            return creationResult;
        }

        app.enableQE();
        if (typeof qe === 'undefined' || !qe.project || typeof qe.project.getActiveSequence !== 'function') {
            return creationResult;
        }

        var qeSequence = qe.project.getActiveSequence();
        if (!qeSequence || typeof qeSequence.addTracks !== 'function') {
            return creationResult;
        }

        if (createVideoTrack && createAudioTrack) {
            try {
                // Use the track counts as outer insertion positions so existing V1/A1 tracks keep their indexes.
                qeSequence.addTracks(1, beforeVideoTracks, 1, 1, beforeAudioTracks);
                attempted = true;
            } catch (combinedSignatureError) {
                // Keep the older QE signature as a compatibility fallback.
                qeSequence.addTracks(1);
                attempted = true;
            }
        } else if (createAudioTrack) {
            try {
                // Append the new audio track after the existing audio collection.
                qeSequence.addTracks(0, 0, 1, 1, beforeAudioTracks);
                attempted = true;
            } catch (audioSignatureError) {
                qeSequence.addTracks(0);
                attempted = true;
            }
        } else if (createVideoTrack) {
            try {
                // Append the new video track after the existing video collection.
                qeSequence.addTracks(1, beforeVideoTracks, 0, 0, 0);
                attempted = true;
            } catch (videoOnlySignatureError) {
                // Older QE signatures may only support adding video and audio together.
                qeSequence.addTracks(1);
                attempted = true;
            }
        }
    } catch (e) {
        logPlatform('Unable to create timeline track through QE: ' + e.toString());
        return creationResult;
    }

    var afterVideoTracks = sequence && sequence.videoTracks ? Number(sequence.videoTracks.numTracks || 0) : 0;
    var afterAudioTracks = sequence && sequence.audioTracks ? Number(sequence.audioTracks.numTracks || 0) : 0;
    var videoCreated = !createVideoTrack || afterVideoTracks > beforeVideoTracks;
    var audioCreated = !createAudioTrack || afterAudioTracks > beforeAudioTracks;

    creationResult.created = attempted && videoCreated && audioCreated;
    if (creationResult.created && createVideoTrack) {
        // The appended standard-DOM track is the last item in the expanded collection.
        creationResult.videoTrackIndex = afterVideoTracks - 1;
    }
    if (creationResult.created && createAudioTrack) {
        // Keep audio insertion on the newly appended track instead of rescanning from A1.
        creationResult.audioTrackIndex = afterAudioTracks - 1;
    }

    return creationResult;
}

// Place one imported project item at the playhead without overwriting existing clips.
function DataBase_addProjectItemToTimeline(projectItem, mediaType) {
    var result = {
        requested: true,
        added: false,
        createdTrack: false,
        videoTrack: -1,
        audioTrack: -1,
        error: ''
    };

    try {
        var sequence = app.project.activeSequence;
        if (!sequence) {
            result.error = 'No active sequence';
            return result;
        }

        var playhead = sequence.getPlayerPosition();
        var startSeconds = getTimeSeconds(playhead);
        var durationSeconds = getProjectItemDurationSeconds(projectItem, mediaType);
        if (startSeconds === null || durationSeconds === null || durationSeconds <= 0) {
            result.error = 'Unable to determine playhead or media duration';
            return result;
        }

        var endSeconds = startSeconds + durationSeconds;
        var needsVideo = mediaType !== 'audio';
        var needsAudio = mediaType === 'audio' || mediaType === 'video';
        var videoTrackIndex = needsVideo
            ? findAvailableTrackIndex(sequence.videoTracks, startSeconds, endSeconds)
            : 0;
        var audioTrackIndex = needsAudio
            ? findAvailableTrackIndex(sequence.audioTracks, startSeconds, endSeconds)
            : 0;
        var missingVideoTrack = needsVideo && videoTrackIndex < 0;
        var missingAudioTrack = needsAudio && audioTrackIndex < 0;

        if (missingVideoTrack || missingAudioTrack) {
            var createdTracks = createMissingTimelineTracks(sequence, missingVideoTrack, missingAudioTrack);
            result.createdTrack = createdTracks.created;
            if (missingVideoTrack) {
                // Target the appended Vn+1 track directly so Premiere cannot redirect the clip to V1.
                videoTrackIndex = createdTracks.videoTrackIndex;
            }
            if (missingAudioTrack) {
                // Target the appended An+1 track directly so Premiere cannot redirect the clip to A1.
                audioTrackIndex = createdTracks.audioTrackIndex;
            }
        }

        if ((needsVideo && videoTrackIndex < 0) || (needsAudio && audioTrackIndex < 0)) {
            result.error = 'No free compatible track and track creation failed';
            return result;
        }

        var inserted = sequence.overwriteClip(projectItem, startSeconds, videoTrackIndex, audioTrackIndex);
        if (inserted === false) {
            result.error = 'Premiere rejected the timeline insertion';
            return result;
        }

        result.added = true;
        result.videoTrack = needsVideo ? videoTrackIndex : -1;
        result.audioTrack = needsAudio ? audioTrackIndex : -1;
        return result;
    } catch (e) {
        result.error = e.toString();
        return result;
    }
}

// Import files to project
// filesJson: JSON string with array of {name, path, binPath, mediaType, addToTimeline}
function DataBase_importFilesToProject(filesJson) {
    try {
        var files = JSON.parse(filesJson);
        var results = [];

        for (var i = 0; i < files.length; i++) {
            var file = files[i];

            try {
                // Verify file exists before attempting import
                var filePath = file.path;
                var fileObj = createFileFromNativePath(filePath);
                if (!fileObj.exists) {
                    results.push({
                        name: file.name,
                        success: false,
                        error: 'File not found: ' + filePath
                    });
                    continue;
                }

                // Get or create target bin
                var targetBin = getOrCreateBin(file.binPath);

                // Import file
                var importedItems = null;
                var importError = null;

                try {
                    // Pass Premiere the native path resolved from the safely encoded File object.
                    importedItems = app.project.importFiles([fileObj.fsName], true, targetBin, false);
                } catch (importEx) {
                    importError = importEx;
                }

                if (importError) {
                    results.push({
                        name: file.name,
                        success: false,
                        error: importError.toString()
                    });
                    logPlatform('Import failed: ' + file.name + ' - ' + importError.toString());
                } else {
                    var timelineResult = {
                        requested: file.addToTimeline === true,
                        added: false,
                        createdTrack: false,
                        videoTrack: -1,
                        audioTrack: -1,
                        error: ''
                    };

                    if (file.addToTimeline === true) {
                        var importedProjectItem = findProjectItemByMediaPath(fileObj.fsName);
                        if (importedProjectItem) {
                            timelineResult = DataBase_addProjectItemToTimeline(importedProjectItem, file.mediaType || 'video');
                        } else {
                            timelineResult.error = 'Imported project item not found';
                        }
                    }

                    results.push({
                        name: file.name,
                        success: true,
                        binPath: file.binPath,
                        timeline: timelineResult
                    });
                    logPlatform('Imported: ' + file.name + ' -> ' + (file.binPath || 'Root'));
                }

            } catch (e) {
                results.push({
                    name: file.name,
                    success: false,
                    error: e.toString()
                });
                logPlatform('Import error: ' + file.name + ' - ' + e.toString());
            }
        }

        var successCount = 0;
        for (var k = 0; k < results.length; k++) {
            if (results[k].success) successCount++;
        }

        return JSON.stringify({
            results: results,
            totalImported: successCount
        });

    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}

// Base64 decode helper for ExtendScript
function base64Decode(str) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var output = '';
    var i = 0;

    str = str.replace(/[^A-Za-z0-9\+\/\=]/g, '');

    while (i < str.length) {
        var enc1 = chars.indexOf(str.charAt(i++));
        var enc2 = chars.indexOf(str.charAt(i++));
        var enc3 = chars.indexOf(str.charAt(i++));
        var enc4 = chars.indexOf(str.charAt(i++));

        var chr1 = (enc1 << 2) | (enc2 >> 4);
        var chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        var chr3 = ((enc3 & 3) << 6) | enc4;

        output = output + String.fromCharCode(chr1);

        if (enc3 != 64) {
            output = output + String.fromCharCode(chr2);
        }
        if (enc4 != 64) {
            output = output + String.fromCharCode(chr3);
        }
    }

    // Decode UTF-8
    var result = '';
    var idx = 0;
    var c1, c2, c3;

    while (idx < output.length) {
        c1 = output.charCodeAt(idx);

        if (c1 < 128) {
            result += String.fromCharCode(c1);
            idx++;
        } else if ((c1 > 191) && (c1 < 224)) {
            c2 = output.charCodeAt(idx + 1);
            result += String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
            idx += 2;
        } else {
            c2 = output.charCodeAt(idx + 1);
            c3 = output.charCodeAt(idx + 2);
            result += String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            idx += 3;
        }
    }

    return result;
}

// Import files using base64 encoded JSON (safer for special characters)
function DataBase_importFilesToProjectBase64(base64Json) {
    try {
        var filesJson = base64Decode(base64Json);
        return DataBase_importFilesToProject(filesJson);
    } catch (e) {
        return JSON.stringify({ error: 'Base64 decode error: ' + e.toString() });
    }
}

// Read large import payloads from disk so CEP only sends a short path through evalScript.
function DataBase_importFilesFromPayloadFileBase64(base64Path) {
    var payloadFile = null;

    try {
        var payloadPath = base64Decode(base64Path);
        payloadFile = createFileFromNativePath(payloadPath);

        if (!payloadFile.exists) {
            return JSON.stringify({ error: 'Import payload file not found: ' + payloadPath });
        }

        if (!payloadFile.open('r')) {
            return JSON.stringify({ error: 'Unable to open import payload file: ' + payloadPath });
        }

        var filesJson = payloadFile.read();
        payloadFile.close();
        payloadFile = null;

        return DataBase_importFilesToProject(filesJson);
    } catch (e) {
        if (payloadFile) {
            try {
                payloadFile.close();
            } catch (closeError) {
                logPlatform('Unable to close import payload file: ' + closeError.toString());
            }
        }

        return JSON.stringify({ error: 'Import payload error: ' + e.toString() });
    }
}

// Get project info
function DataBase_getProjectInfo() {
    try {
        if (!app.project) {
            return JSON.stringify({ error: "No project open" });
        }

        return JSON.stringify({
            name: app.project.name,
            path: normalizePath(app.project.path),
            folder: DataBase_getProjectFolder()
        });
    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}

// Get list of all bins in project (for debugging)
function getAllBins() {
    var bins = [];

    function scanBins(item, parentPath) {
        if (!item) return;

        var currentPath = parentPath;

        if (item.type === ProjectItemType.BIN && item.name) {
            currentPath = parentPath ? parentPath + '/' + item.name : item.name;
            bins.push(currentPath);
        }

        if (item.children && item.children.numItems > 0) {
            for (var i = 0; i < item.children.numItems; i++) {
                scanBins(item.children[i], currentPath);
            }
        }
    }

    if (app.project && app.project.rootItem) {
        scanBins(app.project.rootItem, '');
    }

    return JSON.stringify(bins);
}

// Get selected project items with their source path and bin structure
function getSelectedProjectItems() {
    try {
        var items = [];
        if (!app.project || !app.project.rootItem) {
            return JSON.stringify([]);
        }

        var selection = [];

        if (app.project && typeof app.project.getSelection === 'function') {
            selection = app.project.getSelection();
        } else if (typeof app.getCurrentProjectViewSelection === 'function') {
            selection = app.getCurrentProjectViewSelection();
        }

        if (!selection || selection.length === 0) {
            return JSON.stringify([]);
        }

        function getBinPath(item) {
            // Try treePath first (more reliable)
            if (item.treePath) {
                var treePath = item.treePath.replace(/\\/g, '/');
                if (treePath.indexOf('/') === 0) treePath = treePath.substring(1);

                var parts = treePath.split('/');
                // parts[0] is ProjectName, parts[last] is ItemName
                if (parts.length > 2) {
                    var bins = parts.slice(1, parts.length - 1);
                    return bins.join('/');
                }
                return "";
            }

            var path = "";
            var current = item.parent;

            // Traverse up until we hit the root item
            while (current) {
                if (current == app.project.rootItem) break;
                path = current.name + (path ? "/" + path : "");
                current = current.parent;
            }
            return path;
        }

        function processItem(item) {
            if (!item) return;

            if (item.type === ProjectItemType.BIN) {
                for (var i = 0; i < item.children.numItems; i++) {
                    processItem(item.children[i]);
                }
            } else if (item.type === ProjectItemType.CLIP || item.type === ProjectItemType.FILE) {
                var mediaPath = item.getMediaPath();
                if (mediaPath && mediaPath.length > 0) {
                    var binPath = getBinPath(item);

                    items.push({
                        name: item.name,
                        path: normalizePath(mediaPath),
                        binPath: binPath
                    });
                }
            }
        }

        for (var i = 0; i < selection.length; i++) {
            processItem(selection[i]);
        }

        return JSON.stringify(items);
    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}

// Test function
function testExtension() {
    return JSON.stringify({
        platform: IS_WINDOWS ? 'Windows' : 'macOS',
        projectOpen: app.project ? true : false,
        projectPath: DataBase_getProjectPath()
    });
}
