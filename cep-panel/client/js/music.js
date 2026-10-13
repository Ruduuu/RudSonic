/**
 * music.js — Music page controller
 * Renders the Music tab: trending, search, genre chips, mood/duration filters.
 */

(function (window) {
  'use strict';

  /* ── State ────────────────────────────────────────────────── */
  var state = {
    query:       '',
    genre:       '',
    mood:        '',
    durationMax: 600,
    page:        1,
    loading:     false,
    results:     [],
    total:       0,
  };

  /* ── DOM refs ─────────────────────────────────────────────── */
  var elList       = document.getElementById('music-list');
  var elSearch     = document.getElementById('music-search');
  var elClear      = document.getElementById('music-search-clear');
  var elMood       = document.getElementById('music-mood');
  var elDuration   = document.getElementById('music-duration');
  var elLoadMore   = document.getElementById('music-load-more');
  var elTitle      = document.getElementById('music-section-title');
  var elCount      = document.getElementById('music-count');
  var elChips      = document.getElementById('music-genre-chips');

  /* ── Debounce helper ──────────────────────────────────────── */
  var _searchTimer;
  function debounce(fn, ms) {
    return function () {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(fn, ms);
    };
  }

  /* ── Public ───────────────────────────────────────────────── */
  var MusicPage = {

    /** Called once on app init */
    init: function () {
      _bindEvents();
      MusicPage.loadTrending();
    },

    /** Fetch and show trending music */
    loadTrending: function () {
      elTitle.textContent = '🔥 Trending';
      state.page    = 1;
      state.query   = '';
      state.results = [];
      _showSkeletons();

      RudSonicAPI.getTrending()
        .then(function (data) {
          state.results = data.music || [];
          state.total   = state.results.length;
          _renderList(state.results, false);
          elLoadMore.classList.add('hidden');
          if (elCount) elCount.textContent = state.results.length + ' tracks';
        })
        .catch(function (e) {
          console.error('[Music] Trending fetch failed:', e);
          _showError('Could not load trending music. Check your internet.');
        });
    },

    /** Fetch search results */
    search: function () {
      state.page    = 1;
      state.results = [];
      _showSkeletons();

      var isSearch = state.query || state.genre || state.mood;
      elTitle.textContent = isSearch
        ? '🔍 Results'
        : '🔥 Trending';

      if (!isSearch) {
        MusicPage.loadTrending();
        return;
      }

      RudSonicAPI.searchMusic({
        q:           state.query,
        genre:       state.genre,
        mood:        state.mood,
        durationMax: state.durationMax,
        page:        1,
      })
        .then(function (data) {
          state.results = data.results || [];
          state.total   = data.total   || state.results.length;
          _renderList(state.results, false);
          _updateCount();
          var hasMore = state.results.length < state.total;
          elLoadMore.classList.toggle('hidden', !hasMore);
        })
        .catch(function (e) {
          console.error('[Music] Search failed:', e);
          _showError('Search failed. Check your internet connection.');
        });
    },

    /** Load next page */
    loadMore: function () {
      if (state.loading) return;
      state.page++;
      state.loading = true;
      elLoadMore.textContent = 'Loading…';

      RudSonicAPI.searchMusic({
        q:           state.query,
        genre:       state.genre,
        mood:        state.mood,
        durationMax: state.durationMax,
        page:        state.page,
      })
        .then(function (data) {
          var newItems = data.results || [];
          state.results = state.results.concat(newItems);
          _renderList(newItems, true);
          state.loading = false;
          elLoadMore.textContent = 'Load more';
          var hasMore = state.results.length < (data.total || 0);
          elLoadMore.classList.toggle('hidden', !hasMore);
        })
        .catch(function () {
          state.loading = false;
          elLoadMore.textContent = 'Load more';
        });
    },
  };

  /* ── Render ───────────────────────────────────────────────── */
  function _renderList(tracks, append) {
    if (!append) elList.innerHTML = '';

    if (!tracks || tracks.length === 0) {
      if (!append) {
        elList.innerHTML = _emptyState('No music found', 'Try a different search or genre');
        elLoadMore.classList.add('hidden');
      }
      return;
    }

    var frag = document.createDocumentFragment();
    tracks.forEach(function (track, i) {
      var el = _buildTrackEl(track, i + (append ? state.results.length - tracks.length : 0));
      frag.appendChild(el);
    });
    elList.appendChild(frag);
  }

  function _buildTrackEl(track, listIdx) {
    var isFav = Favorites.isMusicFav(track.id);
    var dur   = _formatDuration(track.duration);
    var genre = track.genre || '';
    var bpm   = track.bpm   ? track.bpm + ' BPM' : '';

    var el = document.createElement('div');
    el.className = 'rs-track-item';
    el.dataset.trackId = track.id;
    el.dataset.source  = track.source;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', 'Play ' + (track.title || 'Track'));

    el.innerHTML = [
      '<div class="rs-track-art">',
        track.imageUrl
          ? '<img src="' + track.imageUrl + '" alt="" loading="lazy" />'
          : '<div class="rs-track-art-placeholder"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 18V5l12-2v13M6 21a3 3 0 100-6 3 3 0 000 6zm12-2a3 3 0 100-6 3 3 0 000 6z"/></svg></div>',
        '<div class="rs-track-play-overlay">',
          '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg>',
        '</div>',
      '</div>',
      '<div class="rs-track-info">',
        '<div class="rs-track-title">' + _esc(track.title || 'Untitled') + '</div>',
        '<div class="rs-track-meta">',
          '<span class="rs-track-artist">' + _esc(track.artist || '') + '</span>',
          genre ? '<span class="rs-track-badge genre">' + _esc(genre) + '</span>' : '',
          bpm   ? '<span class="rs-track-badge">' + bpm + '</span>' : '',
        '</div>',
      '</div>',
      '<div class="rs-track-right">',
        '<span class="rs-track-duration">' + dur + '</span>',
        '<button class="rs-icon-btn fav-btn' + (isFav ? ' active' : '') + '" data-action="fav" title="' + (isFav ? 'Remove favorite' : 'Add to favorites') + '">',
          '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/></svg>',
        '</button>',
        '<button class="rs-icon-btn import-btn" data-action="import" title="Import to Premiere Pro">',
          '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>',
        '</button>',
      '</div>',
    ].join('');

    // Click row → play
    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-action]')) return;
      Player.play(track, state.results, listIdx);
    });

    // Favorite button
    el.querySelector('[data-action="fav"]').addEventListener('click', function (e) {
      e.stopPropagation();
      var added = Favorites.toggleMusic(track);
      this.classList.toggle('active', added);
      this.title = added ? 'Remove favorite' : 'Add to favorites';
      Player.showToast(added ? '❤️ Added to Favorites' : 'Removed from Favorites');
      // Refresh fav page if visible
      if (window.FavoritesPage) window.FavoritesPage.refresh();
    });

    // Import button
    el.querySelector('[data-action="import"]').addEventListener('click', function (e) {
      e.stopPropagation();
      Player.play(track, state.results, listIdx);
      setTimeout(function () { Player.importToPremiereProj(); }, 300);
    });

    return el;
  }

  /* ── Bind Events ──────────────────────────────────────────── */
  function _bindEvents() {
    // Search input
    var debouncedSearch = debounce(function () {
      state.query = elSearch.value.trim();
      elClear.classList.toggle('hidden', !state.query);
      MusicPage.search();
    }, 450);

    elSearch.addEventListener('input', debouncedSearch);
    elSearch.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { clearTimeout(_searchTimer); state.query = elSearch.value.trim(); MusicPage.search(); }
    });

    elClear.addEventListener('click', function () {
      elSearch.value = '';
      state.query    = '';
      elClear.classList.add('hidden');
      MusicPage.loadTrending();
    });

    // Genre chips
    elChips.addEventListener('click', function (e) {
      var btn = e.target.closest('.rs-chip');
      if (!btn) return;
      elChips.querySelectorAll('.rs-chip').forEach(function (c) { c.classList.remove('active'); });
      btn.classList.add('active');
      state.genre = btn.dataset.genre || '';
      state.page  = 1;
      MusicPage.search();
    });

    // Mood + Duration filters
    elMood.addEventListener('change', function () {
      state.mood = elMood.value;
      MusicPage.search();
    });
    elDuration.addEventListener('change', function () {
      state.durationMax = parseInt(elDuration.value, 10);
      MusicPage.search();
    });

    // Load more
    elLoadMore.addEventListener('click', function () { MusicPage.loadMore(); });
  }

  /* ── Helpers ──────────────────────────────────────────────── */
  function _showSkeletons() {
    elList.innerHTML = [1,2,3,4,5].map(function () {
      return '<div class="rs-skeleton-item"></div>';
    }).join('');
    elLoadMore.classList.add('hidden');
  }

  function _showError(msg) {
    elList.innerHTML = '<div class="rs-empty-state"><p>' + _esc(msg) + '</p></div>';
  }

  function _emptyState(title, sub) {
    return '<div class="rs-empty-state">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"/></svg>' +
      '<p>' + _esc(title) + '</p><span>' + _esc(sub) + '</span></div>';
  }

  function _updateCount() {
    if (elCount) elCount.textContent = state.total ? state.total + ' tracks' : '';
  }

  function _formatDuration(sec) {
    if (!sec) return '';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.MusicPage = MusicPage;

})(window);
