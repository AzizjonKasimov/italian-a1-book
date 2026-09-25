#!/usr/bin/env node
/* Step 3 of the audio pipeline: join the clips of each group (day1..day30, extra) into one
   MP3 "sprite" in audio/<group>.mp3 and write the cue map audio/cues.json:
   { group: { clipId: [startMs, durationMs] } }.
   Works on raw MP3 frames (no ffmpeg needed); all clips share the encoder settings.
   Usage: node tools/pack-audio.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const BITRATES = { 1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], 2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] };
const SAMPLERATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

function header(buf, i) {
  if (i + 4 > buf.length) return null;
  const b2 = buf[i + 1], b3 = buf[i + 2];
  if (buf[i] !== 0xff || (b2 & 0xe0) !== 0xe0) return null;
  const ver = (b2 >> 3) & 3, layer = (b2 >> 1) & 3, bri = b3 >> 4, sri = (b3 >> 2) & 3, pad = (b3 >> 1) & 1;
  if (ver === 1 || layer !== 1 || bri === 0 || bri === 15 || sri === 3) return null; // Layer III only
  const mpeg1 = ver === 3;
  const br = BITRATES[mpeg1 ? 1 : 2][bri] * 1000, sr = SAMPLERATES[ver][sri];
  const len = Math.floor((mpeg1 ? 144 : 72) * br / sr) + pad;
  return { len, seconds: (mpeg1 ? 1152 : 576) / sr };
}

/* returns the raw frames of an MP3 file (ID3 tags stripped) and their total duration */
function frames(buf) {
  let i = 0, end = buf.length;
  if (end > 10 && buf.toString('latin1', 0, 3) === 'ID3') {
    i = 10 + (((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f));
  }
  if (end >= 128 && buf.toString('latin1', end - 128, end - 125) === 'TAG') end -= 128;
  const parts = []; let sec = 0;
  while (i + 4 <= end) {
    const h = header(buf, i);
    if (!h || i + h.len > end) { i++; continue; }
    if (i + h.len < end && !header(buf, i + h.len)) { i++; continue; } // false sync inside data
    parts.push(buf.subarray(i, i + h.len)); sec += h.seconds; i += h.len;
  }
  return { parts, sec };
}

const items = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'texts.json'), 'utf8'));
const groups = {};
items.forEach(it => it.groups.forEach(g => { (groups[g] = groups[g] || []).push(it); }));

fs.mkdirSync(path.join(ROOT, 'audio'), { recursive: true });
const cues = {}; let missing = 0, totalBytes = 0;
const order = Object.keys(groups).sort((a, b) => (parseInt(a.slice(3)) || 99) - (parseInt(b.slice(3)) || 99));
for (const g of order) {
  const chunks = []; let t = 0; cues[g] = {};
  for (const it of groups[g]) {
    const f = path.join(ROOT, 'tools', 'cache', it.id + '.mp3');
    if (!fs.existsSync(f)) { missing++; continue; }
    const { parts, sec } = frames(fs.readFileSync(f));
    if (!parts.length) { missing++; continue; }
    for (const p of parts) chunks.push(p);
    cues[g][it.id] = [Math.round(t * 1000), Math.round(sec * 1000)];
    t += sec;
  }
  const out = Buffer.concat(chunks);
  fs.writeFileSync(path.join(ROOT, 'audio', g + '.mp3'), out);
  totalBytes += out.length;
  console.log(g.padEnd(6), String(groups[g].length).padStart(4), 'clips', String(Math.round(out.length / 1024)).padStart(5), 'KB', t.toFixed(0).padStart(4), 's');
}
fs.writeFileSync(path.join(ROOT, 'audio', 'cues.json'), JSON.stringify(cues));
console.log('total ' + (totalBytes / 1048576).toFixed(1) + ' MB' + (missing ? ', ' + missing + ' clips missing' : ''));
if (missing) process.exit(1);
