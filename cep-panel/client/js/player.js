/**
 * player.js — Audio engine for RudSonic
 * Handles play/pause/seek/volume using HTML5 Audio + Web Audio API.
 * Drives the progress bar, waveform overlay, and import-to-Premiere button.
 */

(function (window) {
  'use strict';

  /* ── State ────────────────────────────────────────────────── */
  var audio        = new Audio();
  audio.crossOrigin = 'anonymous';
  audio.preload    = 'metadata';

  var currentTrack = null;   // { id, title, artist, previewUrl, imageUrl, source, ... }
  var playlist     = [];     // current visible list for prev/next
  var playlistIdx  = -1;
  var isPlaying    = false;

  /* ── DOM refs ─────────────────────────────────────────────── */
  var elPlay      = document.getElementById('player-play');
  var elPrev      = document.getElementById('player-prev');
  var elNext      = document.getElementById('player-next');
  var elTitle     = document.getElementById('player-title');
  var elArtist    = document.getElementById('player-artist');
  var elArt       = document.getElementById('player-art');
  var elArtPlaceholder = document.querySelector('.rs-player-art-placeholder');
  var elCurrent   = document.getElementById('player-current');
  var elDuration  = document.getElementById('player-duration');
  var elFill      = document.getElementById('rs-progress-fill');
  var elThumb     = document.getElementById('rs-progress-thumb');
  var elBar       = document.getElementById('rs-progress-bar');
  var elVolume    = document.getElementById('player-volume');
  var elImport    = document.getElementById('player-import');
  var elIconPlay  = elPlay.querySelector('.icon-play');
  var elIconPause = elPlay.querySelector('.icon-pause');

  /* ── Public API ───────────────────────────────────────────── */
  var Player = {

    /**
     * Load and play a track/SFX object.
     * @param {Object} item   — track or sfx object
     * @param {Array}  list   — current playlist array (for prev/next)
     * @param {number} idx    — index of item in list
     */
    play: function (item, list, idx) {
      if (!item || !item.previewUrl) {
        Player.showToast('No preview available for this track.', 'error');
        return;
      }

      // If same track clicked while playing → toggle pause
      if (currentTrack && currentTrack.id === item.id && currentTrack.source === item.source) {
        Player.togglePause();
        return;
      }

      // Update state
      currentTrack = item;
      playlist     = list || [];
      playlistIdx  = (idx !== undefined) ? idx : -1;

      // Reset UI
      _resetProgress();
      elTitle.textContent  = item.title || item.name || 'Unknown';
      elArtist.textContent = item.artist || item.author || '';

      // Album art
      if (item.imageUrl) {
        elArt.src = item.imageUrl;
        elArt.classList.add('visible');
        elArtPlaceholder.style.display = 'none';
      } else {
        elArt.classList.remove('visible');
        elArtPlaceholder.style.display = 'flex';
      }

      // Show import button
      elImport.classList.remove('hidden');

      // Remove playing class from all items
      _clearPlayingState();

      // Mark the playing item
      var el = document.querySelector('[data-track-id="' + item.id + '"][data-source="' + item.source + '"]');
      if (el) el.classList.add('playing');

      // Load & play audio
      audio.src = item.previewUrl;
      audio.volume = parseFloat(elVolume.value);
      audio.load();
      audio.play().then(function () {
        isPlaying = true;
        _showPause();
      }).catch(function (e) {
        console.error('[Player] Playback failed:', e);
        Player.showToast('Could not load preview. Try another track.', 'error');
      });
    },

    /** Toggle play/pause on current track */
    togglePause: function () {
      if (!currentTrack) return;
      if (isPlaying) {
        audio.pause();
        isPlaying = false;
        _showPlay();
      } else {
        audio.play();
        isPlaying = true;
        _showPause();
      }
    },

    /** Play previous track in playlist */
    prev: function () {
      if (playlist.length === 0) return;
      var newIdx = playlistIdx > 0 ? playlistIdx - 1 : playlist.length - 1;
      Player.play(playlist[newIdx], playlist, newIdx);
    },

    /** Play next track in playlist */
    next: function () {
      if (playlist.length === 0) return;
      var newIdx = playlistIdx < playlist.length - 1 ? playlistIdx + 1 : 0;
      Player.play(playlist[newIdx], playlist, newIdx);
    },

    /** @returns {Object|null} Currently loaded track */
    getCurrent: function () { return currentTrack; },

    /** @returns {boolean} */
    isPlaying: function () { return isPlaying; },

    /**
     * Download audio and import it into Premiere Pro via ExtendScript.
     * Uses Node.js (available in CEP) for file system access.
     */
    importToPremiereProj: function () {
      if (!currentTrack) return;
      elImport.classList.add('loading');
      elImport.textContent = 'Downloading…';

      var url  = currentTrack.previewUrl;
      var name = _sanitizeFilename((currentTrack.title || currentTrack.name || 'rudsonic_audio') + '.mp3');

      // Use Node.js fs + path (available in CEP panels)
      try {
        var fs   = require('fs');
        var path = require('path');
        var os   = require('os');

        var dir  = path.join(os.tmpdir(), 'RudSonic');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        var dest = path.join(dir, name);

        // Fetch the audio blob
        fetch(url)
          .then(function (r) { return r.arrayBuffer(); })
          .then(function (buf) {
            fs.writeFileSync(dest, Buffer.from(buf));

            // Call ExtendScript to import the file
            var cs = new CSInterface();
            var safePath = dest.replace(/\\/g, '/');
            var script = 'importAudioToTimeline("' + safePath + '", "' + (currentTrack.title || currentTrack.name) + '")';

            cs.evalScript(script, function (result) {
              elImport.classList.remove('loading');
              elImport.innerHTML = '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg> Import';
              try {
                var res = JSON.parse(result);
                if (res.success) {
                  Player.showToast('✓ Added to Premiere Pro project!', 'success');
                } else {
                  Player.showToast('Import failed: ' + (res.error || 'unknown error'), 'error');
                }
              } catch (e) {
                Player.showToast('✓ Import complete!', 'success');
              }
            });
          })
          .catch(function (e) {
            elImport.classList.remove('loading');
            elImport.innerHTML = 'Import';
            Player.showToast('Download failed. Check your internet connection.', 'error');
          });

      } catch (e) {
        // Not in CEP (dev mode) — just show a message
        elImport.classList.remove('loading');
        elImport.innerHTML = 'Import';
        Player.showToast('Import works inside Premiere Pro only.', 'error');
      }
    },

    /**
     * Show a transient toast notification.
     * @param {string} msg
     * @param {string} type — 'success' | 'error' | ''
     */
    showToast: function (msg, type) {
      var el = document.getElementById('rs-toast');
      if (!el) return;
      el.textContent = msg;
      el.className   = 'rs-toast show' + (type ? ' ' + type : '');
      clearTimeout(el._timer);
      el._timer = setTimeout(function () {
        el.classList.remove('show');
      }, 3000);
    },

    /**
     * Update the SFX waveform progress bar (called externally).
     * @param {string} itemId
     * @param {number} pct  0–100
     */
    updateSFXProgress: function (itemId, pct) {
      var el = document.querySelector('.rs-sfx-item[data-track-id="' + itemId + '"] .rs-sfx-progress');
      if (el) el.style.width = pct + '%';
    },
  };

  /* ── Audio Events ─────────────────────────────────────────── */
  audio.addEventListener('timeupdate', function () {
    if (!audio.duration || isNaN(audio.duration)) return;
    var pct = (audio.currentTime / audio.duration) * 100;
    elFill.style.width  = pct + '%';
    elThumb.style.left  = pct + '%';
    elCurrent.textContent = _formatTime(audio.currentTime);

    // Update SFX waveform progress bar for any non-music source
    if (currentTrack && currentTrack.source !== 'jamendo') {
      Player.updateSFXProgress(currentTrack.id, pct);
    }
  });

  audio.addEventListener('loadedmetadata', function () {
    elDuration.textContent = _formatTime(audio.duration);
  });

  audio.addEventListener('ended', function () {
    isPlaying = false;
    _showPlay();
    _resetProgress();
    _clearPlayingState();
    // Auto-play next
    Player.next();
  });

  audio.addEventListener('error', function () {
    isPlaying = false;
    _showPlay();
    Player.showToast('Preview unavailable. Try another track.', 'error');
  });

  /* ── Controls ─────────────────────────────────────────────── */
  elPlay.addEventListener('click', function () { Player.togglePause(); });
  elPrev.addEventListener('click', function () { Player.prev(); });
  elNext.addEventListener('click', function () { Player.next(); });
  elImport.addEventListener('click', function () { Player.importToPremiereProj(); });

  elVolume.addEventListener('input', function () {
    audio.volume = parseFloat(elVolume.value);
  });

  // Click on progress bar to seek
  elBar.addEventListener('click', function (e) {
    if (!audio.duration || isNaN(audio.duration)) return;
    var rect = elBar.getBoundingClientRect();
    var pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
  });

  /* ── Private Helpers ──────────────────────────────────────── */
  function _showPlay() {
    elIconPlay.classList.remove('hidden');
    elIconPause.classList.add('hidden');
  }
  function _showPause() {
    elIconPlay.classList.add('hidden');
    elIconPause.classList.remove('hidden');
  }
  function _resetProgress() {
    elFill.style.width  = '0%';
    elThumb.style.left  = '0%';
    elCurrent.textContent = '0:00';
    elDuration.textContent = '0:00';
  }
  function _clearPlayingState() {
    document.querySelectorAll('.playing').forEach(function (el) {
      el.classList.remove('playing');
    });
    // Reset SFX progress bars
    document.querySelectorAll('.rs-sfx-progress').forEach(function (el) {
      el.style.width = '0%';
    });
  }
  function _formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function _sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 80);
  }

  window.Player = Player;

})(window);
