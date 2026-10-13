/**
 * RudSonic — ExtendScript Host (index.jsx)
 * Runs inside Premiere Pro's ExtendScript engine.
 * Called from the CEP panel via CSInterface.evalScript()
 */

/**
 * Import an audio file into the active Premiere Pro project bin.
 * @param {string} filePath - Absolute path to the downloaded audio file
 * @param {string} trackName - Display name for the imported clip
 * @returns {string} JSON status string
 */
function importAudioToTimeline(filePath, trackName) {
  try {
    var project = app.project;
    if (!project) {
      return JSON.stringify({ success: false, error: 'No project is open in Premiere Pro.' });
    }

    // Import file into the project (appears in Project panel)
    var importSuccess = project.importFiles(
      [filePath],
      true,            // suppressUI
      project.rootItem, // destination bin (root)
      false            // importAsNumberedStills
    );

    if (!importSuccess) {
      return JSON.stringify({ success: false, error: 'Premiere Pro could not import the file.' });
    }

    return JSON.stringify({ success: true, message: 'Imported: ' + trackName });
  } catch (e) {
    return JSON.stringify({ success: false, error: String(e) });
  }
}

/**
 * Insert the most-recently-imported audio clip at the playhead position
 * on the next available audio track in the active sequence.
 * @param {string} filePath - Absolute path to the downloaded audio file
 * @returns {string} JSON status string
 */
function insertAudioAtPlayhead(filePath) {
  try {
    var project = app.project;
    var sequence = project.activeSequence;

    if (!sequence) {
      return JSON.stringify({ success: false, error: 'No active sequence found.' });
    }

    // First, import the file
    project.importFiles([filePath], true, project.rootItem, false);

    // Find the imported item in the project root
    var rootItem = project.rootItem;
    var importedClip = null;
    for (var i = 0; i < rootItem.children.numItems; i++) {
      var item = rootItem.children[i];
      if (item.getMediaPath && item.getMediaPath() === filePath) {
        importedClip = item;
        break;
      }
    }

    if (!importedClip) {
      return JSON.stringify({ success: false, error: 'Could not locate imported clip.' });
    }

    // Find the first audio track and insert at playhead
    var audioTracks = sequence.audioTracks;
    if (audioTracks.numTracks === 0) {
      return JSON.stringify({ success: false, error: 'No audio tracks in sequence.' });
    }

    var targetTrack = audioTracks[audioTracks.numTracks - 1]; // last audio track
    var playheadTime = sequence.getPlayerPosition();

    targetTrack.insertClip(importedClip, playheadTime.seconds);

    return JSON.stringify({ success: true, message: 'Inserted at playhead.' });
  } catch (e) {
    return JSON.stringify({ success: false, error: String(e) });
  }
}

/**
 * Get the Premiere Pro temp directory path for downloading files
 * @returns {string} Temp dir path
 */
function getTempDirectory() {
  try {
    var tempFolder = Folder.temp;
    var rudsonicTemp = new Folder(tempFolder.fsName + '/RudSonic');
    if (!rudsonicTemp.exists) {
      rudsonicTemp.create();
    }
    return rudsonicTemp.fsName;
  } catch (e) {
    return Folder.temp.fsName;
  }
}

/**
 * Get the active project name (for status display)
 * @returns {string} Project name or empty string
 */
function getProjectName() {
  try {
    return app.project ? app.project.name : '';
  } catch (e) {
    return '';
  }
}
