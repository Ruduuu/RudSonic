/**
 * api.js — Fetch wrapper for RudSonic Vercel backend
 * All requests go through the Vercel API, keeping API keys server-side.
 */

(function(window) {
    'use strict';

    // ── Configuration ─────────────────────────────────────────────
    // Replace this with your actual Vercel deployment URL after deploying
    var BASE_URL = 'https://rudsonic.vercel.app';

    // For local development, uncomment:
    // var BASE_URL = 'http://localhost:3000';

    var CACHE = {};

    // ── Public API ────────────────────────────────────────────────

    var RudSonicAPI = {

        /**
         * Fetch trending music and SFX.
         * @returns {Promise<{music: Track[], sfx: SFX[]}>}
         */
        getTrending: function() {
            return _fetch('/api/trending');
        },

        /**
         * Search music tracks via Jamendo.
         * @param {Object} opts - { q, genre, mood, durationMax, page }
         * @returns {Promise<{results: Track[], total: number}>}
         */
        searchMusic: function(opts) {
            var params = _buildParams({
                q: opts.q || '',
                genre: opts.genre || '',
                mood: opts.mood || '',
                durationMax: opts.durationMax || 600,
                page: opts.page || 1,
            });
            return _fetch('/api/music?' + params);
        },

        /**
         * Search sound effects via Freesound.
         * @param {Object} opts - { q, category, durationMax, page }
         * @returns {Promise<{results: SFX[], total: number}>}
         */
        searchSFX: function(opts) {
            var params = _buildParams({
                q: opts.q || '',
                category: opts.category || '',
                durationMax: opts.durationMax || 30,
                page: opts.page || 1,
            });
            return _fetch('/api/sfx?' + params);
        },

    };

    // ── Private Helpers ───────────────────────────────────────────

    function _buildParams(obj) {
        return Object.keys(obj)
            .filter(function(k) { return obj[k] !== '' && obj[k] !== undefined; })
            .map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]); })
            .join('&');
    }

    function _fetch(path) {
        var url = BASE_URL + path;

        // Return cached result if available (5 min TTL)
        if (CACHE[url] && Date.now() - CACHE[url].ts < 5 * 60 * 1000) {
            return Promise.resolve(CACHE[url].data);
        }

        return fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            })
            .then(function(res) {
                if (!res.ok) {
                    throw new Error('API error: ' + res.status + ' ' + res.statusText);
                }
                return res.json();
            })
            .then(function(data) {
                CACHE[url] = { data: data, ts: Date.now() };
                return data;
            });
    }

    window.RudSonicAPI = RudSonicAPI;

})(window);