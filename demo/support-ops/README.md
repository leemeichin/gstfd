# Support operations command centre

Open `index.html` in a modern browser. No installation, server, or internet connection is needed. Keep the accompanying JS and CSS files beside it.

Click **Load provided sample**, or upload your CSV. Filter by owner (including Unassigned), search subjects, then click **Export visible CSV** to download only the displayed tickets in their displayed order. With no matches, the export contains headers only.

Critical/urgent tickets come first, followed by high, medium/normal, low, then unrecognized priorities. Within each priority tier, oldest creation dates come first. Closed and resolved statuses are excluded regardless of spacing or casing. Counts describe the full imported dataset and open queue, independent of filters. Dates display in UTC.

The CSV must have Ticket ID, Subject, Priority, Status, Owner, and Created At columns, in any order. Header casing and surrounding whitespace are ignored. Owner can be blank; use ISO 8601 creation timestamps with a timezone for unambiguous ordering. Quoted commas, doubled quotes, and multiline fields are supported. Invalid imports report an error and keep the previous queue. Exports contain the six required columns, with trimmed fields and normalized priority/status values; additional input columns are ignored.

Everything stays in browser memory; refreshing clears the import. The bundled sample is a copy of `tickets.csv` in `sample.js` so it also works when opened directly from disk.

Run checks with Node.js: `node --test queue.test.cjs`. Tests cover data processing and actual UI handlers using a minimal DOM harness; they do not replace a visual browser check.
