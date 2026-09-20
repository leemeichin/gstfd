# The second success story

A real Codex CLI run using GPT-6 Astra and the unmodified GSTFD skill built the [support operations dashboard](support-ops/) from [this prompt](prompt.txt) and a synthetic ticket CSV on 20 September 2026.

The run took **4 minutes 4 seconds**, including its automated checks. It started with only `SKILL.md` and `tickets.csv`; the agent generated the app and tests. The [original terminal recording](build.cast) retains the actual event timings. The [54-second video](gstfd-demo.mp4) shortens idle pauses and omits the repeated final diff, then shows the browser workflow at normal speed. Title cards and the downloaded-CSV viewer were added during editing.

Open `support-ops/index.html` in a browser and click **Load provided sample** to try the result. Run `node --test demo/support-ops/queue.test.cjs` from the repository root for the generated checks. A separate Chromium pass verified upload, counts, priority/date ordering, owner/search filters, download and re-import, quoted fields, empty results, and preservation of the queue after an invalid import; its [results](browser-checks.json) describe that recorded run.

The skill remains [one Markdown file](../SKILL.md). These files are the demonstration, not installation requirements.
