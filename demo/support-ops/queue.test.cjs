const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Q = require('./queue.js');
const sample = fs.readFileSync(__dirname + '/tickets.csv', 'utf8');
const tickets = Q.importCSV(sample);

test('sample: excludes closed/resolved and sorts priority then oldest', () => {
  assert.equal(tickets.length, 12);
  assert.deepEqual(Q.openQueue(tickets).map(t => t.id), [
    'SUP-101', 'SUP-109', 'SUP-104', 'SUP-107', 'SUP-102', 'SUP-112', 'SUP-111', 'SUP-106', 'SUP-108', 'SUP-103'
  ]);
});
test('owner and subject filters combine without changing order', () => {
  assert.deepEqual(Q.visibleQueue(tickets, 'alex').map(t => t.id), ['SUP-109', 'SUP-107', 'SUP-102', 'SUP-111']);
  assert.deepEqual(Q.visibleQueue(tickets, 'alex', ' IMPORT ').map(t => t.id), ['SUP-107']);
  assert.deepEqual(Q.visibleQueue(tickets, '').map(t => t.id), ['SUP-112', 'SUP-106']);
});
test('visible export round-trips commas and escaped quotes in exactly the visible order', () => {
  const visible = Q.visibleQueue(tickets);
  assert.deepEqual(Q.importCSV(Q.exportCSV(visible)), visible);
  const filtered = Q.visibleQueue(tickets, 'alex', 'import');
  assert.deepEqual(Q.importCSV(Q.exportCSV(filtered)), filtered);
  assert.match(Q.exportCSV(filtered), /"Import says ""invalid format"""/);
  assert.deepEqual(Q.importCSV(Q.exportCSV([])), []);
});
test('BOM, casing, spaces, multiline quotes, CRLF, and reordered headers', () => {
  const text = '\uFEFF OWNER , sTaTuS , priority , subject , created   at , ticket id\r\n SAM , IN   PROGRESS , Urgent , "Two, ""quoted""\nlines" , 2026-09-01T00:00:00Z , T1\r\nAlex, ReSoLvEd ,low,Done,2026-09-01T00:00:00Z,T2\r\n';
  const parsed = Q.importCSV(text);
  assert.equal(parsed[0].subject, 'Two, "quoted"\nlines');
  assert.equal(parsed[0].status, 'in progress');
  assert.equal(Q.visibleQueue(parsed, 'sam').length, 1);
  assert.deepEqual(Q.importCSV(Q.exportCSV(parsed)), parsed);
});
test('malformed CSV and missing required data fail with useful errors', () => {
  assert.throws(() => Q.importCSV('subject\nHello'), /Missing columns/);
  assert.throws(() => Q.parseCSV('"unfinished'), /unclosed/);
  assert.throws(() => Q.parseCSV('"done"junk'), /Unexpected/);
  assert.throws(() => Q.importCSV(sample + 'too,few\n'), /fields/);
  assert.throws(() => Q.importCSV(sample.replace('2026-09-18T09:00:00Z', 'bad-date')), /valid creation date/);
});

// Exercise the actual UI event handlers with a small DOM harness, without dependencies.
test('UI: sample, counts, filters, upload, retained queue on failure, and download', async () => {
  class Element {
    constructor(tag = '') { this.tag = tag; this.value = ''; this.children = []; this.handlers = {}; this.hidden = false; this.textContent = ''; }
    addEventListener(type, fn) { this.handlers[type] = fn; }
    replaceChildren(...children) { this.children = children; }
    append(child) { this.children.push(child); }
    click() { this.handlers.click?.(); }
    remove() {}
  }
  const ids = [...fs.readFileSync(__dirname + '/index.html', 'utf8').matchAll(/id="([^"]+)"/g)].map(m => m[1]);
  const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
  elements.owner.value = '*';
  let blob, download;
  const context = vm.createContext({
    Queue: Q, SAMPLE_CSV: sample, Blob,
    Option: function (label, value) { this.textContent = label; this.value = value; },
    URL: { createObjectURL(value) { blob = value; return 'blob:test'; }, revokeObjectURL() {} },
    setTimeout(fn) { fn(); },
    document: {
      getElementById: id => elements[id], body: new Element('body'),
      createElement(tag) { const element = new Element(tag); if (tag === 'a') download = element; return element; }
    }
  });
  vm.runInContext(fs.readFileSync(__dirname + '/app.js', 'utf8'), context);
  assert.equal(elements.export.disabled, true);
  elements.sample.click();
  assert.equal(elements.total.textContent, 12);
  assert.equal(elements.open.textContent, 10);
  assert.equal(elements.urgent.textContent, 2);
  assert.equal(elements.unassigned.textContent, 2);
  assert.equal(elements.rows.children.length, 10);
  elements.owner.value = 'alex'; elements.owner.handlers.change();
  elements.search.value = 'import'; elements.search.handlers.input();
  assert.equal(elements.rows.children.length, 1);
  assert.equal(elements.rows.children[0].children[0].textContent, 'SUP-107');
  elements.export.click();
  assert.equal(download.download, 'visible-support-queue.csv');
  assert.deepEqual(Q.importCSV(await blob.text()).map(t => t.id), ['SUP-107']);
  elements.search.value = 'no match'; elements.search.handlers.input();
  elements.export.click();
  assert.equal(Q.importCSV(await blob.text()).length, 0);
  assert.equal(elements.empty.hidden, false);
  elements.clear.click();
  assert.equal(elements.rows.children.length, 10);
  await elements.upload.handlers.change({ target: { files: [{ name: 'bad.csv', text: async () => 'wrong\nfile' }] } });
  assert.equal(elements.error.hidden, false);
  assert.equal(elements.rows.children.length, 10);
  const uploaded = Q.exportCSV([tickets[6]]);
  await elements.upload.handlers.change({ target: { files: [{ name: 'new.csv', text: async () => uploaded }] } });
  assert.equal(elements.total.textContent, 1);
  assert.equal(elements.rows.children[0].children[1].textContent, 'Import says "invalid format"');
  assert.equal(elements.error.hidden, true);
  elements.sample.click();
  assert.equal(elements.rows.children.length, 10);
});
