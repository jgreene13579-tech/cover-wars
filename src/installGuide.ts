/**
 * First-visit walkthrough for adding the game to a phone's home screen.
 * Shown on phones and tablets opening the site in a browser tab (not once installed,
 * not inside an embed). Android gets a one-tap INSTALL button when the browser offers it;
 * iPhone/iPad get step-by-step Share > Add to Home Screen instructions.
 */

const HIDE_KEY = 'mb-cover-wars-install-hidden';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const SHARE_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style="vertical-align:-5px">
  <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`;
const ADD_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style="vertical-align:-5px">
  <rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`;
const DOTS_ICON = `<b style="font-size:20px;letter-spacing:0">&#8942;</b>`;

const CSS = `
#install { position: fixed; inset: 0; z-index: 20; display: flex; align-items: center; justify-content: center;
  background: rgba(11, 7, 16, 0.94); padding: 12px; box-sizing: border-box; overflow-y: auto;
  font-family: "Press Start 2P", monospace; color: #fff; -webkit-text-size-adjust: 100%; }
#install .card { width: 100%; max-width: 440px; background: #1a1226; border: 3px solid #ff4fa3;
  box-shadow: 0 0 0 3px #0b0710, 0 0 24px rgba(255, 79, 163, 0.35); padding: 18px 16px; box-sizing: border-box; margin: auto; }
#install img { display: block; width: 64px; height: 64px; margin: 0 auto 12px; image-rendering: pixelated; }
#install h2 { margin: 0 0 6px; font-size: 14px; line-height: 1.5; color: #ff4fa3; text-align: center; font-weight: normal; }
#install .sub { margin: 0 0 16px; font-size: 9px; line-height: 1.8; color: #c8c0d8; text-align: center; }
#install ol { list-style: none; margin: 0 0 16px; padding: 0; counter-reset: step; }
#install li { counter-increment: step; position: relative; padding: 8px 0 8px 34px; font-size: 10px; line-height: 1.9; }
#install li::before { content: counter(step); position: absolute; left: 0; top: 7px; width: 22px; height: 22px;
  display: grid; place-items: center; background: #4fe3ff; color: #0b0710; font-size: 10px; }
#install .hl { color: #ffd34f; }
#install .ic { color: #4fe3ff; }
#install button { display: block; width: 100%; font: inherit; font-size: 11px; padding: 12px 8px; margin-top: 8px;
  cursor: pointer; border: 2px solid #3a2f52; background: #241a36; color: #fff; }
#install button.go { background: #5a1838; border-color: #ff4fa3; font-size: 13px; }
#install button.quiet { background: none; border: none; color: #8a80a0; font-size: 8px; padding: 8px; }
#install .arrow { position: fixed; left: 50%; bottom: 6px; transform: translateX(-50%); color: #ffd34f; font-size: 22px;
  animation: mb-bob 0.8s ease-in-out infinite alternate; }
#install .arrow.top { bottom: auto; top: 6px; left: auto; right: 22px; transform: none; }
@keyframes mb-bob { to { margin-bottom: 8px; margin-top: 8px; } }
@media (max-height: 430px) {
  #install .card { padding: 12px 14px; max-width: 560px; }
  #install img { display: none; }
  #install .sub { margin-bottom: 8px; }
  #install li { padding: 4px 0 4px 34px; }
  #install li::before { top: 3px; }
}
`;

function platform() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const ipad = ios && !/iPhone|iPod/.test(ua);
  const samsung = /SamsungBrowser/.test(ua);
  const inAppBrowser = /FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok/.test(ua);
  return { ios, android, ipad, samsung, inAppBrowser, phone: ios || android || window.matchMedia('(pointer: coarse) and (hover: none)').matches };
}

function installed() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function hidden() {
  try { return localStorage.getItem(HIDE_KEY) === '1'; } catch { return false; }
}

export function setupInstallGuide() {
  // only for the real site in a browser tab: not embedded, not already installed
  if (window.top !== window.self || installed() || hidden()) return;
  const p = platform();

  let deferred: InstallPromptEvent | null = null;
  let render: (() => void) | null = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own button instead of the browser's mini bar
    deferred = e as InstallPromptEvent;
    render?.();
  });
  window.addEventListener('appinstalled', () => close());

  if (!p.phone) return; // desktop players just play

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'install';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Install Cover Wars');
  document.body.appendChild(root);

  function close(forever = false) {
    if (forever) { try { localStorage.setItem(HIDE_KEY, '1'); } catch { /* private mode */ } }
    root.remove();
  }

  render = () => {
    let steps: string;
    let arrow = '';
    let oneTap = '';
    if (p.inAppBrowser) {
      steps = `<li>Tap the <span class="ic">${DOTS_ICON}</span> or <span class="ic">...</span> menu in this app.</li>
        <li>Pick <span class="hl">Open in browser</span> (Safari or Chrome).</li>
        <li>This screen will show you the rest there.</li>`;
    } else if (p.ios) {
      steps = `<li>Tap the <span class="ic">${SHARE_ICON} Share</span> button ${p.ipad ? 'at the top of the screen' : 'at the bottom of Safari'}. Don't see it? Tap <span class="ic">&middot;&middot;&middot;</span> first.</li>
        <li>Scroll down and tap <span class="hl">${ADD_ICON} Add to Home Screen</span>.</li>
        <li>Tap <span class="hl">Add</span> in the top corner. Then open <span class="hl">Cover Wars</span> from your home screen.</li>`;
      arrow = p.ipad ? '<div class="arrow top">&#9650;</div>' : '<div class="arrow">&#9660;</div>';
    } else if (deferred) {
      oneTap = '<button class="go" data-act="install">INSTALL THE GAME</button>';
      steps = `<li>Tap <span class="hl">Install the game</span> below.</li>
        <li>Tap <span class="hl">Install</span> on the pop-up.</li>
        <li>Open <span class="hl">Cover Wars</span> from your home screen.</li>`;
    } else if (p.samsung) {
      steps = `<li>Tap the <span class="ic">&#9776;</span> menu at the bottom right.</li>
        <li>Tap <span class="hl">Add page to</span>, then <span class="hl">Home screen</span>.</li>
        <li>Tap <span class="hl">Add</span>. Then open <span class="hl">Cover Wars</span> from your home screen.</li>`;
    } else {
      steps = `<li>Tap the <span class="ic">${DOTS_ICON}</span> menu at the top right of your browser.</li>
        <li>Tap <span class="hl">Add to Home screen</span> or <span class="hl">Install app</span>.</li>
        <li>Tap <span class="hl">Install</span> or <span class="hl">Add</span>. Then open <span class="hl">Cover Wars</span> from your home screen.</li>`;
      arrow = '<div class="arrow top">&#9650;</div>';
    }
    root.innerHTML = `<div class="card">
        <img src="./icon-192.png" alt="" />
        <h2>GET COVER WARS ON YOUR PHONE</h2>
        <p class="sub">Add it to your home screen: it opens full screen like an app, and plays offline.</p>
        <ol>${steps}</ol>
        ${oneTap}
        <button data-act="play">PLAY IN THE BROWSER</button>
        <button class="quiet" data-act="never">DON'T SHOW THIS AGAIN</button>
      </div>${arrow}`;
  };
  render();

  root.addEventListener('click', async (e) => {
    const act = (e.target as HTMLElement).closest('button')?.dataset.act;
    if (act === 'play') close();
    else if (act === 'never') close(true);
    else if (act === 'install' && deferred) {
      const d = deferred;
      deferred = null;
      await d.prompt();
      const choice = await d.userChoice;
      if (choice.outcome === 'accepted') close(true);
      else render?.();
    }
  });
}
