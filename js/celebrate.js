// Lightweight DOM confetti burst — no canvas, no dependencies.
// Respects prefers-reduced-motion.

const COLORS = ['#58CC02', '#1CB0F6', '#FFC800', '#FF4B4B', '#CE82FF', '#FF9600'];

export function confetti({ count = 80, duration = 2600 } = {}) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const layer = document.createElement('div');
  layer.className = 'confetti-layer';

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.4;
    const fall = 1.6 + Math.random() * 1.2;
    const drift = (Math.random() - 0.5) * 240;
    const rotate = (Math.random() - 0.5) * 720;
    const size = 6 + Math.random() * 8;

    piece.style.cssText = `
      left:${left}%;
      width:${size}px;
      height:${size * 0.6}px;
      background:${color};
      animation-delay:${delay}s;
      animation-duration:${fall}s;
      --drift:${drift}px;
      --rotate:${rotate}deg;`;
    layer.appendChild(piece);
  }

  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), duration);
}
