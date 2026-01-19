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

// Get current project path
function getProjectPath() {
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
function getProjectFolder() {
    var projectPath = getProjectPath();
    if (projectPath) {
        var lastSlash = projectPath.lastIndexOf('/');
        if (lastSlash > 0) {
            return projectPath.substring(0, lastSlash);
        }
    }
    return null;
}

// Select folder dialog
function selectFolder() {
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

// Import files to project
// filesJson: JSON string with array of {name, path, binPath}
function importFilesToProject(filesJson) {
    try {
        var files = JSON.parse(filesJson);
        var results = [];

        for (var i = 0; i < files.length; i++) {
            var file = files[i];

            try {
                // Verify file exists before attempting import
                var filePath = file.path;

                // Handle Windows paths
                if (IS_WINDOWS) {
                    filePath = filePath.replace(/\//g, '\\');
                }

                var fileObj = new File(filePath);
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
                    // importFiles expects an array of paths
                    importedItems = app.project.importFiles([filePath], true, targetBin, false);
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
                    results.push({
                        name: file.name,
                        success: true,
                        binPath: file.binPath
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
function importFilesToProjectBase64(base64Json) {
    try {
        var filesJson = base64Decode(base64Json);
        return importFilesToProject(filesJson);
    } catch (e) {
        return JSON.stringify({ error: 'Base64 decode error: ' + e.toString() });
    }
}

// Get project info
function getProjectInfo() {
    try {
        if (!app.project) {
            return JSON.stringify({ error: "No project open" });
        }

        return JSON.stringify({
            name: app.project.name,
            path: normalizePath(app.project.path),
            folder: getProjectFolder()
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

// Test function
function testExtension() {
    return JSON.stringify({
        platform: IS_WINDOWS ? 'Windows' : 'macOS',
        projectOpen: app.project ? true : false,
        projectPath: getProjectPath()
    });
}
