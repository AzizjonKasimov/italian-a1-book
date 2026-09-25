#!/usr/bin/env node
/* Step 1 of the audio pipeline: collect every Italian text the page can play,
   with its voice and speaking rate, into tools/texts.json.
   Usage: node tools/extract-texts.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

global.window = global;
const V = require(path.join(ROOT, 'data', 'voices.js'));
['week1', 'week2', 'week3', 'week4', 'appendix'].forEach(f => require(path.join(ROOT, 'data', f + '.js')));

const items = new Map();
function add(group, voiceTag, rawText, rate) {
  const text = V.ttsText(rawText);
  if (!text) return;
  const id = V.key(voiceTag, text);
  let it = items.get(id);
  if (!it) { it = { id, voice: V.voices[voiceTag], rate, text, groups: [] }; items.set(id, it); }
  if (!it.groups.includes(group)) it.groups.push(group);
}
const sayRe = /data-say=(?:"([^"]*)"|'([^']*)')/g;
function addFromHtml(group, html) {
  let m; sayRe.lastIndex = 0;
  while ((m = sayRe.exec(html))) add(group, 'f1', m[1] != null ? m[1] : m[2], V.rates.vocab);
}

for (const L of window.LESSONS) {
  const g = 'day' + L.day;
  if (L.dialogue) L.dialogue.lines.forEach(l => { if (l[0]) add(g, V.voiceFor(l[0]), l[1], V.rates.dialogue); });
  (L.vocab || []).forEach(v => add(g, 'f1', V.vocabText(v[0], v.length === 3 ? v[1] : ''), V.rates.vocab));
  (L.grammar || []).forEach(gb => addFromHtml(g, gb.body));
  (L.listen || []).forEach((it, i) => add(g, V.LISTEN_VOICES[i % V.LISTEN_VOICES.length], it.text, V.rates.dialogue));
}

/* speaker buttons on the static pages (pronunciation table, numbers page), verb list, survival phrases */
const page = fs.readFileSync(path.join(ROOT, 'src', 'page.html'), 'utf8');
const tplRe = /<template id="[^"]+">([\s\S]*?)<\/template>/g; let tm;
while ((tm = tplRe.exec(page))) addFromHtml('extra', tm[1]);
window.VERBS.forEach(v => add('extra', 'f1', V.verbText(v), V.rates.vocab));
window.PHRASES.forEach(gp => gp.items.forEach(p => add('extra', 'f1', p[0], V.rates.vocab)));

const out = [...items.values()];
fs.writeFileSync(path.join(ROOT, 'tools', 'texts.json'), JSON.stringify(out));
const counts = {};
out.forEach(it => it.groups.forEach(g => { counts[g] = (counts[g] || 0) + 1; }));
console.log(out.length + ' unique clips');
console.log(Object.entries(counts).map(([g, n]) => g + ':' + n).join('  '));
