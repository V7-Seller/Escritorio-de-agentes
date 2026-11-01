/* Operação N7 — escritório isométrico estilo Habbo */
(() => {
'use strict';

const cv = document.getElementById('scene'), ctx = cv.getContext('2d');
const TW = 64, TH = 32;
const COL = { cy:'#00e5ff', vi:'#7c4dff', ma:'#ff2bd6', yel:'#ffe600', mlBlue:'#2d3277' };
let DPR = 1, VW = 0, VH = 0, zoom = 1, cam = { s:1, ox:0, oy:0 };
let hits = [], mouse = null, hoverTile = null, fade = 0;

// ---------- utilidades ----------
const P = (x, y, z = 0) => [(x - y) * TW / 2, (x + y) * TH / 2 - z];
const sh = (c, f) => {
  const n = parseInt(c.slice(1), 16);
  const k = v => Math.min(255, Math.round(v * f));
  return `rgb(${k(n >> 16 & 255)},${k(n >> 8 & 255)},${k(n & 255)})`;
};
const rnd = a => a[Math.floor(Math.random() * a.length)];
function path(pts) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); }
function poly(pts, fill, stroke, lw = 1) {
  path(pts);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function box(x, y, z, w, d, h, c, glow) {
  poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], sh(c, 1.18));
  poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], sh(c, .82));
  poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], sh(c, .6));
  if (glow) {
    ctx.save(); ctx.strokeStyle = glow; ctx.shadowColor = glow; ctx.shadowBlur = 8; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(...P(x, y + d, z + h)); ctx.lineTo(...P(x + w, y + d, z + h)); ctx.lineTo(...P(x + w, y, z + h));
    ctx.stroke(); ctx.restore();
  }
}
// desenha uma textura numa face voltada para +y (também serve para a parede direita, y=0)
function faceY(img, x, y, z, w, h) {
  const [ox, oy] = P(x, y, z + h);
  ctx.save(); ctx.transform(w * TW / 2 / img.width, w * TH / 2 / img.width, 0, h / img.height, ox, oy);
  ctx.drawImage(img, 0, 0); ctx.restore();
  return [P(x, y, z), P(x + w, y, z), P(x + w, y, z + h), P(x, y, z + h)];
}
// parede esquerda (x=0): leitura da esquerda para a direita vai em direção ao canto do fundo
function faceL(img, p, w, z, h) {
  const [ox, oy] = P(0, p + w, z + h);
  ctx.save(); ctx.transform(w * TW / 2 / img.width, -w * TH / 2 / img.width, 0, h / img.height, ox, oy);
  ctx.drawImage(img, 0, 0); ctx.restore();
  return [P(0, p, z), P(0, p + w, z), P(0, p + w, z + h), P(0, p, z + h)];
}
function inPoly(pt, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// ---------- texturas ----------
const TEX = {};
function mkTex(name, w, h, draw, anim) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  TEX[name] = { c, g: c.getContext('2d'), w, h, draw, anim };
  draw(TEX[name].g, w, h, 0);
}

function drawMark(g, x, y, size, glow) {
  g.save(); g.translate(x, y); g.scale(size / 100, size / 100);
  const gr = g.createLinearGradient(0, 0, 100, 100);
  gr.addColorStop(0, COL.cy); gr.addColorStop(.55, COL.vi); gr.addColorStop(1, COL.ma);
  if (glow) { g.shadowColor = COL.cy; g.shadowBlur = glow; }
  g.fillStyle = '#0a0f2c'; g.strokeStyle = gr; g.lineWidth = 4; g.lineJoin = 'round'; g.lineCap = 'round';
  g.fill(new Path2D('M50 5 L91 27.5 L91 72.5 L50 95 L9 72.5 L9 27.5Z')); g.stroke(new Path2D('M50 5 L91 27.5 L91 72.5 L50 95 L9 72.5 L9 27.5Z'));
  g.lineWidth = 8;
  g.stroke(new Path2D('M26 66 V34 L47 66 V34')); g.stroke(new Path2D('M56 34 H75 L63 68'));
  g.restore();
}

// réplica estilizada da home do mercadolivre.com.br (desenhada em 240x150 e escalada)
function drawML(g, w, h, t, v) {
  g.save(); g.scale(w / 240, h / 150);
  g.fillStyle = '#ebebeb'; g.fillRect(0, 0, 240, 150);
  g.textBaseline = 'middle';
  // barra do navegador
  g.fillStyle = '#1f2227'; g.fillRect(0, 0, 240, 14);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(7 + i * 7, 7, 2, 0, 7); g.fill(); });
  g.fillStyle = '#3a3f47'; rr(g, 34, 3, 170, 8, 4); g.fill();
  g.fillStyle = '#28c840'; g.fillRect(40, 5.5, 3, 3);
  g.fillStyle = '#d6dae0'; g.font = '5.5px Arial'; g.fillText('mercadolivre.com.br', 47, 7.3);
  // cabeçalho amarelo
  g.fillStyle = COL.yel; g.fillRect(0, 14, 240, 36);
  g.strokeStyle = COL.mlBlue; g.lineWidth = 1.5; g.beginPath(); g.ellipse(26, 32, 19, 10, 0, 0, 7); g.stroke();
  g.fillStyle = COL.mlBlue; g.font = 'italic bold 6.2px Arial'; g.textAlign = 'center';
  g.fillText('mercado', 26, 29); g.fillText('livre', 26, 36); g.textAlign = 'left';
  g.fillStyle = '#fff'; rr(g, 52, 24, 122, 14, 2); g.fill();
  g.fillStyle = '#999'; g.font = '5.3px Arial'; g.fillText('Buscar produtos, marcas e muito mais…', 57, 31.3);
  g.strokeStyle = '#777'; g.lineWidth = .8; g.beginPath(); g.arc(166, 30.5, 2.5, 0, 7); g.moveTo(168, 32.5); g.lineTo(170, 34.5); g.stroke();
  g.fillStyle = '#333'; g.font = '5px Arial'; g.fillText('Entre', 182, 31.3); g.fillText('Compras', 200, 31.3);
  g.fillText('🛒', 226, 31.3);
  g.fillStyle = '#333'; g.font = '4.5px Arial'; g.fillText('📍 Enviar para Daniel', 52, 45);
  // menu
  g.fillStyle = '#fff'; g.fillRect(0, 50, 240, 10);
  g.fillStyle = '#555'; g.font = '4.8px Arial';
  g.fillText('Categorias ▾    Ofertas    Cupons    Supermercado    Moda    Mercado Play    Vender    Ajuda', 6, 55.3);
  // banner rotativo
  const slides = [
    ['#2d3277', '#6a3fd1', 'OFERTAS DO DIA', 'até 40% OFF'],
    ['#ff3b8d', '#ff9a3c', 'FRETE GRÁTIS', 'em milhões de produtos'],
    ['#00a650', '#00c2ff', 'ENVIO FULL', 'chega amanhã ⚡'],
  ];
  const s = slides[(Math.floor(t / 3.2) + v) % 3];
  const gr = g.createLinearGradient(0, 60, 240, 100); gr.addColorStop(0, s[0]); gr.addColorStop(1, s[1]);
  g.fillStyle = gr; g.fillRect(0, 60, 240, 40);
  g.fillStyle = '#fff'; g.font = 'bold 12px Arial'; g.fillText(s[2], 14, 76);
  g.font = '6px Arial'; g.fillText(s[3], 14, 89);
  g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(196, 80, 15, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 9px Arial'; g.textAlign = 'center'; g.fillText('%', 196, 80.5); g.textAlign = 'left';
  // cards de produtos rolando
  g.save(); g.beginPath(); g.rect(0, 102, 240, 48); g.clip();
  const sp = 14, base = t * sp + v * 40, off = base % 60, idx0 = Math.floor(base / 60);
  for (let i = -1; i < 5; i++) {
    const x = i * 60 - off + 4, id = idx0 + i;
    g.fillStyle = '#fff'; rr(g, x, 104, 54, 44, 3); g.fill();
    g.fillStyle = `hsl(${(id * 47) % 360},70%,60%)`; rr(g, x + 14, 107, 26, 18, 3); g.fill();
    g.fillStyle = '#333'; g.font = '4.4px Arial'; g.fillText('Produto ' + ((id % 90) + 10), x + 4, 130);
    g.font = 'bold 6px Arial'; g.fillText('R$ ' + (19 + (id * 37) % 280) + ',90', x + 4, 137);
    g.fillStyle = '#00a650'; g.font = '4.2px Arial'; g.fillText('Frete grátis', x + 4, 143.5);
  }
  g.restore(); g.restore();
}
for (let v = 0; v < 3; v++) mkTex('ml' + v, 240, 150, (g, w, h, t) => drawML(g, w, h, t, v), true);

mkTex('window', 360, 220, (g, w, h, t) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b0730'); gr.addColorStop(1, '#3a1460');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,43,214,.5)'; g.beginPath(); g.arc(290, 50, 22, 0, 7); g.fill();
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect((i * 73) % w, (i * 37) % 90, 1.5, 1.5); }
  for (let i = 0; i < 14; i++) {
    const bw = 18 + (i * 13) % 22, bh = 60 + (i * 53) % 110, bx = i * 27 - 8;
    g.fillStyle = i % 2 ? '#120c33' : '#1a1145'; g.fillRect(bx, h - bh, bw, bh);
    for (let yy = h - bh + 6; yy < h - 4; yy += 8) for (let xx = bx + 3; xx < bx + bw - 3; xx += 6) {
      if (((xx * 7 + yy * 3 + Math.floor(t * 2) * (i % 3)) % 11) < 4) { g.fillStyle = (xx + yy) % 3 ? '#00e5ff' : '#ffe600'; g.globalAlpha = .7; g.fillRect(xx, yy, 2.5, 3); g.globalAlpha = 1; }
    }
  }
  // drones/carros voadores
  for (let k = 0; k < 3; k++) {
    const x = ((t * (30 + k * 18) + k * 140) % (w + 40)) - 20;
    g.fillStyle = k === 1 ? '#ff2bd6' : '#00e5ff'; g.shadowColor = g.fillStyle; g.shadowBlur = 6;
    g.fillRect(x, 70 + k * 22, 10, 2); g.shadowBlur = 0;
  }
  g.strokeStyle = '#00e5ff'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  g.fillStyle = 'rgba(0,229,255,.6)'; g.fillRect(w / 2 - 2, 0, 4, h); g.fillRect(0, h * .55, w, 3);
}, true);

mkTex('logo', 260, 300, (g, w, h, t) => {
  g.fillStyle = '#0a0f2c'; rr(g, 4, 4, w - 8, h - 8, 14); g.fill();
  g.strokeStyle = 'rgba(124,77,255,.8)'; g.lineWidth = 3; g.stroke();
  drawMark(g, 50, 26, 160, 18 + Math.sin(t * 2) * 6);
  const tg = g.createLinearGradient(30, 0, 230, 0); tg.addColorStop(0, COL.cy); tg.addColorStop(1, COL.ma);
  g.fillStyle = tg; g.font = '800 40px Orbitron, Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('N7 ECOM', w / 2, 226);
  g.fillStyle = '#8fa3d9'; g.font = '600 14px Orbitron, Arial, sans-serif'; g.fillText('OPERAÇÃO N7', w / 2, 262);
}, true);

const MP = [['Mercado Livre', '#ffe600', '#2d3277'], ['Shopee', '#ee4d2d', '#fff'], ['Magalu', '#0086ff', '#fff'], ['Amazon', '#232f3e', '#ff9900']];
function barsChart(g, w, h, t, title, accent) {
  g.fillStyle = '#05091c'; g.fillRect(0, 0, w, h);
  g.strokeStyle = accent; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  g.fillStyle = accent; g.font = '700 17px Orbitron, Arial, sans-serif'; g.textBaseline = 'middle'; g.fillText(title, 18, 26);
  g.fillStyle = '#4dff9e'; g.beginPath(); g.arc(w - 22, 26, 5 + Math.sin(t * 4), 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1;
  for (let y = 60; y < h - 30; y += 24) { g.beginPath(); g.moveTo(16, y); g.lineTo(w - 16, y); g.stroke(); }
  const bw = (w - 60) / 4;
  MP.forEach(([n, c], i) => {
    const v = .45 + .4 * Math.abs(Math.sin(t * .6 + i * 1.3));
    const bh = (h - 100) * v, x = 30 + i * bw;
    g.fillStyle = c === '#232f3e' ? '#ff9900' : c; g.shadowColor = g.fillStyle; g.shadowBlur = 12;
    g.fillRect(x, h - 34 - bh, bw - 22, bh); g.shadowBlur = 0;
    g.fillStyle = '#cfd8ff'; g.font = '12px Arial'; g.fillText(n, x, h - 18);
  });
}
mkTex('tvchart', 380, 220, (g, w, h, t) => barsChart(g, w, h, t, 'PAINEL DE VENDAS', COL.cy), true);
mkTex('tvmeet', 600, 220, (g, w, h, t) => {
  barsChart(g, w * .55 | 0, h, t, 'METAS · MARKETPLACES', COL.vi);
  const x0 = w * .55;
  g.fillStyle = '#05091c'; g.fillRect(x0, 0, w - x0, h);
  g.strokeStyle = COL.vi; g.lineWidth = 6; g.strokeRect(x0, 3, w - x0 - 3, h - 6);
  g.strokeStyle = COL.cy; g.lineWidth = 3; g.shadowColor = COL.cy; g.shadowBlur = 10; g.beginPath();
  for (let i = 0; i <= 20; i++) { const x = x0 + 20 + i * (w - x0 - 40) / 20, y = h - 40 - i * 6 - Math.sin(i * .9 + t) * 14; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke(); g.shadowBlur = 0;
  g.fillStyle = '#cfd8ff'; g.font = '700 15px Orbitron, Arial'; g.fillText('CRESCIMENTO', x0 + 20, 28);
}, true);

function mpPanel(name, bg, fg, sub) {
  return (g, w, h) => {
    g.fillStyle = bg; rr(g, 3, 3, w - 6, h - 6, 12); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 3; g.stroke();
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 34px Arial'; g.fillText(name, w / 2, h / 2 - 8);
    g.font = '16px Arial'; g.globalAlpha = .85; g.fillText(sub, w / 2, h / 2 + 26); g.globalAlpha = 1;
    if (name === 'Amazon') { g.strokeStyle = '#ff9900'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2 - 50, h / 2 + 8); g.quadraticCurveTo(w / 2, h / 2 + 22, w / 2 + 50, h / 2 + 6); g.stroke(); }
  };
}
mkTex('mp0', 300, 160, mpPanel('Mercado Livre', '#ffe600', '#2d3277', 'Agente ML'));
mkTex('mp1', 300, 160, mpPanel('Shopee', '#ee4d2d', '#fff', 'Agente Shopee'));
mkTex('mp2', 300, 160, mpPanel('Magalu', '#0086ff', '#fff', 'Agente Magalu'));
mkTex('mp3', 300, 160, mpPanel('Amazon', '#232f3e', '#fff', 'Agente Amazon'));

mkTex('board', 320, 200, (g, w, h) => {
  g.fillStyle = '#f4f7ff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#9aa6c9'; g.lineWidth = 8; g.strokeRect(0, 0, w, h);
  g.fillStyle = '#2d3277'; g.font = 'bold 22px Arial'; g.fillText('METAS DA SEMANA', 20, 38);
  g.font = '17px Arial'; g.fillStyle = '#333';
  ['✔ Reputação verde em todos', '✔ Ads ≤ 3% do faturamento', '→ Envio Full: repor estoque', '→ Novos anúncios Shopee'].forEach((s, i) => g.fillText(s, 22, 74 + i * 30));
  g.strokeStyle = '#ff2bd6'; g.lineWidth = 3; g.beginPath(); g.arc(270, 150, 26, 0, 7); g.stroke();
}, false);
mkTex('okr', 260, 180, (g, w, h, t) => {
  g.fillStyle = '#0a0f2c'; rr(g, 3, 3, w - 6, h - 6, 12); g.fill(); g.strokeStyle = COL.cy; g.lineWidth = 3; g.stroke();
  const d = new Date();
  g.fillStyle = COL.cy; g.font = '800 46px Orbitron, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = COL.cy; g.shadowBlur = 12;
  g.fillText(d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), w / 2, 70); g.shadowBlur = 0;
  g.fillStyle = '#8fa3d9'; g.font = '14px Arial'; g.fillText('Pedidos do dia → expedição até 14h', w / 2, 130);
}, true);
mkTex('gamezone', 360, 110, (g, w, h, t) => {
  g.clearRect(0, 0, w, h);
  const on = Math.sin(t * 7) > -.85;
  g.font = '800 54px Orbitron, Arial Black'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = COL.ma; g.shadowBlur = on ? 22 : 4; g.fillStyle = on ? '#ff6be6' : '#5a1f55';
  g.fillText('GAME ZONE', w / 2, h / 2);
}, true);
mkTex('tvgame', 380, 220, (g, w, h, t) => {
  g.fillStyle = '#04030f'; g.fillRect(0, 0, w, h); g.strokeStyle = COL.ma; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  g.strokeStyle = 'rgba(255,43,214,.4)'; g.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) { const y = 120 + i * i * 1.4 + (t * 20 % 10); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(w / 2, 118); g.lineTo(w / 2 + i * 60, h); g.stroke(); }
  g.fillStyle = '#ffe600'; g.shadowColor = '#ffe600'; g.shadowBlur = 16; g.beginPath(); g.arc(w / 2, 90, 34, Math.PI, 0); g.fill(); g.shadowBlur = 0;
  g.fillStyle = COL.cy; g.fillRect(w / 2 - 14 + Math.sin(t * 2) * 90, 150, 28, 10);
}, true);
mkTex('arc', 120, 100, (g, w, h, t) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i++) { g.fillStyle = `hsl(${(i * 45 + t * 90) % 360},90%,60%)`; g.fillRect(10 + i * 13, 18 + ((i * 17 + t * 40) % 60), 9, 9); }
  g.fillStyle = '#ffe600'; g.beginPath(); g.arc(60 + Math.sin(t * 3) * 40, 85, 7, .3, 5.9); g.lineTo(60 + Math.sin(t * 3) * 40, 85); g.fill();
}, true);
function doorTex(label, accent) {
  return (g, w, h, t) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#060a1d'; g.fillRect(8, 30, w - 16, h - 30);
    const open = 6 + Math.sin(t * 1.5) * 2;
    const gr = g.createLinearGradient(0, 30, 0, h); gr.addColorStop(0, '#1c2a5e'); gr.addColorStop(1, '#0d1438');
    g.fillStyle = gr; g.fillRect(12, 34, w / 2 - 12 - open / 2, h - 34); g.fillRect(w / 2 + open / 2, 34, w / 2 - 12 - open / 2, h - 34);
    g.fillStyle = accent; g.shadowColor = accent; g.shadowBlur = 14; g.fillRect(w / 2 - 1, 34, 2, h - 34);
    g.strokeStyle = accent; g.lineWidth = 5; g.strokeRect(8, 30, w - 16, h - 30);
    g.fillStyle = '#0a0f2c'; rr(g, 0, 0, w, 26, 6); g.fill(); g.shadowBlur = 0;
    g.fillStyle = accent; g.font = 'bold 13px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label, w / 2, 14);
  };
}

// ---------- salas ----------
const ROOMS = {
  chefe: {
    name: 'Sala do Chefe', sub: 'Comando da Operação N7 · Daniel', W: 9, H: 8, WH: 116,
    f1: '#121b38', f2: '#0f1731', wR: '#18214a', wL: '#121a3b', accent: COL.cy,
    rugs: [{ x: 2, y: 2, w: 5, d: 5, c: '#1a2560', e: COL.vi }],
    decor: [
      { w: 'R', p: .5, s: 3.7, z: 30, h: 70, t: 'window' },
      { w: 'R', p: 4.5, s: 2, z: 18, h: 86, t: 'logo' },
      { w: 'R', p: 7, s: 1.1, z: 0, h: 84, door: 'reuniao' },
      { w: 'L', p: 1, s: 3.3, z: 32, h: 60, t: 'tvchart' },
      { w: 'L', p: 5.6, s: 1.1, z: 0, h: 84, door: 'func' },
    ],
    furn: [
      ...[0, 1, 2].map(i => ({ t: 'bossdesk', x: 3 + i, y: 2, i })),
      { t: 'chair', x: 4, y: 1, dir: 'S', c: '#c8a400' },
      { t: 'table', x: 1, y: 0, h: 22, c: '#2a2f55' }, { t: 'table', x: 2, y: 0, h: 22, c: '#2a2f55' },
      { t: 'trophy', x: 1, y: 0 },
      ...[2, 3, 4].map((x, i) => ({ t: 'sofa', x, y: 5, c: '#3b2a7a', i })),
      { t: 'table', x: 3, y: 6, h: 14, c: '#1d3a6a', glass: true },
      { t: 'plant', x: 8, y: 3 }, { t: 'plant', x: 0, y: 7 }, { t: 'server', x: 8, y: 0 },
    ],
    npcs: [{ name: 'Atlas', role: 'Assistente IA', shirt: '#2a2f55', hair: '#cfd8ff', skin: '#9ad7ff', bot: true, wander: true, tag: COL.cy }],
  },
  func: {
    name: 'Sala dos Funcionários', sub: 'Agentes de marketplace em operação', W: 12, H: 9, WH: 116,
    f1: '#10213a', f2: '#0d1b31', wR: '#142a4a', wL: '#10223e', accent: COL.cy,
    rugs: [{ x: 1, y: 1, w: 9, d: 7, c: '#11284a', e: 'rgba(0,229,255,.5)' }],
    decor: [
      ...[0, 1, 2, 3].map(i => ({ w: 'R', p: .4 + i * 2.4, s: 2.2, z: 40, h: 56, t: 'mp' + i })),
      { w: 'R', p: 10.3, s: 1.1, z: 0, h: 84, door: 'jogos' },
      { w: 'L', p: 1.3, s: 1.1, z: 0, h: 84, door: 'chefe' },
      { w: 'L', p: 3, s: 2.2, z: 34, h: 50, t: 'okr' },
      { w: 'L', p: 6, s: 1.1, z: 0, h: 84, door: 'reuniao' },
    ],
    furn: [
      ...[[2, 3], [5, 3], [8, 3], [2, 7], [5, 7], [8, 7]].flatMap(([x, y], k) => [
        { t: 'desk', x, y, v: k % 3 }, { t: 'chair', x, y: y - 1, dir: 'S', c: k < 3 ? '#7c4dff' : '#00a3c4' }]),
      { t: 'boxes', x: 10, y: 7, n: 3 }, { t: 'boxes', x: 11, y: 7, n: 2 }, { t: 'boxes', x: 11, y: 6, n: 1 },
      { t: 'coffee', x: 9, y: 0 }, { t: 'cooler', x: 11, y: 2 },
      { t: 'plant', x: 11, y: 0 }, { t: 'plant', x: 0, y: 8 },
    ],
    npcs: [
      { name: 'Agente ML', role: 'Mercado Livre', seat: [2, 2, 'S'], shirt: '#ffe600', tag: '#ffe600' },
      { name: 'Agente Shopee', role: 'Shopee', seat: [5, 2, 'S'], shirt: '#ee4d2d', tag: '#ee4d2d' },
      { name: 'Agente Magalu', role: 'Magalu', seat: [8, 2, 'S'], shirt: '#0086ff', tag: '#3aa0ff' },
      { name: 'Agente Amazon', role: 'Amazon', seat: [2, 6, 'S'], shirt: '#232f3e', tag: '#ff9900' },
      { name: 'Agente Ads', role: 'Publicidade', seat: [5, 6, 'S'], shirt: '#7c4dff', tag: '#a98bff' },
      { name: 'Agente Estoque', role: 'Estoque / Full', seat: [8, 6, 'S'], shirt: '#00a650', tag: '#4dff9e' },
      { name: 'Agente SAC', role: 'Atendimento', wander: true, shirt: '#ff2bd6', tag: '#ff6be6' },
    ],
  },
  reuniao: {
    name: 'Sala de Reunião', sub: 'Alinhamento de metas e estratégia', W: 10, H: 8, WH: 116,
    f1: '#16173a', f2: '#121332', wR: '#1d1c4f', wL: '#171741', accent: COL.vi,
    rugs: [{ x: 1.5, y: 1.5, w: 7, d: 5, c: '#211f5c', e: COL.vi }],
    decor: [
      { w: 'R', p: 1.8, s: 5.2, z: 30, h: 66, t: 'tvmeet' },
      { w: 'R', p: 8.2, s: 1.1, z: 0, h: 84, door: 'chefe' },
      { w: 'L', p: 1.2, s: 3.2, z: 30, h: 58, t: 'board' },
      { w: 'L', p: 5.6, s: 1.1, z: 0, h: 84, door: 'func' },
    ],
    furn: [
      ...[3, 4, 5, 6].flatMap(x => [3, 4].map(y => ({ t: 'table', x, y, h: 22, c: '#1d2b66', glass: true }))),
      ...[3, 4, 5, 6].map(x => ({ t: 'chair', x, y: 2, dir: 'S', c: '#7c4dff' })),
      ...[3, 4, 5, 6].map(x => ({ t: 'chair', x, y: 5, dir: 'N', c: '#7c4dff' })),
      { t: 'chair', x: 7, y: 3, dir: 'W', c: '#ff2bd6' }, { t: 'chair', x: 2, y: 4, dir: 'E', c: '#ff2bd6' },
      { t: 'plant', x: 9, y: 1 }, { t: 'plant', x: 0, y: 7 }, { t: 'coffee', x: 0, y: 0 },
    ],
    npcs: [
      { name: 'Agente Financeiro', role: 'Financeiro', seat: [3, 2, 'S'], shirt: '#00a650', tag: '#4dff9e' },
      { name: 'Agente Precificação', role: 'Preços', seat: [5, 2, 'S'], shirt: '#ffb300', tag: '#ffd24d' },
      { name: 'Agente Logística', role: 'Expedição', seat: [4, 5, 'N'], shirt: '#0086ff', tag: '#3aa0ff' },
      { name: 'Agente Dados', role: 'BI / Relatórios', seat: [6, 5, 'N'], shirt: '#7c4dff', tag: '#a98bff' },
      { name: 'Agente Compras', role: 'Fornecedores', seat: [7, 3, 'W'], shirt: '#ee4d2d', tag: '#ff8a6b' },
    ],
  },
  jogos: {
    name: 'Sala de Jogos', sub: 'Pausa, descompressão e ideias', W: 11, H: 9, WH: 116,
    f1: '#1d1033', f2: '#170c2b', wR: '#25103f', wL: '#1d0c34', accent: COL.ma,
    rugs: [{ x: 3, y: 3, w: 5, d: 4, c: '#2a0f45', e: COL.ma }],
    decor: [
      { w: 'R', p: .6, s: 3.8, z: 50, h: 40, t: 'gamezone' },
      { w: 'R', p: 9.3, s: 1.1, z: 0, h: 84, door: 'reuniao' },
      { w: 'L', p: 1, s: 3.2, z: 30, h: 60, t: 'tvgame' },
      { w: 'L', p: 6, s: 1.1, z: 0, h: 84, door: 'func' },
    ],
    furn: [
      { t: 'arcade', x: 5, y: 0, c: '#7c4dff' }, { t: 'arcade', x: 6, y: 0, c: '#ff2bd6' }, { t: 'arcade', x: 7, y: 0, c: '#00b8d4' },
      ...[4, 5, 6].flatMap(x => [4, 5].map(y => ({ t: 'pool', x, y, ball: (x * 3 + y) % 4 }))),
      { t: 'bean', x: 1, y: 6, c: '#ff2bd6' }, { t: 'bean', x: 2, y: 7, c: '#00e5ff' }, { t: 'bean', x: 1, y: 8, c: '#ffe600' },
      ...[8, 9, 10].map((x, i) => ({ t: 'sofa', x, y: 6, c: '#5a1f7a', i })),
      { t: 'table', x: 9, y: 7, h: 14, c: '#3a1460', glass: true },
      { t: 'plant', x: 10, y: 1 }, { t: 'plant', x: 0, y: 2 },
    ],
    npcs: [
      { name: 'Agente Criativos', role: 'Design / Fotos', still: [5, 1, 'N'], shirt: '#ff2bd6', tag: '#ff6be6' },
      { name: 'Agente Conteúdo', role: 'Descrições', still: [7, 1, 'N'], shirt: '#00b8d4', tag: '#4de8ff' },
      { name: 'Agente Promo', role: 'Promoções', wander: true, shirt: '#ffb300', tag: '#ffd24d' },
      { name: 'Agente Reputação', role: 'Avaliações', wander: true, shirt: '#00a650', tag: '#4dff9e' },
    ],
  },
};
const ROOM_LABEL = { chefe: 'Sala do Chefe', func: 'Funcionários', reuniao: 'Reunião', jogos: 'Jogos' };
const DOOR_COL = { chefe: '#ffd24d', func: COL.cy, reuniao: '#a98bff', jogos: '#ff6be6' };
for (const [id, R] of Object.entries(ROOMS)) {
  R.id = id;
  R.decor.forEach(d => {
    if (!d.door) return;
    d.t = 'door_' + id + '_' + d.door;
    mkTex(d.t, 110, 190, doorTex('→ ' + ROOM_LABEL[d.door], DOOR_COL[d.door]), true);
    d.tile = d.w === 'R' ? [Math.floor(d.p + .4), 0] : [0, Math.floor(d.p + .4)];
  });
  R.blocked = new Set();
  R.furn.forEach(f => { if (!['chair', 'trophy', 'bean'].includes(f.t)) R.blocked.add(f.y * R.W + f.x); });
}

// ---------- móveis ----------
const D = {
  desk(f) {
    box(f.x + .05, f.y + .1, 0, .9, .8, 26, f.c || '#26304f', COL.cy);
    box(f.x + .42, f.y + .42, 26, .16, .1, 4, '#0a0e1c');
    const mx = f.x + .08, my = f.y + .36;
    box(mx, my, 30, .84, .08, 24, '#0a0e1c');
    const scr = [P(mx + .04, my + .081, 32), P(mx + .8, my + .081, 32), P(mx + .8, my + .081, 52), P(mx + .04, my + .081, 52)];
    ctx.save(); ctx.shadowColor = 'rgba(255,230,0,.8)'; ctx.shadowBlur = 14; poly(scr, COL.yel); ctx.restore();
    faceY(TEX['ml' + (f.v || 0)].c, mx + .04, my + .081, 32, .76, 20);
    hits.push({ poly: scr, fn: openML });
    box(f.x + .72, f.y + .62, 26, .1, .1, 6, '#ffe600');
    box(f.x + .2, f.y + .66, 26, .3, .12, 1.5, '#cfd8ff');
  },
  bossdesk(f) {
    box(f.x, f.y + .05, 0, 1, .95, 28, '#1c2447', f.i === 1 ? '#ffd24d' : COL.cy);
    if (f.i !== 2) return;
    const x0 = f.x - 2;
    [[x0 + .3, 0], [x0 + 1.25, 1], [x0 + 2.2, 2]].forEach(([mx, v]) => {
      const my = f.y + .35;
      box(mx + .32, my + .05, 28, .16, .1, 4, '#0a0e1c');
      box(mx, my, 32, .8, .08, 24, '#0a0e1c', '#ffd24d');
      const scr = [P(mx + .04, my + .081, 34), P(mx + .76, my + .081, 34), P(mx + .76, my + .081, 54), P(mx + .04, my + .081, 54)];
      ctx.save(); ctx.shadowColor = 'rgba(255,230,0,.8)'; ctx.shadowBlur = 16; poly(scr, COL.yel); ctx.restore();
      faceY(TEX['ml' + v].c, mx + .04, my + .081, 34, .72, 20);
      hits.push({ poly: scr, fn: openML });
    });
    box(x0 + 1.2, f.y + .75, 28, .6, .12, 2, '#cfd8ff');
  },
  chair(f) {
    const c = f.c || COL.vi;
    box(f.x + .44, f.y + .44, 0, .12, .12, 9, '#0b0f1e');
    box(f.x + .18, f.y + .18, 9, .64, .64, 5, c);
    const b = { S: [.18, .1, .64, .1], N: [.18, .8, .64, .1], E: [.1, .18, .1, .64], W: [.8, .18, .1, .64] }[f.dir || 'S'];
    box(f.x + b[0], f.y + b[1], 14, b[2], b[3], 20, c);
  },
  table(f) {
    const h = f.h || 22;
    if (f.glass) { box(f.x + .4, f.y + .4, 0, .2, .2, h - 3, '#0b0f1e'); box(f.x, f.y, h - 3, 1, 1, 3, f.c, COL.cy); }
    else box(f.x + .04, f.y + .1, 0, .92, .8, h, f.c || '#2a2f55', 'rgba(0,229,255,.6)');
  },
  sofa(f) {
    box(f.x, f.y + .1, 0, 1, .85, 11, f.c);
    box(f.x, f.y + .05, 11, 1, .25, 16, sh(f.c, 1.1).replace(/rgb\((\d+),(\d+),(\d+)\)/, (m, r, g, b) => '#' + [r, g, b].map(v => (+v).toString(16).padStart(2, '0')).join('')));
    if (f.i === 0) box(f.x, f.y + .1, 11, .14, .85, 8, f.c);
    if (f.i === 2) box(f.x + .86, f.y + .1, 11, .14, .85, 8, f.c);
  },
  plant(f) {
    box(f.x + .3, f.y + .3, 0, .4, .4, 14, '#2f2358', '#ff2bd6');
    const [sx, sy] = P(f.x + .5, f.y + .5, 30);
    [[-8, 4, 10, '#1aa36b'], [8, 2, 10, '#1fc77f'], [0, -6, 11, '#22e08f'], [-3, 2, 9, '#14895a']].forEach(([dx, dy, r, c]) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(sx + dx, sy + dy, r, 0, 7); ctx.fill();
    });
  },
  trophy(f) {
    const [sx, sy] = P(f.x + .5, f.y + .5, 22);
    ctx.save(); ctx.fillStyle = '#ffd24d'; ctx.shadowColor = '#ffd24d'; ctx.shadowBlur = 10;
    ctx.fillRect(sx - 2, sy - 10, 4, 10); ctx.fillRect(sx - 6, sy - 2, 12, 3);
    ctx.beginPath(); ctx.moveTo(sx - 9, sy - 24); ctx.lineTo(sx + 9, sy - 24); ctx.lineTo(sx + 4, sy - 10); ctx.lineTo(sx - 4, sy - 10); ctx.fill();
    ctx.restore();
  },
  server(f) {
    box(f.x + .1, f.y + .1, 0, .8, .65, 64, '#0b1024');
    for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) {
      const on = Math.sin(T * 5 + r * 1.7 + c * 2.3) > 0;
      const z = 8 + r * 8, x = f.x + .18 + c * .17, y = f.y + .751;
      poly([P(x, y, z), P(x + .08, y, z), P(x + .08, y, z + 2.5), P(x, y, z + 2.5)], on ? (c % 2 ? '#00e5ff' : '#4dff9e') : '#123');
    }
  },
  coffee(f) {
    box(f.x + .15, f.y + .15, 0, .7, .6, 26, '#2a2f55');
    box(f.x + .2, f.y + .2, 26, .6, .5, 16, '#141a33', COL.cy);
    box(f.x + .4, f.y + .62, 10, .18, .14, 6, '#fff');
  },
  cooler(f) {
    box(f.x + .25, f.y + .25, 0, .5, .5, 30, '#d8e2ff');
    const [sx, sy] = P(f.x + .5, f.y + .5, 42);
    ctx.fillStyle = 'rgba(80,190,255,.85)'; rr(ctx, sx - 8, sy - 10, 16, 20, 6); ctx.fill();
  },
  boxes(f) {
    for (let k = 0; k < f.n; k++) {
      box(f.x + .12, f.y + .12, k * 18, .76, .76, 18, '#c69a5d');
      const z = k * 18 + 18; poly([P(f.x + .45, f.y + .12, z), P(f.x + .55, f.y + .12, z), P(f.x + .55, f.y + .88, z), P(f.x + .45, f.y + .88, z)], '#e8d3a8');
    }
  },
  arcade(f) {
    box(f.x + .12, f.y + .1, 0, .76, .7, 66, f.c, f.c);
    faceY(TEX.arc.c, f.x + .2, f.y + .801, 34, .6, 22);
    box(f.x + .12, f.y + .8, 22, .76, .12, 6, '#111');
    const [sx, sy] = P(f.x + .5, f.y + .86, 29);
    ['#ff2bd6', '#00e5ff', '#ffe600'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(sx - 6 + i * 6, sy + i * 1.5 - 1, 1.8, 0, 7); ctx.fill(); });
  },
  pool(f) {
    box(f.x, f.y, 0, 1, 1, 14, '#4a2c15');
    box(f.x, f.y, 14, 1, 1, 3, '#0f8a52', COL.ma);
    if (f.ball) {
      const [sx, sy] = P(f.x + .3 + f.ball * .12, f.y + .5, 19);
      ctx.fillStyle = ['#fff', '#ffe600', '#ee4d2d', '#0086ff'][f.ball]; ctx.beginPath(); ctx.arc(sx, sy, 2.6, 0, 7); ctx.fill();
    }
  },
  bean(f) {
    const [sx, sy] = P(f.x + .5, f.y + .5, 0);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(sx, sy, 20, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = f.c; ctx.beginPath(); ctx.ellipse(sx, sy - 8, 18, 11, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(sx - 5, sy - 12, 7, 4, -.3, 0, 7); ctx.fill();
  },
};

// ---------- atores ----------
const SKINS = ['#f1c8a0', '#d9a273', '#a8714b', '#7a4a2d', '#ffd9b8'];
const HAIRS = ['#1b1b1b', '#4a2c15', '#c48a3a', '#7c4dff', '#ff2bd6', '#e8e8e8', '#00b8d4'];
const PANTS = ['#1c2447', '#2a2f55', '#111827', '#30364f'];
const PHRASES = [
  'Pedido novo no Mercado Livre! 🛒', 'Shopee bombando hoje 🔥', 'Magalu: anúncio aprovado ✅', 'Amazon: Buy Box conquistada 🏆',
  'Reputação verde 🟢', 'Etiquetas impressas 📦', 'Ads dentro da meta de 3% 📉', 'Estoque Full conferido ✔', 'Bora bater a meta! 🚀',
  'Pergunta respondida em 2 min ⚡', 'Preço ajustado na concorrência', 'Coleta às 14h 🚚', 'Nova venda! R$ 💸',
];
class Actor {
  constructor(o, R) {
    Object.assign(this, { skin: rnd(SKINS), hair: rnd(HAIRS), pants: rnd(PANTS), shirt: '#444', dir: 'S', path: [], walk: 0, wait: 1 + Math.random() * 3, say: null, sayT: 0, nextSay: 3 + Math.random() * 12 }, o);
    const spot = o.seat || o.still;
    if (spot) { this.x = spot[0] + .5; this.y = spot[1] + .5; this.dir = spot[2]; }
    else if (o.x == null) { const t = freeTile(R); this.x = t[0] + .5; this.y = t[1] + .5; }
  }
}
function freeTile(R) {
  for (let k = 0; k < 200; k++) {
    const x = Math.floor(Math.random() * R.W), y = Math.floor(Math.random() * R.H);
    if (!R.blocked.has(y * R.W + x) && !R.furn.some(f => f.x === x && f.y === y)) return [x, y];
  }
  return [R.W - 1, R.H - 1];
}
function findPath(R, sx, sy, tx, ty) {
  const W = R.W, key = (x, y) => y * W + x, start = key(sx, sy), goal = key(tx, ty);
  const prev = new Map([[start, -1]]), q = [start];
  while (q.length) {
    const c = q.shift(); if (c === goal) break;
    const cx = c % W, cy = (c / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy, k = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= W || ny >= R.H || prev.has(k) || (R.blocked.has(k) && k !== goal)) continue;
      prev.set(k, c); q.push(k);
    }
  }
  if (!prev.has(goal)) return [];
  const out = []; for (let c = goal; c !== start; c = prev.get(c)) out.unshift([c % W + .5, ((c / W) | 0) + .5]);
  return out;
}

const player = { name: 'Daniel', role: 'Dono · Operação N7', shirt: '#14182e', pants: '#0b0f1e', hair: '#1b1b1b', skin: '#d9a273', crown: true, tag: '#ffd24d', player: true };
let room = null, actors = [], playerA = null;
const npcCache = {};

function enterRoom(id, fromId) {
  const R = ROOMS[id];
  const door = fromId && R.decor.find(d => d.door === fromId);
  const sp = door ? door.tile : (R.spawn || freeTile(R));
  if (!playerA) playerA = new Actor({ ...player, x: sp[0] + .5, y: sp[1] + .5 }, R);
  playerA.x = sp[0] + .5; playerA.y = sp[1] + .5; playerA.path = []; playerA.dir = door ? (door.w === 'R' ? 'S' : 'E') : 'S';
  if (!npcCache[id]) npcCache[id] = R.npcs.map(n => new Actor({ headset: !n.bot, ...n }, R));
  room = R; actors = [playerA, ...npcCache[id]];
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.room === id));
  document.getElementById('rtName').textContent = R.name;
  document.getElementById('rtSub').textContent = R.sub;
  fade = 1; fit();
}
function goRoom(id) { if (room && id !== room.id) enterRoom(id, room.id); }

function updateActor(a, dt) {
  if (a.path.length) {
    const [tx, ty] = a.path[0], dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy), st = 2.3 * dt;
    if (Math.abs(dx) > .01 || Math.abs(dy) > .01) a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : (dy > 0 ? 'S' : 'N');
    if (d <= st) { a.x = tx; a.y = ty; a.path.shift(); } else { a.x += dx / d * st; a.y += dy / d * st; }
    a.moving = true; a.walk += dt * 11;
  } else {
    a.moving = false;
    if (a.wander && (a.wait -= dt) < 0) {
      const t = freeTile(room);
      a.path = findPath(room, Math.floor(a.x), Math.floor(a.y), t[0], t[1]);
      a.wait = 2 + Math.random() * 5;
    }
  }
  if (!a.player) {
    if (a.say && (a.sayT -= dt) < 0) a.say = null;
    if ((a.nextSay -= dt) < 0) { a.say = rnd(PHRASES); a.sayT = 4; a.nextSay = 9 + Math.random() * 16; }
  }
}

function drawActor(a) {
  const [sx, sy] = P(a.x, a.y, 0);
  const seated = !!a.seat, front = a.dir === 'S' || a.dir === 'E', fx = (a.dir === 'S' || a.dir === 'W') ? -1 : 1;
  const sw = a.moving ? Math.sin(a.walk) * 3 : 0, bob = a.moving ? Math.abs(Math.cos(a.walk)) * 1.3 : 0;
  ctx.save(); ctx.translate(sx, sy - (seated ? 2 : 0));
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, seated ? 2 : 0, 11, 5.5, 0, 0, 7); ctx.fill();
  const ol = 'rgba(0,0,0,.45)';
  const rect = (x, y, w, h, c, r = 2) => { ctx.fillStyle = c; rr(ctx, x, y, w, h, r); ctx.fill(); ctx.strokeStyle = ol; ctx.lineWidth = .8; ctx.stroke(); };
  if (seated) {
    rect(fx > 0 ? 0 : -12, -16, 12, 6, a.pants);
    rect(fx > 0 ? 8 : -12, -12, 4, 10, a.pants);
  } else {
    rect(-6, -15 - bob + Math.max(0, sw), 5, 15 - Math.max(0, sw), a.pants, 1.5);
    rect(1, -15 - bob + Math.max(0, -sw), 5, 15 - Math.max(0, -sw), a.pants, 1.5);
    ctx.fillStyle = '#0b0b12'; ctx.fillRect(-6, -2, 5, 2); ctx.fillRect(1, -2, 5, 2);
  }
  const ty = -33 - bob;
  rect(-10, ty + 2 + (a.moving ? sw * .4 : 0), 4, 13, a.shirt);
  rect(6, ty + 2 - (a.moving ? sw * .4 : 0), 4, 13, a.shirt);
  rect(-7, ty, 14, 19, a.shirt, 3);
  if (a.crown) { ctx.fillStyle = '#ffd24d'; ctx.fillRect(-1, ty + 2, 2, 12); }
  if (a.bot) { ctx.fillStyle = COL.cy; ctx.fillRect(-3, ty + 6, 6, 2); }
  // cabeça
  const hy = ty - 14;
  rect(-6.5, hy, 13, 13, a.skin, 3);
  if (front) {
    ctx.fillStyle = a.hair; rr(ctx, -7, hy - 2, 14, 6, 3); ctx.fill();
    ctx.fillStyle = a.bot ? COL.cy : '#111';
    ctx.fillRect(fx * 1.5 - 3.5, hy + 6, 2, a.bot ? 1.5 : 2.2); ctx.fillRect(fx * 1.5 + 1.5, hy + 6, 2, a.bot ? 1.5 : 2.2);
    ctx.fillStyle = 'rgba(120,40,40,.7)'; ctx.fillRect(fx * 1.5 - 1.5, hy + 10, 3, 1);
  } else { ctx.fillStyle = a.hair; rr(ctx, -7, hy - 2, 14, 12, 3); ctx.fill(); }
  if (a.headset) {
    ctx.strokeStyle = COL.cy; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, hy + 5, 8, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.fillRect(-8.5, hy + 4, 3, 5); ctx.fillRect(5.5, hy + 4, 3, 5);
    if (front) { ctx.strokeStyle = COL.cy; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(fx * 7, hy + 8); ctx.lineTo(fx * 3, hy + 11); ctx.stroke(); }
  }
  if (a.bot) { ctx.strokeStyle = COL.cy; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, hy - 2); ctx.lineTo(0, hy - 8); ctx.stroke(); ctx.fillStyle = COL.ma; ctx.beginPath(); ctx.arc(0, hy - 9, 2, 0, 7); ctx.fill(); }
  if (a.crown) {
    ctx.save(); ctx.fillStyle = '#ffd24d'; ctx.shadowColor = '#ffd24d'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(-6, hy - 2); ctx.lineTo(-6, hy - 9); ctx.lineTo(-3, hy - 5); ctx.lineTo(0, hy - 11); ctx.lineTo(3, hy - 5); ctx.lineTo(6, hy - 9); ctx.lineTo(6, hy - 2); ctx.fill(); ctx.restore();
  }
  ctx.restore();
  a._head = [sx, sy + hy - (seated ? 2 : 0) - (a.crown ? 12 : 4)];
}
function drawLabels(a) {
  const [x, y0] = a._head; let y = y0 - 6;
  ctx.font = '600 9px Inter, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(a.name).width + 14;
  ctx.fillStyle = 'rgba(6,10,28,.82)'; rr(ctx, x - w / 2, y - 7, w, 14, 7); ctx.fill();
  ctx.strokeStyle = a.tag || COL.cy; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = a.tag || '#fff'; ctx.fillText(a.name, x, y + .5);
  if (a.say) {
    y -= 22; ctx.font = '9.5px Inter, Arial';
    const sw = ctx.measureText(a.say).width + 16;
    ctx.globalAlpha = Math.min(1, a.sayT * 2);
    ctx.fillStyle = '#fff'; rr(ctx, x - sw / 2, y - 9, sw, 18, 6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 4, y + 9); ctx.lineTo(x + 4, y + 9); ctx.lineTo(x, y + 14); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; rr(ctx, x - sw / 2, y - 9, sw, 18, 6); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.fillText(a.say, x, y + .5); ctx.globalAlpha = 1;
  }
}

// ---------- cena ----------
function drawRoom(R) {
  const { W, H, WH } = R;
  // paredes
  const gR = ctx.createLinearGradient(0, -WH, 0, H * TH / 2); gR.addColorStop(0, sh(R.wR, 1.25)); gR.addColorStop(1, R.wR);
  poly([P(0, 0, 0), P(W, 0, 0), P(W, 0, WH), P(0, 0, WH)], gR);
  poly([P(0, 0, 0), P(0, H, 0), P(0, H, WH), P(0, 0, WH)], R.wL);
  poly([P(0, 0, WH), P(W, 0, WH), P(W, -.25, WH), P(0, -.25, WH)], sh(R.wR, 1.6));
  poly([P(0, 0, WH), P(0, H, WH), P(-.25, H, WH), P(-.25, -.25, WH), P(0, -.25, WH)], sh(R.wL, 1.6));
  // painéis verticais futuristas
  ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1;
  for (let i = 1; i < W; i++) { ctx.beginPath(); ctx.moveTo(...P(i, 0, 0)); ctx.lineTo(...P(i, 0, WH)); ctx.stroke(); }
  for (let i = 1; i < H; i++) { ctx.beginPath(); ctx.moveTo(...P(0, i, 0)); ctx.lineTo(...P(0, i, WH)); ctx.stroke(); }
  // faixas neon
  ctx.save(); ctx.shadowColor = R.accent; ctx.shadowBlur = 12; ctx.strokeStyle = R.accent; ctx.lineWidth = 2;
  for (const z of [6, WH - 10]) { ctx.beginPath(); ctx.moveTo(...P(0, H, z)); ctx.lineTo(...P(0, 0, z)); ctx.lineTo(...P(W, 0, z)); ctx.stroke(); }
  ctx.restore();
  // decoração das paredes
  for (const d of R.decor) {
    const img = TEX[d.t].c;
    const pts = d.w === 'R' ? faceY(img, d.p, 0, d.z, d.s, d.h) : faceL(img, d.p, d.s, d.z, d.h);
    if (d.door) hits.push({ poly: pts, fn: () => goRoom(d.door) });
  }
  // piso
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    poly([P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], (x + y) % 2 ? R.f1 : R.f2, 'rgba(120,160,255,.07)');
  }
  for (const r of R.rugs) {
    const pts = [P(r.x, r.y, .5), P(r.x + r.w, r.y, .5), P(r.x + r.w, r.y + r.d, .5), P(r.x, r.y + r.d, .5)];
    ctx.save(); ctx.globalAlpha = .85; poly(pts, r.c); ctx.restore();
    ctx.save(); ctx.shadowColor = r.e; ctx.shadowBlur = 10; poly(pts, null, r.e, 1.5); ctx.restore();
  }
  // borda frontal do piso
  poly([P(0, H, 0), P(W, H, 0), P(W, H, -14), P(0, H, -14)], '#0a0f26');
  poly([P(W, 0, 0), P(W, H, 0), P(W, H, -14), P(W, 0, -14)], '#070b1c');
  ctx.save(); ctx.shadowColor = R.accent; ctx.shadowBlur = 10; ctx.strokeStyle = R.accent; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(...P(0, H, 0)); ctx.lineTo(...P(W, H, 0)); ctx.lineTo(...P(W, 0, 0)); ctx.stroke(); ctx.restore();
  // portas: marca no chão
  for (const d of R.decor) if (d.door) {
    const [x, y] = d.tile;
    poly([P(x, y, 1), P(x + 1, y, 1), P(x + 1, y + 1, 1), P(x, y + 1, 1)], 'rgba(0,229,255,.12)', DOOR_COL[d.door], 1);
  }
  if (hoverTile) {
    const [x, y] = hoverTile;
    ctx.save(); ctx.shadowColor = COL.cy; ctx.shadowBlur = 8;
    poly([P(x, y, 1), P(x + 1, y, 1), P(x + 1, y + 1, 1), P(x, y + 1, 1)], 'rgba(0,229,255,.15)', COL.cy, 1.5); ctx.restore();
  }
  // móveis + pessoas ordenados por profundidade
  const items = R.furn.map(f => {
    let k = f.x + f.y + 1;
    if (f.t === 'chair') k += (f.dir === 'N' || f.dir === 'E') ? .03 : -.03;
    if (f.t === 'bossdesk' && f.i === 2) k += .5;
    return { k, f };
  });
  for (const a of actors) items.push({ k: a.x + a.y, a });
  items.sort((p, q) => p.k - q.k);
  for (const it of items) it.f ? D[it.f.t](it.f) : drawActor(it.a);
  for (const a of actors) drawLabels(a);
}

function fit() {
  if (!room) return;
  const { W, H, WH } = room;
  const minx = -H * TW / 2, maxx = W * TW / 2, miny = -WH - 30, maxy = (W + H) * TH / 2 + 16;
  const top = VW < 820 ? 128 : 96, bottom = 50;
  const aw = VW - 32, ah = VH - top - bottom;
  const s = Math.max(.35, Math.min(3, Math.min(aw / (maxx - minx), ah / (maxy - miny)) * zoom));
  cam.s = s; cam.ox = VW / 2 - (minx + maxx) / 2 * s; cam.oy = top + ah / 2 - (miny + maxy) / 2 * s;
}
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2); VW = innerWidth; VH = innerHeight;
  cv.width = VW * DPR; cv.height = VH * DPR; fit();
}
const toWorld = (mx, my) => [(mx - cam.ox) / cam.s, (my - cam.oy) / cam.s];
function tileAt(wx, wy) {
  const x = Math.floor((wy / (TH / 2) + wx / (TW / 2)) / 2), y = Math.floor((wy / (TH / 2) - wx / (TW / 2)) / 2);
  return x >= 0 && y >= 0 && x < room.W && y < room.H ? [x, y] : null;
}

cv.addEventListener('mousemove', e => {
  mouse = toWorld(e.clientX, e.clientY);
  const onHit = hits.some(h => inPoly(mouse, h.poly));
  const t = onHit ? null : tileAt(...mouse);
  hoverTile = t && !room.blocked.has(t[1] * room.W + t[0]) ? t : null;
  cv.style.cursor = onHit || hoverTile ? 'pointer' : 'default';
});
cv.addEventListener('mouseleave', () => { hoverTile = null; });
cv.addEventListener('click', e => {
  const w = toWorld(e.clientX, e.clientY);
  for (let i = hits.length - 1; i >= 0; i--) if (inPoly(w, hits[i].poly)) return hits[i].fn();
  const t = tileAt(...w);
  if (t && !room.blocked.has(t[1] * room.W + t[0])) playerA.path = findPath(room, Math.floor(playerA.x), Math.floor(playerA.y), t[0], t[1]);
});
cv.addEventListener('wheel', e => { e.preventDefault(); zoom = Math.max(.6, Math.min(2, zoom * (e.deltaY < 0 ? 1.1 : .9))); fit(); }, { passive: false });
document.getElementById('zin').onclick = () => { zoom = Math.min(2, zoom * 1.15); fit(); };
document.getElementById('zout').onclick = () => { zoom = Math.max(.6, zoom / 1.15); fit(); };
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => goRoom(b.dataset.room));
addEventListener('resize', resize);

// ---------- modal do Mercado Livre ----------
const modal = document.getElementById('modal'), big = document.getElementById('mlbig'), bg = big.getContext('2d');
function openML() { modal.hidden = false; }
function closeML() { modal.hidden = true; }
document.getElementById('mclose').onclick = closeML;
modal.addEventListener('click', e => { if (e.target === modal) closeML(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeML(); });

// ---------- loop ----------
let T = 0, last = performance.now(), texT = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt;
  if ((texT += dt) > .1) { texT = 0; for (const t of Object.values(TEX)) if (t.anim) t.draw(t.g, t.w, t.h, T); }
  for (const a of actors) updateActor(a, dt);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.setTransform(DPR * cam.s, 0, 0, DPR * cam.s, DPR * cam.ox, DPR * cam.oy);
  hits = [];
  drawRoom(room);
  if (fade > 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(5,8,22,${fade})`; ctx.fillRect(0, 0, cv.width, cv.height);
    fade = Math.max(0, fade - dt * 3);
  }
  if (!modal.hidden) drawML(bg, big.width, big.height, T, 0);
  requestAnimationFrame(frame);
}
function tickHud() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const total = 1 + Object.values(ROOMS).reduce((n, R) => n + R.npcs.length, 0);
  document.getElementById('online').textContent = `● ${total} online`;
}
setInterval(tickHud, 10000); tickHud();

resize();
enterRoom('chefe');
requestAnimationFrame(frame);
if (document.fonts) document.fonts.ready.then(() => { for (const t of Object.values(TEX)) t.draw(t.g, t.w, t.h, T); });
})();
