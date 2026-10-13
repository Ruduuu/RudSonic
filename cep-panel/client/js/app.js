/**
 * app.js — RudSonic main application controller
 * Initialises all page modules, wires tab navigation, favorites page,
 * and shows project status from Premiere Pro.
 */

(function (window) {
  'use strict';

  /* ── Tab Navigation ───────────────────────────────────────── */
  var tabs  = document.querySelectorAll('.rs-tab');
  var pages = document.querySelectorAll('.rs-page');

  function showTab(tabName) {
    tabs.forEach(function (t) {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });
    pages.forEach(function (p) {
      var id = p.id.replace('page-', '');
      p.classList.toggle('active', id === tabName);
    });

    if (tabName === 'favorites') {
      FavoritesPage.refresh();
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      showTab(this.dataset.tab);
    });
  });

  /* ── Favorites Page Controller ────────────────────────────── */
  var FavoritesPage = {
    init: function () {
      // Sub-tabs
      var subTabs = document.querySelectorAll('.rs-sub-tab');
      var favLists = document.querySelectorAll('.rs-fav-list');
      subTabs.forEach(function (st) {
        st.addEventListener('click', function () {
          subTabs.forEach(function (t) { t.classList.remove('active'); });
          favLists.forEach(function (l) { l.classList.remove('active'); });
          st.classList.add('active');
          var target = document.getElementById(st.dataset.subtab);
          if (target) target.classList.add('active');
        });
      });
    },

    refresh: function () {
      var musicItems = Favorites.getAllMusic();
      var sfxItems   = Favorites.getAllSFX();
      var elEmpty    = document.getElementById('fav-empty');
      var elFavMusic = document.getElementById('fav-music');
      var elFavSFX   = document.getElementById('fav-sfx');

      // Music favs
      elFavMusic.innerHTML = '';
      if (musicItems.length > 0) {
        musicItems.forEach(function (track, i) {
          var el = _buildFavMusicEl(track, i, musicItems);
          elFavMusic.appendChild(el);
        });
      } else {
        elFavMusic.innerHTML = '<p style="padding:16px 12px;font-size:12px;color:var(--text-dim)">No music saved yet.</p>';
      }

      // SFX favs
      elFavSFX.innerHTML = '';
      if (sfxItems.length > 0) {
        sfxItems.forEach(function (sfx, i) {
          var el = _buildFavSFXEl(sfx, i, sfxItems);
          elFavSFX.appendChild(el);
        });
      } else {
        elFavSFX.innerHTML = '<p style="padding:16px 12px;font-size:12px;color:var(--text-dim)">No SFX saved yet.</p>';
      }

      // Empty state
      var total = musicItems.length + sfxItems.length;
      if (elEmpty) elEmpty.classList.toggle('hidden', total > 0);
    },
  };

  function _buildFavMusicEl(track, idx, list) {
    var el = document.createElement('div');
    el.className = 'rs-track-item';
    el.dataset.trackId = track.id;
    el.dataset.source  = track.source;
    var dur = _fmt(track.duration);

    el.innerHTML = [
      '<div class="rs-track-art">',
        track.imageUrl
          ? '<img src="' + _esc(track.imageUrl) + '" alt="" loading="lazy" />'
          : '<div class="rs-track-art-placeholder"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 18V5l12-2v13M6 21a3 3 0 100-6 3 3 0 000 6zm12-2a3 3 0 100-6 3 3 0 000 6z"/></svg></div>',
        '<div class="rs-track-play-overlay"><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg></div>',
      '</div>',
      '<div class="rs-track-info">',
        '<div class="rs-track-title">' + _esc(track.title || 'Untitled') + '</div>',
        '<div class="rs-track-meta"><span class="rs-track-artist">' + _esc(track.artist || '') + '</span></div>',
      '</div>',
      '<div class="rs-track-right">',
        '<span class="rs-track-duration">' + dur + '</span>',
        '<button class="rs-icon-btn fav-btn active" data-action="unfav" title="Remove">',
          '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/></svg>',
        '</button>',
      '</div>',
    ].join('');

    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-action]')) return;
      Player.play(track, list, idx);
    });
    el.querySelector('[data-action="unfav"]').addEventListener('click', function (e) {
      e.stopPropagation();
      Favorites.toggleMusic(track);
      FavoritesPage.refresh();
      Player.showToast('Removed from Favorites');
    });
    return el;
  }

  function _buildFavSFXEl(sfx, idx, list) {
    var el = document.createElement('div');
    el.className = 'rs-sfx-item';
    el.dataset.trackId = sfx.id;
    el.dataset.source  = sfx.source;
    var dur = sfx.duration ? sfx.duration.toFixed(1) + 's' : '';

    el.innerHTML = [
      '<button class="rs-sfx-play" title="Preview">',
        '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg>',
      '</button>',
      '<div class="rs-sfx-waveform">',
        sfx.waveformUrl
          ? '<img src="' + _esc(sfx.waveformUrl) + '" alt="" loading="lazy" />'
          : '<div class="rs-sfx-waveform-empty"></div>',
        '<div class="rs-sfx-progress"></div>',
      '</div>',
      '<div class="rs-sfx-info"><div class="rs-sfx-name">' + _esc(sfx.name || 'Sound') + '</div><div class="rs-sfx-dur">' + dur + '</div></div>',
      '<button class="rs-icon-btn fav-btn active" data-action="unfav" title="Remove">',
        '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/></svg>',
      '</button>',
    ].join('');

    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-action]')) return;
      Player.play(sfx, list, idx);
    });
    el.querySelector('[data-action="unfav"]').addEventListener('click', function (e) {
      e.stopPropagation();
      Favorites.toggleSFX(sfx);
      FavoritesPage.refresh();
      Player.showToast('Removed from Favorites');
    });
    return el;
  }

  /* ── Premiere Pro Status Check ────────────────────────────── */
  function _checkPPROStatus() {
    if (!CSInterface.isRunningInsideCEP()) return; // dev mode
    var cs = new CSInterface();
    cs.evalScript('getProjectName()', function (name) {
      if (name && name !== 'undefined') {
        Player.showToast('Premiere Pro: ' + name);
      }
    });
  }

  /* ── Helpers ──────────────────────────────────────────────── */
  function _fmt(sec) {
    if (!sec) return '';
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── Bootstrap ────────────────────────────────────────────── */
  window.FavoritesPage = FavoritesPage;

  document.addEventListener('DOMContentLoaded', function () {
    MusicPage.init();
    SFXPage.init();
    FavoritesPage.init();
    _checkPPROStatus();
    console.log('[RudSonic] Loaded ✓');
  });

})(window);
