(function (root) {
  'use strict';
  const headers = ['Ticket ID', 'Subject', 'Priority', 'Status', 'Owner', 'Created At'];
  const key = value => value.trim().replace(/\s+/g, ' ').toLowerCase();
  const ranks = { critical: 0, urgent: 0, high: 1, medium: 2, normal: 2, low: 3 };

  function parseCSV(text) {
    text = text.replace(/^\uFEFF/, '');
    const rows = [];
    let row = [], field = '', quoted = false, afterQuote = false;
    const pushField = () => { row.push(field.trim()); field = ''; afterQuote = false; };
    const pushRow = () => { pushField(); if (row.some(Boolean)) rows.push(row); row = []; };
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (quoted) {
        if (char === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { quoted = false; afterQuote = true; }
        } else field += char;
      } else if (char === ',') pushField();
      else if (char === '\n' || char === '\r') {
        if (char === '\r' && text[i + 1] === '\n') i++;
        pushRow();
      } else if (afterQuote) {
        if (!/\s/.test(char)) throw new Error('Unexpected text after a quoted CSV field.');
      } else if (char === '"') {
        if (field.trim()) throw new Error('Quotes inside a CSV field must be doubled and the field quoted.');
        field = ''; quoted = true;
      } else field += char;
    }
    if (quoted) throw new Error('The CSV has an unclosed quoted field.');
    if (field || row.length || afterQuote) pushRow();
    return rows;
  }

  function importCSV(text) {
    const rows = parseCSV(text);
    if (!rows.length) throw new Error('The CSV is empty.');
    const names = rows.shift().map(key);
    if (new Set(names).size !== names.length) throw new Error('The CSV has duplicate column names.');
    const indexes = headers.map(name => names.indexOf(key(name)));
    const missing = headers.filter((_, i) => indexes[i] < 0);
    if (missing.length) throw new Error('Missing columns: ' + missing.join(', ') + '.');
    return rows.map((row, i) => {
      if (row.length !== names.length) throw new Error(`Record ${i + 2} has ${row.length} fields; expected ${names.length}.`);
      const [id, subject, rawPriority, rawStatus, owner, created] = indexes.map(index => row[index]);
      if (!id || !subject || !rawPriority || !rawStatus || !created || !Number.isFinite(Date.parse(created))) {
        throw new Error(`Record ${i + 2} needs an ID, subject, priority, status, and valid creation date.`);
      }
      return { id, subject, priority: key(rawPriority), status: key(rawStatus), owner, created };
    });
  }

  function openQueue(tickets) {
    return tickets.filter(t => !['closed', 'resolved'].includes(t.status)).sort((a, b) =>
      (ranks[a.priority] ?? 4) - (ranks[b.priority] ?? 4) || Date.parse(a.created) - Date.parse(b.created));
  }
  function visibleQueue(tickets, owner = '*', search = '') {
    return openQueue(tickets).filter(t => (owner === '*' || key(t.owner) === owner) && t.subject.toLowerCase().includes(search.trim().toLowerCase()));
  }
  function exportCSV(tickets) {
    const quote = value => '"' + String(value).replace(/"/g, '""') + '"';
    return [headers, ...tickets.map(t => [t.id, t.subject, t.priority, t.status, t.owner, t.created])]
      .map(row => row.map(quote).join(',')).join('\r\n') + '\r\n';
  }
  const api = { headers, key, parseCSV, importCSV, openQueue, visibleQueue, exportCSV };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Queue = api;
})(globalThis);
