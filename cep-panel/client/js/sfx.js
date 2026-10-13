/**
 * sfx.js — Sound Effects page controller
 * Renders the SFX tab: category sidebar, SFX list with inline waveform + play.
 */

(function (window) {
  'use strict';

  /* ── State ────────────────────────────────────────────────── */
  var state = {
    query:       '',
    category:    '',
    durationMax: 30,
    page:        1,
    loading:     false,
    results:     [],
    total:       0,
  };

  /* ── DOM refs ─────────────────────────────────────────────── */
  var elList     = document.getElementById('sfx-list');
  var elSearch   = document.getElementById('sfx-search');
  var elClear    = document.getElementById('sfx-search-clear');
  var elLoadMore = document.getElementById('sfx-load-more');
  var elTitle    = document.getElementById('sfx-section-title');
  var elCount    = document.getElementById('sfx-count');
  var elSidebar  = document.getElementById('sfx-category-sidebar');

  /* ── Debounce ─────────────────────────────────────────────── */
  var _timer;
  function debounce(fn, ms) {
    return function () { clearTimeout(_timer); _timer = setTimeout(fn, ms); };
  }

  /* ── Public ───────────────────────────────────────────────── */
  var SFXPage = {

    init: function () {
      _bindEvents();
      SFXPage.loadTrending();
    },

    loadTrending: function () {
      elTitle.textContent = '🔥 Trending SFX';
      state.page    = 1;
      state.results = [];
      _showSkeletons();

      RudSonicAPI.getTrending()
        .then(function (data) {
          state.results = data.sfx || [];
          state.total   = state.results.length;
          _renderList(state.results, false);
          elLoadMore.classList.add('hidden');
          if (elCount) elCount.textContent = state.results.length + ' sounds';
        })
        .catch(function (e) {
          console.error('[SFX] Trending fetch failed:', e);
          _showError('Could not load trending SFX. Check internet.');
        });
    },

    search: function () {
      state.page    = 1;
      state.results = [];
      _showSkeletons();

      var isSearch = state.query || state.category;
      elTitle.textContent = isSearch
        ? (state.category ? _catLabel(state.category) : '🔍 Results')
        : '🔥 Trending SFX';

      if (!isSearch) {
        SFXPage.loadTrending();
        return;
      }

      RudSonicAPI.searchSFX({
        q:           state.query,
        category:    state.category,
        durationMax: state.durationMax,
        page:        1,
      })
        .then(function (data) {
          state.results = data.results || [];
          state.total   = data.total   || state.results.length;
          _renderList(state.results, false);
          if (elCount) elCount.textContent = state.total + ' sounds';
          var hasMore = state.results.length < state.total;
          elLoadMore.classList.toggle('hidden', !hasMore);
        })
        .catch(function (e) {
          console.error('[SFX] Search failed:', e);
          _showError('Search failed. Check your internet connection.');
        });
    },

    loadMore: function () {
      if (state.loading) return;
      state.page++;
      state.loading = true;
      elLoadMore.textContent = 'Loading…';

      RudSonicAPI.searchSFX({
        q:           state.query,
        category:    state.category,
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
  function _renderList(items, append) {
    if (!append) elList.innerHTML = '';

    if (!items || items.length === 0) {
      if (!append) elList.innerHTML = _emptyState('No sounds found', 'Try a different search or category');
      return;
    }

    var frag = document.createDocumentFragment();
    items.forEach(function (sfx, i) {
      var el = _buildSFXEl(sfx, i + (append ? state.results.length - items.length : 0));
      frag.appendChild(el);
    });
    elList.appendChild(frag);
  }

  function _buildSFXEl(sfx, listIdx) {
    var isFav = Favorites.isSFXFav(sfx.id);
    var dur   = sfx.duration ? sfx.duration.toFixed(1) + 's' : '';
    var license = (sfx.license || '').toUpperCase();

    var el = document.createElement('div');
    el.className = 'rs-sfx-item';
    el.dataset.trackId = sfx.id;
    el.dataset.source  = sfx.source || 'freesound';
    el.setAttribute('role', 'button');

    el.innerHTML = [
      /* Mini play button */
      '<button class="rs-sfx-play" data-action="play" title="Preview">',
        '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg>',
      '</button>',
      /* Waveform visual */
      '<div class="rs-sfx-waveform">',
        sfx.waveformUrl
          ? '<img src="' + sfx.waveformUrl + '" alt="" loading="lazy" />'
          : '<div class="rs-sfx-waveform-empty"></div>',
        '<div class="rs-sfx-progress"></div>',
      '</div>',
      /* Name + duration */
      '<div class="rs-sfx-info">',
        '<div class="rs-sfx-name" title="' + _esc(sfx.name) + '">' + _esc(sfx.name || 'Sound') + '</div>',
        '<div class="rs-sfx-dur">' + dur + '</div>',
      '</div>',
      /* License badge */
      '<span class="rs-license ' + (license === 'CC0' ? 'cc0' : 'ccby') + '">' + (license || 'CC') + '</span>',
      /* Fav button */
      '<button class="rs-icon-btn fav-btn' + (isFav ? ' active' : '') + '" data-action="fav" title="' + (isFav ? 'Remove' : 'Favorite') + '">',
        '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/></svg>',
      '</button>',
      /* Import button */
      '<button class="rs-icon-btn import-btn" data-action="import" title="Import to Premiere Pro">',
        '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>',
      '</button>',
    ].join('');

    /* Click row or play button → play */
    function _play(e) {
      if (e && e.target.closest('[data-action="fav"]')) return;
      if (e && e.target.closest('[data-action="import"]')) return;
      Player.play(sfx, state.results, listIdx);
    }
    el.addEventListener('click', _play);

    /* Fav */
    el.querySelector('[data-action="fav"]').addEventListener('click', function (e) {
      e.stopPropagation();
      var added = Favorites.toggleSFX(sfx);
      this.classList.toggle('active', added);
      Player.showToast(added ? '❤️ Added to Favorites' : 'Removed from Favorites');
      if (window.FavoritesPage) window.FavoritesPage.refresh();
    });

    /* Import */
    el.querySelector('[data-action="import"]').addEventListener('click', function (e) {
      e.stopPropagation();
      Player.play(sfx, state.results, listIdx);
      setTimeout(function () { Player.importToPremiereProj(); }, 300);
    });

    return el;
  }

  /* ── Event Binding ────────────────────────────────────────── */
  function _bindEvents() {
    var debouncedSearch = debounce(function () {
      state.query = elSearch.value.trim();
      elClear.classList.toggle('hidden', !state.query);
      SFXPage.search();
    }, 400);

    elSearch.addEventListener('input', debouncedSearch);
    elSearch.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        clearTimeout(_timer);
        state.query = elSearch.value.trim();
        SFXPage.search();
      }
    });

    elClear.addEventListener('click', function () {
      elSearch.value = '';
      state.query    = '';
      elClear.classList.add('hidden');
      SFXPage.search();
    });

    /* Category sidebar */
    elSidebar.addEventListener('click', function (e) {
      var btn = e.target.closest('.rs-category-btn');
      if (!btn) return;
      elSidebar.querySelectorAll('.rs-category-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.category = btn.dataset.category || '';
      state.query    = '';
      elSearch.value = '';
      elClear.classList.add('hidden');
      SFXPage.search();
    });

    elLoadMore.addEventListener('click', function () { SFXPage.loadMore(); });
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
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"/></svg>' +
      '<p>' + _esc(title) + '</p><span>' + _esc(sub) + '</span></div>';
  }

  function _catLabel(cat) {
    var labels = {
      whooshes: '💨 Whooshes', transitions: '⚡ Transitions', impacts: '💥 Impacts',
      risers: '📈 Risers', 'cinematic-hits': '🎬 Cinematic', 'ui-sounds': '🖱️ UI Sounds',
      footsteps: '👟 Footsteps', ambience: '🌧️ Ambience', nature: '🌿 Nature',
      'sci-fi': '🛸 Sci-Fi', foley: '🎭 Foley', doors: '🚪 Doors', vehicles: '🚗 Vehicles',
    };
    return labels[cat] || cat;
  }

  function _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.SFXPage = SFXPage;

})(window);
