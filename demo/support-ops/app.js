'use strict';
const $ = id => document.getElementById(id);
let tickets = [], loaded = false, importVersion = 0;

function render() {
  const open = Queue.openQueue(tickets);
  const visible = Queue.visibleQueue(tickets, $('owner').value, $('search').value);
  $('total').textContent = tickets.length;
  $('open').textContent = open.length;
  $('urgent').textContent = open.filter(t => ['critical', 'urgent'].includes(t.priority)).length;
  $('unassigned').textContent = open.filter(t => !t.owner).length;
  $('visible').textContent = `Showing ${visible.length} of ${open.length} open tickets`;
  $('export').textContent = `Export visible CSV (${visible.length})`;
  $('export').disabled = !loaded;
  $('rows').replaceChildren(...visible.map(ticket => {
    const tr = document.createElement('tr');
    const values = [ticket.id, ticket.subject, ticket.priority, ticket.status, ticket.owner || 'Unassigned', new Date(ticket.created).toISOString().replace('T', ' ').slice(0, 16)];
    values.forEach((value, i) => {
      const td = document.createElement('td');
      if (i === 2) {
        const badge = document.createElement('span');
        badge.className = 'badge ' + (['critical', 'urgent', 'high', 'medium', 'low'].includes(value) ? value : 'other');
        badge.textContent = value; td.append(badge);
      } else td.textContent = value;
      tr.append(td);
    });
    return tr;
  }));
  $('empty').hidden = visible.length > 0;
  $('empty').textContent = !loaded ? 'Load tickets to see your queue.' : open.length ? 'No tickets match these filters.' : 'Queue clear — no open tickets.';
}

function load(text, name) {
  try {
    const next = Queue.importCSV(text);
    tickets = next; loaded = true;
    const owners = new Map();
    Queue.openQueue(tickets).forEach(t => owners.set(Queue.key(t.owner), t.owner || 'Unassigned'));
    $('owner').replaceChildren(new Option('All owners', '*'), ...Array.from(owners).sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => new Option(label, value)));
    $('owner').value = '*'; $('search').value = '';
    $('error').hidden = true;
    const excluded = tickets.length - Queue.openQueue(tickets).length;
    $('message').textContent = `${name}: ${tickets.length} tickets loaded; ${excluded} closed or resolved excluded.`;
    render();
  } catch (error) { showError(error); }
}
function showError(error) {
  $('error').textContent = `Import failed: ${error.message} The existing queue was kept.`;
  $('error').hidden = false;
}
$('sample').addEventListener('click', () => { importVersion++; $('upload').value = ''; load(SAMPLE_CSV, 'Provided sample'); });
$('upload').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  const version = ++importVersion;
  try { const text = await file.text(); if (version === importVersion) load(text, file.name); }
  catch (error) { if (version === importVersion) showError(error); }
  finally { if (version === importVersion) $('upload').value = ''; }
});
$('owner').addEventListener('change', render);
$('search').addEventListener('input', render);
$('clear').addEventListener('click', () => { $('owner').value = '*'; $('search').value = ''; render(); });
$('export').addEventListener('click', () => {
  const csv = Queue.exportCSV(Queue.visibleQueue(tickets, $('owner').value, $('search').value));
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'visible-support-queue.csv';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
render();
