// Runs inside the designer document, isolated from the app's React runtime.
(function () {
  const actions = { 'Locate.dc.html': 'start', 'Login.dc.html': 'login' };
  const send = action => {
    const message = JSON.stringify({ channel: 'ms-traders-splash', action });
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(message);
    else if (window.parent !== window) window.parent.postMessage(message, '*');
  };
  let busy = false;
  const setBusy = value => {
    busy = value;
    document.querySelectorAll('.splash-actions a').forEach(link => {
      link.setAttribute('aria-disabled', String(value));
      link.style.pointerEvents = value ? 'none' : '';
    });
  };
  window.__MSSplash = {
    setState(state) {
      const root = document.documentElement;
      root.dataset.reducedMotion = String(Boolean(state.reducedMotion));
      root.dataset.paused = String(Boolean(state.paused));
      if (state.paused) root.dataset.introComplete = 'true';
      if (!state.paused) setBusy(false);
    },
    reset: () => setBusy(false),
  };
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a');
    if (!link) return;
    // Prototype links are handled by React Navigation; never load sibling HTML files.
    event.preventDefault();
    const action = actions[link.getAttribute('href')];
    if (!action || busy) return;
    setBusy(true);
    send(action);
  });
  const ready = () => {
    if (document.querySelector('#dc-root .splash-screen')) send('ready');
    else window.requestAnimationFrame(ready);
  };
  ready();
})();
