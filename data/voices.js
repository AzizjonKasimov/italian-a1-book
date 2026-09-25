/* Shared between the page (browser) and tools/extract-texts.js (node):
   which voice speaks which line, and how a text is keyed to its audio clip. */
(function (root) {
  var V = {
    /* voice tags used in the page -> Microsoft Edge neural voices used at generation time */
    voices: { f1: 'it-IT-ElsaNeural', f2: 'it-IT-IsabellaNeural', m1: 'it-IT-DiegoNeural', m2: 'it-IT-GiuseppeMultilingualNeural' },
    rates: { dialogue: '-10%', vocab: '+0%' },
    LISTEN_VOICES: ['m1', 'f1', 'f2', 'm2', 'f1'],
    speakers: {
      'Karim': 'm1', 'Marco': 'm2', 'Tiago': 'm1', 'Signor Rossi': 'm2', 'Barista': 'm1', 'Cameriere': 'm2',
      'Impiegato': 'm1', 'Tabaccaio': 'm2', 'Autista': 'm1', 'Fruttivendolo': 'm2', 'Poliziotto': 'm1', 'Medico': 'm2',
      'Signor Ricci': 'm1', 'Collega': 'm2', 'Portiere': 'm1', 'Controllore': 'm2',
      'Ana': 'f2', 'Yuki': 'f1', 'Signora Bianchi': 'f1', 'Signora Conti': 'f2', 'Dottoressa Greco': 'f1',
      'Commessa': 'f2', 'Receptionist': 'f2', 'Passante': 'f2', 'Farmacista': 'f1', 'Vicina': 'f2', 'Signora Ricci': 'f1',
      'Segretaria': 'f2', 'Annuncio': 'f1', 'Voce': 'f1', 'Inês': 'f2', 'Amica': 'f2', 'Impiegata': 'f1'
    },
    voiceFor: function (who) {
      if (!who) return 'f1';
      if (V.speakers[who]) return V.speakers[who];
      return /a$|^Signora|^Dottoressa/.test(who) ? 'f1' : 'm1';
    },
    /* the text that is actually spoken for a piece of content */
    ttsText: function (s) {
      return String(s || '')
        .replace(/…/g, '')
        .replace(/\s*\/\s*/g, ', ')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+,/g, ',')
        .replace(/([?!.]),/g, '$1')
        .replace(/,\s*$/, '')
        .trim();
    },
    vocabText: function (it, pl) { return pl ? it + ', ' + pl : it; },
    verbText: function (v) { return v[0].replace('|', '') + ', ' + v[1] + ', ' + v[2]; },
    /* FNV-1a 32-bit over voice|text; identical in node and the browser */
    key: function (voiceTag, text) {
      var s = voiceTag + '|' + text, h = 0x811c9dc5;
      for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
      return ('0000000' + h.toString(16)).slice(-8);
    }
  };
  root.VOICES = V;
  if (typeof module !== 'undefined' && module.exports) module.exports = V;
})(typeof window !== 'undefined' ? window : globalThis);
