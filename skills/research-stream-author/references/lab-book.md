# Maintaining this communication style in Lab Book

Use the requested endpoint; production LAN is `http://lab-book.local` with
`http://192.168.1.146:8080` as fallback. Test defaults to
`http://localhost:4175`. Inspect `/api/v1/schema` and `/api/v1/docs` and confirm
the target environment before writing. Use the agent token if configured,
never an OpenAI key. The app's research assistant drafts text; it does not
have mutation tools and must not claim it updated records.

The existing `lab-book-research` skill describes transport and relationships.
This reference is self-contained for the communication-to-data mapping.

## Map concepts to existing entities

| Concept | Lab Book representation |
| --- | --- |
| Stream overview | `notes` record; stable ID, `template: research`, content HTML |
| Detailed method/explainer | child note using `parentNoteId` |
| Architecture | SVG/HTML block with real note/paper/run links |
| Plan | note table with stable stage anchors; optional linked board |
| Planned/completed run | `experiments` record linked by `noteId` |
| Hyperparameters/variant | experiment `config` |
| Evaluation numbers | experiment `metrics`, typed via `tableSchemas` |
| Dataset, split, seed, budget | explicit experiment `config` fields |
| Multiple eval sets | separate metric keys such as `val_psnr` and `hard_psnr`; label units/splits |
| CI or uncertainty | additional typed metrics/config with a stated definition |
| Dated finding | append-only section in the stream or a child findings note, linked to run IDs |
| Source control/training provenance | repositories, branches and experiment links |

Do not invent a findings, batches or run-browser API. The current application
has native result sorting and page/branch filters; it does not implement the
reference HTML's complete best-per-scheme browser, pop-up system or budget
tabs. Where a control is unavailable, use explicit labeled tables, details
blocks and internal links. Avoid screenshots that duplicate changing values.

## Reliable updates

Read the existing page and linked runs. POST new records with stable
`externalId`, then PATCH an existing record explicitly on later updates.
Carry `X-Labbook-Revision` or ETag into `If-Match`. On 409, re-read and reconcile
the relevant entity before retrying. Preserve existing content and links;
append a missing section once using a stable HTML ID. Do not blindly append
the entire template on every update.

Create runs before writing findings that link to them. Use known metrics
and allowed statuses only. Typed schema changes apply workspace-wide, so
reuse columns and give new fields clear labels, units and objective direction.

Author a native experiment block in the overview:

```html
<div contenteditable="false" class="hub-embed"
 data-research-block="experiments" data-source-id="ACTUAL_NOTE_ID"></div>
```

Architecture blocks use URL-encoded HTML/SVG in `data-architecture`:

```js
const block = '<div contenteditable="false" class="architecture-block" '
  + 'data-architecture="' + encodeURIComponent(svg) + '"></div>';
```

Scripts and inline event handlers are disabled. Use normal anchors and
details/summary in explainers. Link runs with `/experiments?page=NOTE_ID`
and an explicit experiment ID in the finding text; the application does not
currently provide a distinct `/experiments/RUN_ID` page. Paper links use
`/papers/ID`, notes `/notes/ID`, boards `/boards/ID`. Verify IDs before linking.

The published page defaults to read mode. To change it, PATCH `content` and
set `draft: true`, preserving `published` and `versions`. If the user asks to
publish, append a version snapshot and set `published` to that snapshot and
`draft: false`. Do not publish merely because the page was updated.

After writing, GET the changed records, check entity links, and report their
direct URLs. Reload already-open workspaces to load the new revision.
