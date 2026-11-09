---
name: lab-book-research
description: Update Lab Book research pages, task hierarchies, ablations, metrics, repositories, branch maps and linked HTML/SVG diagrams through its HTTP API. Use when the user gives a Lab Book endpoint or asks to record research progress in Lab Book; not for unrelated task trackers.
---

Use the endpoint supplied by the user. Local production defaults to
`http://127.0.0.1:4173`, test to `http://127.0.0.1:4175`.

Read `/api/v1/schema` and `/api/v1/docs` from that endpoint before writing.
They describe the running server's fields and validation rules. Confirm the
reported environment matches the user's intended target. Use the configured
`LABBOOK_AGENT_TOKEN` bearer token if required; never an OpenAI key.

Research streams are ordinary notes. Look up existing records and reuse IDs
rather than creating a parallel collection or duplicate pages. Link entities
using `noteId`, `parentNoteId`, `boardIds`, `parentId`, `repoId`, and `branchId`.
Create parents before dependants. The API rejects cycles and dangling links.

POST new entities with a stable `externalId` derived from the actual source
(for example scheduler job ID). Existing external IDs return the existing
record; PATCH it explicitly to update progress. Preserve source-board IDs
when updating cards shown in combined views. Never duplicate a task just to
make it appear in another view.

For read-modify-write operations, carry the response ETag into If-Match.
On 409, fetch current records and reconcile changes. Do not overwrite a
workspace snapshot or retry stale note content unchanged. Preserve existing
editor HTML, paper embeds and manual versions. Append requested blocks to
the latest content and mark updated notes `draft: true`.

Record only known status, measured numeric metrics, actual machine/cluster
names, branch commits and PR state. Keep unknown metrics absent rather than
zero. Planned experiments are not training runs. The API records metadata;
it does not run training or automatically synchronize Git providers.

For architecture diagrams, author HTML or SVG containing real anchor links
to `/notes/ID`, `/boards/ID`, `/papers/ID` or external HTTP/S destinations.
Use fragment links for sections within a diagram. Follow the API documentation
for the encoded `data-architecture` block. Scripts and inline event handlers
are disabled; express navigation as links rather than JavaScript.

After changes, GET the affected records and report their direct app URLs.
Tell the user to reload an already open workspace after agent writes; stale
browser revisions intentionally cannot overwrite those changes.
