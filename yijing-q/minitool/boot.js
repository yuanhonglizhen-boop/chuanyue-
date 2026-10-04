/* 小工具启动脚本（ES2017 经典脚本）：
   1. 检测 WebGL 2（Three.js r179 需要）。不可用时显示说明，不加载游戏，避免白屏。
   2. 检测 Flex gap 是否真正生效，不生效时给 <html> 加 no-flexgap，由 compat-post.css 改用 margin。
   3. 客户端 9.46+ 时先用容器 Storage 读出存档（最多等 800 ms），再加载 main.js；写存档时同时写容器 Storage。 */
(function () {
  'use strict';
  var KEY = 'yijing-q-save-v1';
  var STORAGE_MIN_CLIENT_VERSION = 9460;

  function supportsFlexGap() {
    var flex = document.createElement('div');
    flex.style.position = 'absolute';
    flex.style.visibility = 'hidden';
    flex.style.display = 'flex';
    flex.style.flexDirection = 'column';
    flex.style.rowGap = '1px';
    flex.appendChild(document.createElement('div'));
    flex.appendChild(document.createElement('div'));
    document.body.appendChild(flex);
    var ok = flex.scrollHeight === 1;
    flex.parentNode.removeChild(flex);
    return ok;
  }

  function hasWebGL2() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
    } catch (e) { return false; }
  }

  function showFallback(text) {
    var l = document.getElementById('loading');
    if (l) l.hidden = true;
    var n = document.getElementById('glnote');
    if (!n) return;
    /* 游戏没能启动时，页面上其余界面（标题框、按钮）点了也没反应，一并隐藏，只留说明 */
    var kids = document.body.children;
    for (var i = 0; i < kids.length; i++) if (kids[i] !== n && kids[i].tagName !== 'SCRIPT') kids[i].hidden = true;
    n.textContent = text; n.hidden = false;
  }

  function clientVersion(launch) {
    var env = launch && launch.miniToolEnv;
    return Math.floor((Number(env && env.buildVersion) || 0) / 1000);
  }

  function getLaunch() {
    var xhs = window.xhs;
    if (xhs && xhs.launchOptions) return Promise.resolve(xhs.launchOptions);
    var mt = xhs && xhs.miniTool;
    if (!mt || typeof mt.getLaunchOptions !== 'function') return Promise.resolve(null);
    try { return Promise.resolve(mt.getLaunchOptions()).catch(function () { return null; }); }
    catch (e) { return Promise.resolve(null); }
  }

  function withTimeout(p, ms) {
    return new Promise(function (resolve) {
      var done = false;
      setTimeout(function () { if (!done) { done = true; resolve(null); } }, ms);
      p.then(function (v) { if (!done) { done = true; resolve(v); } }, function () { if (!done) { done = true; resolve(null); } });
    });
  }

  async function prepareStorage() {
    var mt = window.xhs && window.xhs.miniTool;
    if (!mt || typeof mt.getStorage !== 'function' || typeof mt.setStorage !== 'function') return;
    var launch = await withTimeout(getLaunch(), 600);
    if (clientVersion(launch) < STORAGE_MIN_CLIENT_VERSION) return;
    window.__YQ_STORE = mt;
    var res = await withTimeout(Promise.resolve().then(function () { return mt.getStorage({ key: KEY }); }), 800);
    if (res && typeof res.data === 'string' && res.data) window.__YQ_SAVE_JSON = res.data;
  }

  function loadGame() {
    var s = document.createElement('script');
    s.src = './main.js';
    s.onerror = function () { showFallback('游戏文件加载失败，请关闭后重新打开。'); };
    document.body.appendChild(s);
  }

  window.addEventListener('error', function () {
    if (!window.__Q || !window.__Q.ready) showFallback('这台设备暂时运行不了这个游戏，请换一台手机或更新小红书后再试。');
  });

  if (!supportsFlexGap()) document.documentElement.classList.add('no-flexgap');
  if (!hasWebGL2()) {
    showFallback('这台设备的浏览器内核不支持 WebGL 2，暂时运行不了 3D 画面。请更新系统或小红书后再试。');
    return;
  }
  prepareStorage().then(loadGame, loadGame);
})();
