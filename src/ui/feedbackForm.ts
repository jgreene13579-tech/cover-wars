import { getMode, loadSave } from '../save';

/**
 * In-game feedback form (a plain HTML overlay, so phones get a real keyboard).
 * Sends to a small Supabase function that only accepts feedback; nothing about
 * the player's save is changed, and only coarse context goes along with the message.
 */
const ENDPOINT = 'https://kvorhhclhlhbatxqobwu.supabase.co/functions/v1/cover-wars-feedback';
const MAX = 1000;

const CSS = `
#feedback { position: fixed; inset: 0; z-index: 30; display: flex; align-items: center; justify-content: center;
  background: rgba(11, 7, 16, 0.92); padding: 12px; box-sizing: border-box; overflow-y: auto;
  font-family: "Press Start 2P", monospace; color: #fff; }
#feedback .card { width: 100%; max-width: 520px; background: #1a1226; border: 3px solid #4fe3ff; margin: auto;
  box-shadow: 0 0 0 3px #0b0710, 0 0 24px rgba(79, 227, 255, 0.3); padding: 16px; box-sizing: border-box; }
#feedback h2 { margin: 0 0 8px; font-size: 14px; color: #4fe3ff; text-align: center; font-weight: normal; }
#feedback p { margin: 0 0 12px; font-size: 9px; line-height: 1.8; color: #c8c0d8; text-align: center; }
#feedback label { display: block; font-size: 9px; color: #ffd34f; margin: 10px 0 6px; }
#feedback textarea, #feedback input { width: 100%; box-sizing: border-box; background: #0b0710; color: #fff;
  border: 2px solid #3a2f52; padding: 10px; font: 12px/1.6 system-ui, sans-serif; }
#feedback textarea { height: 120px; resize: vertical; }
#feedback textarea:focus, #feedback input:focus { outline: none; border-color: #ff4fa3; }
#feedback .count { text-align: right; font-size: 8px; color: #8a80a0; margin-top: 4px; }
#feedback .row { display: flex; gap: 8px; margin-top: 14px; }
#feedback button { flex: 1; font: inherit; font-size: 11px; padding: 12px 8px; cursor: pointer;
  border: 2px solid #3a2f52; background: #241a36; color: #fff; }
#feedback button.go { background: #5a1838; border-color: #ff4fa3; }
#feedback button:disabled { opacity: 0.5; cursor: default; }
#feedback .status { min-height: 14px; margin-top: 10px; font-size: 9px; text-align: center; line-height: 1.6; }
#feedback .hp { position: absolute; left: -9999px; width: 1px; height: 1px; }
@media (max-height: 430px) { #feedback textarea { height: 70px; } #feedback p { display: none; } }
`;

const device = () => {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'tablet';
  if (/iPhone|iPod|Android.*Mobile/.test(ua)) return 'phone';
  if (/Android/.test(ua)) return 'tablet';
  return 'desktop';
};

/** Opens the form. `game` keyboard input is paused while typing so keys don't control the game. */
export function openFeedback(game: Phaser.Game) {
  if (document.getElementById('feedback')) return;
  if (!document.getElementById('feedback-css')) {
    const st = document.createElement('style');
    st.id = 'feedback-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const kb = game.input.keyboard;
  const kbWas = kb?.enabled ?? false;
  if (kb) kb.enabled = false;

  const root = document.createElement('div');
  root.id = 'feedback';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Send feedback');
  root.innerHTML = `<form class="card" novalidate>
      <h2>SEND THE BAND FEEDBACK</h2>
      <p>Bugs, ideas, too hard, too easy, favorite song? Tell us. It goes straight to the band.</p>
      <label for="fb-msg">YOUR FEEDBACK</label>
      <textarea id="fb-msg" maxlength="${MAX}" required placeholder="What should we change?"></textarea>
      <div class="count"><span id="fb-n">0</span>/${MAX}</div>
      <label for="fb-name">NAME (OPTIONAL)</label>
      <input id="fb-name" maxlength="40" autocomplete="nickname" placeholder="Leave blank to stay anonymous">
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="row"><button type="button" data-act="close">CLOSE</button><button type="submit" class="go">SEND</button></div>
      <div class="status" aria-live="polite"></div>
    </form>`;
  document.body.appendChild(root);

  const form = root.querySelector('form')!;
  const msg = root.querySelector<HTMLTextAreaElement>('#fb-msg')!;
  const name = root.querySelector<HTMLInputElement>('#fb-name')!;
  const hp = root.querySelector<HTMLInputElement>('.hp')!;
  const send = root.querySelector<HTMLButtonElement>('button.go')!;
  const status = root.querySelector<HTMLDivElement>('.status')!;
  const n = root.querySelector<HTMLSpanElement>('#fb-n')!;
  const say = (text: string, color: string) => { status.textContent = text; status.style.color = color; };

  const close = () => {
    root.remove();
    if (kb) kb.enabled = kbWas;
    document.removeEventListener('keydown', onKey, true);
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); e.stopPropagation(); };
  document.addEventListener('keydown', onKey, true); // typing never reaches the game (M = mute, etc.)

  msg.addEventListener('input', () => { n.textContent = String(msg.value.length); });
  root.querySelector('[data-act="close"]')!.addEventListener('click', close);
  root.addEventListener('click', (e) => { if (e.target === root) close(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = msg.value.trim();
    if (text.length < 2) { say('TYPE A MESSAGE FIRST.', '#ffd34f'); msg.focus(); return; }
    send.disabled = true;
    say('SENDING...', '#c8c0d8');
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: text, name: name.value.trim(), website: hp.value,
          mode: getMode(), showsCleared: loadSave().cleared, device: device(), version: location.hostname,
        }),
      });
      if (res.status === 429) { say('LOTS OF FEEDBACK RIGHT NOW. TRY AGAIN IN A FEW MINUTES.', '#ffd34f'); send.disabled = false; return; }
      if (!res.ok) throw new Error(String(res.status));
      say('SENT! THANKS FOR PLAYING.', '#6dff7a');
      msg.value = ''; n.textContent = '0';
      setTimeout(close, 1400);
    } catch {
      say("COULDN'T SEND. CHECK YOUR CONNECTION AND TRY AGAIN.", '#ff4f4f');
      send.disabled = false;
    }
  });
  setTimeout(() => msg.focus(), 50);
}
