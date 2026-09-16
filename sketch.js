/* global p5 */
// Versão de navegador do sketch Processing. Mesmos contornos, forças e tempos.
// p5.js fornece o relógio e o ruído; Canvas 2D compõe as texturas sem tint por pixel.
new p5((p) => {
  'use strict';
  const SIZE = 1080, TOP = 910, BOTTOM = 1050.526, SPLIT = (TOP + BOTTOM) / 2 + 12;
  const STEP = 1 / 60, MAX_PARTICLES = 8000, EMISSION = 1800;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const dissolveAt = (y) => smooth((SPLIT - y) / (SPLIT - TOP));
  const makeCanvas = (w = SIZE, h = SIZE) => Object.assign(document.createElement('canvas'), { width: w, height: h });
  const art = makeCanvas(), ctx = art.getContext('2d');
  const mask = makeCanvas(), texture = makeCanvas(64, 64);
  const target = { x: 540, y: 730 }, pointer = { x: 540, y: 730 };
  const ink = [], emitters = [], smoke = [];
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const density = 1.2, force = 0.3, textColor = '#000000', backgroundColor = '#ffffff';
  let ready = false, paused = motionPreference.matches, pointerInside = false;
  let time = 0, accumulator = 0, credit = 0, attraction = 0;
  let canvasElement;
  const $ = (id) => document.getElementById(id);

  p.setup = async () => {
    const canvas = p.createCanvas(window.innerWidth, window.innerHeight);
    canvas.parent('stage');
    canvasElement = canvas.elt;
    canvasElement.tabIndex = 0;
    canvasElement.setAttribute('role', 'img');
    canvasElement.setAttribute('aria-label', 'PRIORITY AMAZONIA formada por partículas. As partículas superiores liberam fumaça que acompanha o mouse.');
    p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
    p.frameRate(60);
    p.noLoop();
    p.background(backgroundColor);
    try {
      const svg = new Image();
      svg.src = 'lettering.svg';
      await svg.decode();
      mask.getContext('2d', { willReadFrequently: true }).drawImage(svg, 0, 0, SIZE, SIZE);
      seed(); buildLettering(); buildTexture(); warmup();
      attachInteraction();
      $('status').hidden = true;
      ready = true;
      syncPlayback();
    } catch (error) {
      $('status').textContent = 'Não foi possível carregar o cartaz. Recarregue a página.';
      console.error(error);
    }
  };

  function seed() { p.randomSeed(9521558); p.noiseSeed(9521558); }
  function buildLettering() {
    const pixels = mask.getContext('2d').getImageData(0, 0, SIZE, SIZE);
    for (let y = TOP; y < BOTTOM; y += 2) for (let x = 36; x < 1035; x += 2) {
      const sx = x + p.random(-0.7, 0.7), sy = y + p.random(-0.7, 0.7);
      const alpha = pixels.data[(Math.floor(sy) * SIZE + Math.floor(sx)) * 4 + 3];
      if (alpha > 110) {
        const point = { homeX: sx, homeY: sy, x: sx, y: sy, dissolve: dissolveAt(sy), diameter: p.random(3.6, 5.4) };
        ink.push(point);
        if (point.dissolve > 0) emitters.push(point);
      }
    }
    if (!ink.length || !emitters.length) throw new Error('Máscara vetorial vazia');
  }

  function buildTexture() {
    const tctx = texture.getContext('2d'), data = tctx.createImageData(64, 64);
    const rgb = hexToRgb(textColor);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const radius = Math.hypot((x - 31.5) / 31.5, (y - 31.5) / 31.5);
      const at = (y * 64 + x) * 4;
      data.data[at] = rgb.r; data.data[at + 1] = rgb.g; data.data[at + 2] = rgb.b;
      data.data[at + 3] = Math.floor(255 * Math.pow(Math.max(0, 1 - radius), 2.3) * (0.58 + 0.42 * p.noise(x * 0.16, y * 0.16)));
    }
    tctx.putImageData(data, 0, 0);
  }

  function hexToRgb(hex) {
    const value = Number.parseInt(hex.slice(1), 16);
    return { r: value >> 16, g: (value >> 8) & 255, b: value & 255 };
  }

  function warmup() { for (let i = 0; i < 150; i++) step(STEP); }
  function step(dt) {
    time += dt;
    attraction += ((pointerInside ? 1 : 0) - attraction) * (1 - Math.exp(-3 * dt));
    const follow = 1 - Math.exp(-7 * dt), settle = 1 - Math.exp(-5 * dt);
    target.x += (pointer.x - target.x) * follow;
    target.y += (pointer.y - target.y) * follow;
    for (const q of ink) {
      const spread = 1 + 14 * q.dissolve;
      let x = q.homeX + (p.noise(q.homeX * 0.013, q.homeY * 0.013, time * 0.3) - 0.5) * spread * 2;
      let y = q.homeY + (p.noise(q.homeX * 0.013 + 83, q.homeY * 0.013, time * 0.3) - 0.65) * spread * 2;
      const dx = target.x - q.homeX, dy = target.y - q.homeY, distance = Math.hypot(dx, dy);
      const mobility = 0.08 + 0.92 * q.dissolve;
      const pull = Math.min(distance * 0.18, 70) * Math.exp(-distance / 310) * attraction * force * mobility;
      x += dx / Math.max(1, distance) * pull;
      y += dy / Math.max(1, distance) * pull;
      q.x += (x - q.x) * settle;
      q.y += (y - q.y) * settle;
    }
    credit = Math.min(credit + EMISSION * density * dt, 60);
    while (credit >= 1) {
      credit--;
      if (smoke.length >= MAX_PARTICLES) continue;
      const source = emitters[Math.floor(p.random(emitters.length))];
      if (p.random(1) >= Math.pow(source.dissolve, 1.15)) continue;
      smoke.push({ x: source.x + p.randomGaussian() * 1.1, y: source.y + p.randomGaussian() * 1.1,
        vx: p.randomGaussian() * 5, vy: -p.random(16, 35), age: 0, lifetime: p.random(2.4, 4.2),
        size: p.random(9, 15), opacity: p.random(0.24, 0.42) * (0.45 + 0.55 * source.dissolve) });
    }
    let alive = 0;
    for (const q of smoke) {
      q.age += dt;
      const angle = p.noise(q.x * 0.006, q.y * 0.006, time * 0.14) * Math.PI * 4;
      let ax = Math.cos(angle) * 26, ay = Math.sin(angle) * 17 - 12;
      const dx = target.x - q.x, dy = target.y - q.y, distance = Math.hypot(dx, dy);
      const influence = attraction * force * Math.min(1, q.age * 2);
      if (distance > 0.01) {
        const desired = Math.min(175, distance * 0.95);
        ax += (dx / distance * desired - q.vx) * influence * 1.4;
        ay += (dy / distance * desired - q.vy) * influence * 1.4;
        const swirl = Math.exp(-distance / 150) * influence * 26;
        ax -= dy / distance * swirl;
        ay += dx / distance * swirl;
      }
      q.vx = (q.vx + ax * dt) * Math.exp(-0.32 * dt);
      q.vy = (q.vy + ay * dt) * Math.exp(-0.32 * dt);
      const speed = Math.hypot(q.vx, q.vy);
      if (speed > 225) { q.vx *= 225 / speed; q.vy *= 225 / speed; }
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.age < q.lifetime && q.x > -100 && q.x < SIZE + 100 && q.y > -100 && q.y < SIZE + 100) smoke[alive++] = q;
    }
    smoke.length = alive;
  }

  function render() {
    ctx.globalAlpha = 1;
    ctx.fillStyle = backgroundColor; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, SIZE, SPLIT); ctx.clip();
    for (const q of smoke) {
      const fade = clamp(q.age / 0.15, 0, 1) * Math.pow(Math.max(0, 1 - q.age / q.lifetime), 1.35);
      const protect = 1 - smooth((q.y - SPLIT + 8) / 17);
      const size = q.size + q.age * 17;
      ctx.globalAlpha = q.opacity * fade * protect;
      ctx.drawImage(texture, q.x - size / 2, q.y - size / 2, size, size);
    }
    ctx.restore(); ctx.globalAlpha = 1;
    for (const q of ink) {
      const core = 1 - smooth((q.dissolve - 0.18) / (0.88 - 0.18));
      const coreSize = 3.57 + (1.4 - 3.57) * q.dissolve;
      ctx.globalAlpha = core;
      ctx.fillStyle = textColor;
      ctx.beginPath();
      ctx.arc(q.x, q.y, coreSize / 2, 0, Math.PI * 2);
      ctx.fill();

      const size = 3.8 + (q.diameter + 6 - 3.8) * q.dissolve;
      ctx.globalAlpha = 0.70 * smooth((q.dissolve - 0.04) / (1 - 0.04));
      ctx.drawImage(texture, q.x - size / 2, q.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }

  p.draw = () => {
    if (!ready) return;
    if (!paused && !document.hidden) {
      accumulator += Math.min(p.deltaTime / 1000, 0.08);
      while (accumulator >= STEP) { step(STEP); accumulator -= STEP; }
    } else accumulator = 0;
    render();
    p.background(backgroundColor);
    // O cartaz ocupa toda a largura e fica ancorado na base. Em viewports
    // horizontais, o recorte remove somente a grande área branca superior.
    const side = p.width;
    p.drawingContext.drawImage(art, 0, p.height - side, side, side);
  };

  function updatePointer(event) {
    const rect = canvasElement.getBoundingClientRect(), side = rect.width;
    const x = (event.clientX - rect.left) * SIZE / side;
    const y = (event.clientY - rect.top - (rect.height - side)) * SIZE / side;
    pointerInside = x >= 0 && x <= SIZE && y >= 0 && y <= SIZE;
    if (pointerInside) Object.assign(pointer, { x, y });
  }
  function syncPlayback() {
    if (!ready) return;
    accumulator = 0;
    if (paused || document.hidden) { p.noLoop(); if (!document.hidden) p.redraw(); }
    else p.loop();
  }
  function attachInteraction() {
    canvasElement.addEventListener('pointermove', updatePointer);
    canvasElement.addEventListener('pointerdown', updatePointer);
    canvasElement.addEventListener('pointerleave', () => { pointerInside = false; });
    canvasElement.addEventListener('pointercancel', () => { pointerInside = false; });
    canvasElement.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') pointerInside = false; });
    document.addEventListener('visibilitychange', syncPlayback);
    motionPreference.addEventListener('change', (e) => { paused = e.matches; syncPlayback(); });
  }
  p.windowResized = () => {
    p.resizeCanvas(window.innerWidth, window.innerHeight);
    pointerInside = false;
    if (ready) p.redraw();
  };
});
