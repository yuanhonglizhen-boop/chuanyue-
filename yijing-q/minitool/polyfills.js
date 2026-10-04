/* 小工具最低基线是 Chrome / WebView 61。这里只补游戏实际用到、而 Chrome 61 没有的运行时 API（ES2017 手写，经典脚本）。 */
(function () {
  'use strict';
  /* Three.js 的 LoadingManager 在加载时就会 new AbortController()（Chrome 66+）。游戏不联网、不用加载器，给一个最小实现即可。 */
  if (typeof window.AbortController === 'undefined') {
    var Signal = function () { this.aborted = false; this.onabort = null; };
    Signal.prototype.addEventListener = function () {};
    Signal.prototype.removeEventListener = function () {};
    var Ctl = function () { this.signal = new Signal(); };
    Ctl.prototype.abort = function () {
      if (this.signal.aborted) return;
      this.signal.aborted = true;
      if (typeof this.signal.onabort === 'function') { try { this.signal.onabort(); } catch (e) {} }
    };
    window.AbortController = Ctl;
  }
})();
