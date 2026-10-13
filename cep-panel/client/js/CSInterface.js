/**
 * CSInterface.js — Minimal functional implementation for RudSonic CEP panel
 * Based on Adobe's open-source CSInterface (github.com/Adobe-CEP/CSInterface)
 * Covers the methods used by this plugin.
 */

var SystemPath = {
  USER_DATA: 'userData',
  COMMON_FILES: 'commonFiles',
  MY_DOCUMENTS: 'myDocuments',
  APPLICATION: 'application',
  EXTENSION: 'extension',
  HOST_APPLICATION: 'hostApplication',
  ROAMING_APPDATA: 'roamingAppData',
};

var CSXSWindowType = { _PANEL: 'Panel', _MODELESS: 'Modeless', _MODAL: 'Modal' };

function CSInterface() {
  this.hostEnvironment = this._getHostEnvironment();
}

CSInterface.prototype._getHostEnvironment = function () {
  if (typeof window.__adobe_cep__ !== 'undefined') {
    try {
      return JSON.parse(window.__adobe_cep__.getHostEnvironment());
    } catch (e) { return {}; }
  }
  return {};
};

/**
 * Call an ExtendScript function by evaluating a script string in the host application.
 * @param {string} script - ExtendScript code to evaluate
 * @param {Function} callback - Called with (result) when done
 */
CSInterface.prototype.evalScript = function (script, callback) {
  if (typeof window.__adobe_cep__ !== 'undefined') {
    window.__adobe_cep__.evalScript(script, callback || function () {});
  } else {
    // Development fallback (running in browser)
    console.log('[CSInterface] evalScript (dev mode):', script);
    if (callback) callback('{"success":false,"error":"Not running inside Premiere Pro"}');
  }
};

/**
 * Get system path by type.
 * @param {string} pathType - One of SystemPath constants
 * @returns {string} The system path
 */
CSInterface.prototype.getSystemPath = function (pathType) {
  if (typeof window.__adobe_cep__ !== 'undefined') {
    return window.__adobe_cep__.getSystemPath(pathType);
  }
  // Fallback for dev
  var paths = {
    extension: '',
    userData: '',
    application: '',
  };
  return paths[pathType] || '';
};

/**
 * Add event listener for CEP events.
 */
CSInterface.prototype.addEventListener = function (type, listener, obj) {
  if (typeof window.__adobe_cep__ !== 'undefined') {
    if (obj) {
      window.__adobe_cep__.addEventListener(type, listener, obj);
    } else {
      window.__adobe_cep__.addEventListener(type, listener);
    }
  }
};

/**
 * Dispatch CEP event.
 */
CSInterface.prototype.dispatchEvent = function (event) {
  if (typeof window.__adobe_cep__ !== 'undefined') {
    window.__adobe_cep__.dispatchEvent(event);
  }
};

/**
 * Get extension directory path.
 * @returns {string} Extension root path
 */
CSInterface.prototype.getExtensionDirectory = function () {
  return this.getSystemPath(SystemPath.EXTENSION);
};

/**
 * Check if running inside a CEP host (Premiere Pro).
 * @returns {boolean}
 */
CSInterface.isRunningInsideCEP = function () {
  return typeof window.__adobe_cep__ !== 'undefined';
};

/**
 * Open URL in system browser.
 */
CSInterface.prototype.openURLInDefaultBrowser = function (url) {
  if (typeof window.__adobe_cep__ !== 'undefined') {
    window.__adobe_cep__.openURLInDefaultBrowser(url);
  } else {
    window.open(url, '_blank');
  }
};

// Make available globally
window.CSInterface = CSInterface;
window.SystemPath = SystemPath;
