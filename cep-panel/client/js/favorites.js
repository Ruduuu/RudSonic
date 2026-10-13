/**
 * favorites.js — localStorage-based favorites manager
 * Stores music tracks and SFX independently.
 */

(function (window) {
  'use strict';

  var STORAGE_KEY = 'rudsonic_favorites_v1';

  function _load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { music: {}, sfx: {} };
    } catch (e) {
      return { music: {}, sfx: {} };
    }
  }

  function _save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[Favorites] Could not save:', e);
    }
  }

  var Favorites = {

    /**
     * Toggle a music track in favorites.
     * @param {Object} track - Full track object
     * @returns {boolean} true if now favorited, false if removed
     */
    toggleMusic: function (track) {
      var data = _load();
      if (data.music[track.id]) {
        delete data.music[track.id];
        _save(data);
        return false;
      } else {
        data.music[track.id] = Object.assign({}, track, { savedAt: Date.now() });
        _save(data);
        return true;
      }
    },

    /**
     * Toggle an SFX in favorites.
     * @param {Object} sfx - Full SFX object
     * @returns {boolean} true if now favorited
     */
    toggleSFX: function (sfx) {
      var data = _load();
      if (data.sfx[sfx.id]) {
        delete data.sfx[sfx.id];
        _save(data);
        return false;
      } else {
        data.sfx[sfx.id] = Object.assign({}, sfx, { savedAt: Date.now() });
        _save(data);
        return true;
      }
    },

    /** @param {string} id @returns {boolean} */
    isMusicFav: function (id) {
      return !!_load().music[id];
    },

    /** @param {string} id @returns {boolean} */
    isSFXFav: function (id) {
      return !!_load().sfx[id];
    },

    /** @returns {Object[]} Array of favorited music tracks, sorted newest first */
    getAllMusic: function () {
      var data = _load();
      return Object.values(data.music).sort(function (a, b) { return b.savedAt - a.savedAt; });
    },

    /** @returns {Object[]} Array of favorited SFX, sorted newest first */
    getAllSFX: function () {
      var data = _load();
      return Object.values(data.sfx).sort(function (a, b) { return b.savedAt - a.savedAt; });
    },

    /** @returns {number} Total favorites count */
    count: function () {
      var data = _load();
      return Object.keys(data.music).length + Object.keys(data.sfx).length;
    },

    /** Clear all favorites */
    clearAll: function () {
      _save({ music: {}, sfx: {} });
    },
  };

  window.Favorites = Favorites;

})(window);
