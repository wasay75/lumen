/* Lumen — "add to your device".
   Chrome-family browsers hand us a real install prompt; iOS Safari has no API,
   so there we show the two-step gesture instead. Nothing appears if the game is
   already installed, or on a browser that cannot install it. */
(function (root, doc) {
  'use strict';

  var deferred = null;
  var btn = doc.getElementById('btn-install');
  var dot = doc.getElementById('dot-install');
  var sheet = doc.getElementById('veil-install');
  if (!btn || !sheet) return;

  function standalone() {
    return (root.matchMedia && root.matchMedia('(display-mode: standalone)').matches) ||
           root.navigator.standalone === true;
  }

  var ua = root.navigator.userAgent;
  var isIOS = /iPad|iPhone|iPod/.test(ua) ||
              (root.navigator.platform === 'MacIntel' && root.navigator.maxTouchPoints > 1);
  var isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);

  root.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    if (!standalone()) { btn.hidden = false; dot.hidden = false; }
  });

  root.addEventListener('appinstalled', function () {
    deferred = null;
    btn.hidden = true; dot.hidden = true;
  });

  // iOS never fires the event, so offer the instructions there instead.
  if (!standalone() && (isIOS || isSafari)) { btn.hidden = false; dot.hidden = false; }

  btn.addEventListener('click', function () {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function (r) {
        if (r && r.outcome === 'accepted') { btn.hidden = true; dot.hidden = true; }
        deferred = null;
      });
      return;
    }
    doc.getElementById('install-ios').hidden = !isIOS;
    doc.getElementById('install-desktop').hidden = isIOS;
    sheet.hidden = false;
  });

  doc.getElementById('btn-install-close').addEventListener('click', function () {
    sheet.hidden = true;
  });

  // Register the offline cache. file:// has no service workers — that build is
  // already a single self-contained file, so it does not need one.
  if ('serviceWorker' in root.navigator && location.protocol.indexOf('http') === 0) {
    root.addEventListener('load', function () {
      root.navigator.serviceWorker.register('./sw.js').catch(function () {});
    });
  }
})(window, document);
