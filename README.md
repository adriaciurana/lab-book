# Lab Book

A local workspace for research notes, papers, annotations, and tasks.

## Archive and deletion

Use **⋯** beside a workspace collection, page or task, or in the current page/board controls. Papers, experiment rows, repositories, branches and combined board views also have management actions. **Archive** hides an item from active views and keeps its content and links. Archiving a collection or page also hides dependent pages, boards, tasks and experiments. Use **Archive** in the sidebar to restore it; restore an archived parent before restoring an independently archived child.

**Review deletion…** lists how many records will be removed. Nothing is deleted until you click **Confirm permanent deletion**. Deleting a page preserves its children by default; deleting a collection moves its pages to Inbox. Select **Also delete contained pages** if you want those pages removed too. Board deletion removes its tasks, while other linked records are kept with invalid links cleared. Removed paper references become plain text in notes. Removing paper or repository records does not delete PDF files from disk or modify a remote Git repository. Inbox itself cannot be archived or deleted.

Archive status and deletion persist in the current environment. Run `npm run test:lifecycle` for hierarchy, relationship cleanup, confirmation and restore checks.

## Detailed research documents and equations

My agent writes complete explanatory documents into proposed pages, rather than section outlines. By default it develops the intuition, mechanism, mathematical formulation, worked examples, comparisons and limitations. Short explanatory proposals receive a dedicated writing pass before being presented. If that pass still produces only a stub, the request fails instead of offering it as a finished document. Explicit requests for short notes or blank templates remain brief. For an older pending outline, choose **Develop fully** in its details to replace the proposal with a complete document. This still edits only the proposal. Every addition still needs your confirmation.

Markdown headings, emphasis, lists, links, tables and code render in the chat, page previews, imported notes and saved agent pages. Use `$x^2$` or `\(x^2\)` for inline LaTeX; use `$$...$$` or `\[...\]` for display equations. Rendering uses local KaTeX assets, including fonts, with no external CDN. Raw HTML and trusted LaTeX commands are disabled.

The editor's **+ → Equation / LaTeX** opens a live equation preview. Double-click an equation in edit mode to change its source. Drafts and published versions preserve the LaTeX source; rendering is rebuilt after reload. Agent rewrites protect equation blocks like other references. Run `npm run test:rich-pages` to check detailed-page completion, safe Markdown and equation persistence.

## Edit notes with Agent

In a note's editing toolbar, **Agent** sits beside **B**. Select a passage before clicking it to edit that selection, or choose **Whole page** to rewrite the page's text using a prompt. Review the proposed wording and explicitly choose **Apply to draft**; generating or cancelling a preview leaves the note unchanged. Applying autosaves a draft and does not publish a version.

Whole-page editing preserves the existing block structure and embedded papers, diagrams, tables, links and highlight references. Selections that include protected references ask you to use whole-page mode or select only editable text. A preview cannot be applied if the page has changed since it was opened. Run `npm run test:editor-agent` for selection, confirmation, preservation and persistence checks.

## My agent: conversations and confirmed workspace changes

Open **My agent** at `/agent` (existing `/research` links still work). Use **+ New chat** to start another conversation; the left-hand tab list retains independent histories, context sources and selected skills. Use **Hide tabs / Show tabs** to give the chat the full available width; this preference is remembered in your browser. On phones, the tabs become a compact horizontal strip. Histories and proposal approval states are saved on the server and survive reloads. The message field grows automatically as you type or paste, up to a comfortable viewport limit; Send stays a fixed height and aligned to the bottom. Enter sends a message; Shift+Enter inserts a new line. There is one **Send** button for questions, research and workspace proposals. It locks immediately and shows **Working…** until the current conversation receives its response or an error, including attachment preparation. Repeated clicks and Enter do not queue duplicate requests. You can type the next message while waiting; its text is preserved when the response arrives. Enable **Include web search** when you want online sources.

The agent can propose draft pages inside existing pages, paper imports and page references, exact PDF highlights linked to notes, boards, epics/tasks/subtasks, repositories/branches, and planned experiments or ablations. Each response lists its proposed additions separately. **Nothing in a proposal is added automatically.** Select the items you want, inspect their content and destination, then explicitly choose **Apply selected**. Discarding leaves the workspace entities unchanged. Actions already applied cannot be applied again; remaining actions can reference earlier accepted ones from the same proposal.

Related changes must have valid dependencies: a task needs a selected or existing board, for example. Selected changes are validated together and saved once. Paper PDFs are copied locally after acceptance; a selected PDF attachment can also become a bank paper. Proposed highlights must match a literal passage in the actual PDF; their positions are computed from the PDF text and linked into the selected note. Failed downloads, unmatched quotes, missing dependencies or concurrent workspace changes stop that selection from being committed. New pages remain drafts until manually published. No training is launched, no Git branches are created remotely, and no repositories are modified by these records.

Run `npm run test:agent` to check structured proposals, confirmation, partial acceptance, local PDF highlights, linked records, chat isolation and persistence. Model responses are simulated; tests do not spend OpenAI credits.

## Images and documents in research context

Use **Attach images or documents**, drop files onto the Research context panel, or paste clipboard images/files while focused inside it. Ordinary text paste continues to work in the question field. Supported formats: PNG, JPEG, WebP, GIF, PDF, DOCX, PPTX, XLSX, TXT, Markdown, CSV and JSON. Attach up to 10 files, 5 MB each and 20 MB combined. Cards show image previews, filenames, an open/download link and a remove action.

Files are stored under `data/<environment>/attachments/`; context saves only references, so attachments survive navigation and reloads. Production-to-test migration copies them along with the rest of the environment. Removing a card excludes it from the question; it does not delete the underlying stored file. Files are sent to OpenAI when you ask a question: images as image inputs, binary documents as file inputs, and plain text directly. See [OpenAI file inputs](https://developers.openai.com/api/docs/guides/file-inputs). Run `npm run test:attachments` for upload, drop, paste, persistence and request checks without paid API calls.

## Workspace skills

The research assistant shows the selected skill's description. Create, edit and duplicate skills only in **Skills library**, keeping these management controls out of the chat. Define a name, description, category and instructions; the instructions are sent to the assistant with your question. Duplicates have independent IDs. Editing a bundled mode creates a workspace override without modifying its installed agent files. Definitions are saved on the server separately in each environment and survive reloads. Run `npm run test:skills` to verify the editor and persistence without making paid API calls.

## Pages inside pages

Every workspace page can contain its own text and child pages. Use the **+** beside any sidebar page, or **+ Add page** in its published view, to create a blank document or choose a template inside it. Expand the arrow to browse children. Drag a page onto another page to nest it; its descendants move with it. Dropping onto a collection moves the entire page subtree there. Cyclic nesting is blocked.

Opening an existing collection (except Inbox) creates its editable overview document once and keeps its existing pages beneath it. The overview opens in read mode; choose **Edit** to write and publish it. Inbox remains the global list. Existing content and page URLs remain intact. Run `npm run test:nested-pages` to check creation, moves and persistence.

## Scientific figure editor and AI harmonization

Open a diagram in a note, or add one with **+ → Diagram**. The **Research figure · grouped representations** template demonstrates panels, patch grids, token strips, stacked layers and a role legend. Configure grid dimensions and layer/token counts in the properties panel. Use scientific roles for consistent input, frozen, trained, optional and loss colors. Shift-click to select objects, then group, align or distribute them. Moving a group moves its contents.

**Harmonize with AI** opens a conversation with a figure designer. Add instructions, select workspace pages as context, and attach up to four PNG/JPEG/WebP reference images (2 MB each). The server sends this context, the editable scene and a canvas preview to OpenAI. A separate proposal preview lets you refine the result before choosing **Apply proposal**. Applying supports Undo; save the diagram to retain it in the note. Accepted conversation text is retained with the diagram; reference attachments are temporary.

The default model is `gpt-5.5`. The model field accepts another API model ID available to your account, including `gpt-6-astra`; the server default can also be set with `LABBOOK_HARMONIZE_MODEL`. Configure `OPENAI_API_KEY` on the server. Harmonization preserves component identities, labels, dimensions, links, images and connection endpoints; invalid proposals are rejected. Imported artwork retained as an image remains a locked image layer, rather than becoming fully editable shapes.

Run `npm run test:diagram-harmonize` for model/adapter checks and `npm run test:diagram-chat` for the browser flow. These tests simulate OpenAI responses and do not spend API credits.

## Getting started

```bash
npm install
npm start
# Production: http://localhost:4173

npm run start:test
# Test: http://localhost:4175
```

You can also use `npm start -- --test`. The current npm version accepts `npm start --test`, but warns that this syntax will be removed. Use the `--` separator or `npm run start:test`.

Both servers can run simultaneously. The test environment displays a yellow TEST badge. Set PORT to change the port.

Production displays REAL and opens the paper library by default. Its initial curated dataset contains 40 local research PDFs, their 40 reading guides, the official Wan2.2 release reference, and six reading-path notes. Example notes, duplicate test papers, sample boards, and sample tasks have been removed. New workspaces start empty rather than inserting demo data.

## Appearance

Drag the right edge of the navigation sidebar to resize it on desktop. The browser remembers its width. Double-click the edge to reset it, or focus it and use the arrow keys. The phone navigation drawer keeps its own responsive width.

Both light and dark modes use the same semantic color palette across navigation, forms, the editor, task boards, and the paper reader. The theme preference is stored in this browser. Interface icons are local SVGs that inherit theme colors; folder icons and colors can be chosen in the folder dialog. Sidebar counts reflect actual notes.

The one-time production cleanup moves the complete previous environment to data/backups/production-before-cleanup-<timestamp> before activating the curated dataset. The exact backup path and removal counts are recorded in data/production/cleanup-report.json. Nothing is cleaned automatically on startup.

## Production and test data

The application saves its state on the server using a temporary file and an atomic rename:

- `data/production/state.json`: production notes, drafts, versions, folders, tasks, boards, papers, and annotations.
- `data/production/papers/`: production PDF copies identified by SHA-256.
- `data/test/state.json` and `data/test/papers/`: separate test data.

When you first open the updated app, it imports localStorage if there is no server state yet. It also recognizes the original `labbook-state` key. Use the same address and browser as before: localhost and 127.0.0.1 have separate browser storage. Do not clear your browser storage.

After the initial import, the server state is authoritative. localStorage keeps a recovery copy. Changes to notes and attachments are saved as drafts. Save version creates a manual version; Rollback draft restores the latest manual version.

Set LABBOOK_DATA_DIR to use a different data directory. Data is excluded from Git.

## Copy production to test

First open the updated production app to finish the initial import. Then run:

```bash
npm run migrate:test
```

This copies the production database and PDFs to test without changing production. Existing test data is backed up to `data/test.backup-<timestamp>/`. Reload the test app afterward. Avoid editing test data while the copy runs.

To restore a previous test backup, stop the test server, preserve or rename the current test directory, and rename the chosen backup to `test`.

## Direct links and navigation

Pages open in read mode and display the last published version. Choose **Edit**
to work on the autosaved draft; **Publish version** creates a version and updates
the published page. Closing the editor preserves the draft without publishing
it. Existing manual versions serve as published snapshots. A page without any
published version displays an unpublished notice. Explicit editor links use
`/notes/<id>?edit=1`.

Each section has its own URL: /inbox, /research, /skills, /papers, /boards. Notes use /notes/<id>, folders /folders/<id>, individual boards /boards/<id>, and papers /papers/<id>. Deep links survive reloads and browser Back/Forward. Use Copy link in a note's toolbar to copy its address.

## Reading guides and curated library

Add a paper includes an optional Create a simple reading guide checkbox. You can also open a paper and create its guide later. Guides cover the problem, intuition, method, contributions, reported results, limitations, prerequisites, and suggested reading order. They are AI-generated explanations, not a substitute for verifying the original paper.

Guides are generated from locally extracted PDF text using Structured Outputs. Long PDFs use selected excerpts; the source scope and page count are displayed. Unchanged PDFs reuse a cached guide. Refresh reading guide requests a new generation. Set LABBOOK_SUMMARY_MODEL to override the default model.

The production library import is reproducible:

```bash
npm run library:seed
```

This reads the verified arXiv metadata for the curated catalog, downloads PDFs, and generates missing guides. It preserves existing entries and notes, writes an initial backup, and logs completed items or errors in data/production/research-import-report.json. Repeating the command reuses PDFs and guides. It does not seed test; use migrate:test afterward if desired.

Production contains a mix of foundational and recent papers, not an exhaustive ranking of the latest models. Wan2.2 is represented separately by official project documentation, since that release should not be mislabeled as a separate Wan technical paper.

### Bilingual connected reading paths

The repository includes three bilingual guides in `docs/reading-paths/` and the
same guides can be seeded as ordinary Lab Book notes:

```bash
npm run reading-paths:seed       # production and test
npm run reading-paths:seed:test # test only
```

They connect the history of LLM/VLMs (attention, MoE, patchification and
grounding), diffusion (DDPM, latent diffusion, DiT, flow, REPA and video), and
alignment (RLHF/PPO, DPO, GRPO and lower-cost preference methods). The notes
are bilingual and link to primary papers. They are maps for reading, not an
automatic claim that one method is universally state of the art.

### Users and visibility

The research API now supports local workspace identities and explicit sharing.
Entities can carry `visibility: "private" | "workspace" | "shared"`, an
`ownerId`, and optional `sharedWith` metadata. Use `/api/v1/users` to create
identities and `/api/v1/shares` to grant `view` or `edit` access to notes,
folders, boards, papers, experiments or repositories. Existing records remain
workspace-visible until you assign a visibility policy, so the migration is
non-destructive.

For agent integrations, see [agent-api.md](agent-api.md). Example:

```bash
curl -X POST http://localhost:4173/api/v1/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","role":"member"}'
```

The SOTA reviewer can be run manually or installed as a macOS LaunchAgent:

```bash
npm run sota-review          # production
npm run sota-review:test     # test
npm run sota-install         # every 3 days, production
npm run sota-uninstall
```

It uses the configured OpenAI key and web search to find candidates, verifies
arXiv identifiers before adding them, skips papers already in the bank, and
writes a report to `data/<environment>/sota-review-report.json`. X.com is a
lead source only; the reviewer prefers primary paper or official project
sources. The API is not a single magic “deep search” endpoint: the job
combines repeated web discovery with an OpenAI synthesis step.

The interval, enabled state and model are editable in **Settings → SOTA
review**. The LaunchAgent checks the setting daily and runs only when the
configured interval has elapsed; the default is every three days. `gpt-4.1-mini`
is sufficient for discovery and
classification; `gpt-4.1` and a newer model can be selected when needed. The
**Review now** button starts the same job immediately without waiting for the
LaunchAgent.

When a different window or an import updates the server state, stale saves are rejected rather than overwriting the new data. Reload to load the latest revision.

## Paper storage and reader

Notes and Paper Bank use the same picker. Reuse an existing paper or upload a PDF. The server downloads arXiv PDFs and stores local copies. If a download fails, the app displays an error and allows you to retry or upload the PDF.

Modern and legacy arXiv identifiers, versions, abs/pdf/html/format/ps/e-print URLs, query parameters, and .pdf extensions are supported. The app does not resolve arbitrary DOIs to PDFs; upload the file for those sources.

The side-by-side reader uses locally installed PDF.js with no thumbnails. It supports page selection, zoom, and fit to width. Select text and click Highlight to save a region, or Link to note to insert a citation. Annotations reappear when the paper is opened and can be linked or deleted.

## OpenAI

### Research context

Choose sources opens a multi-select workspace picker. Select entire notes, individual paragraphs, entire papers from the bank, or saved highlights. Upload PDF accepts multiple files and saves them in the bank; identical files are reused. Selections persist across sessions and can be removed individually.

When asking a question, the app sends the current text of selected whole notes, the exact selected paragraph excerpts, the full extracted text of selected PDFs with page numbers, and the selected highlight text. Deleted sources produce a visible error. Scanned PDFs without selectable text require OCR or manually provided excerpts. Context above 500,000 characters must be narrowed down.

Include web search is optional when context is selected. Skills provide additional instructions without replacing your question. Answers are prompted to cite source IDs and page numbers.

The server reads OPENAI_API_KEY from its environment or a literal assignment in .zprofile, .zshrc, .bashrc, .bash_profile, or .profile. Web search and AI extraction require an internet connection and a valid key. Shell configuration files are read without executing them.

HTML is not cached. Script and stylesheet URLs include a version. Restart the server after changing server.cjs or runtime.cjs.

## Electron

```bash
npm run desktop
```

Electron uses the same server and APIs on port 4174, independently of the test server. The launcher clears ELECTRON_RUN_AS_NODE. In development, Electron shares the project's production data; the packaged app stores data in Electron's user data directory.

## Verification

```bash
npm run test:runtime
# Temporary servers and isolated data: arXiv, storage, PDFs, ranges, migration, and backups.

# With npm start running:
npm run test:persistence
# Isolated Chromium: attachments, immediate navigation, versions, rollback, reload, and task interactions.

npm run test:reader
# With the test server on 4175: generated PDF, text selection, zoom, highlights, and citations.

npm run test:routes
# Direct section/note/paper links, reloads, and browser Back/Forward.

npm run test:library
# Verifies the 40 curated PDFs, guides, topic filters, and release-reference labeling.

npm run test:appearance
# Both themes, readable text contrast, local SVG icons, editor, dialogs, and sidebar alignment.
```

The persistence regression uses an in-memory browser session and isolated=1 to prevent writes to the production database.
## Research pages, work items and experiments

### Visual research communication

**Skills library → Research stream author** provides a style based on the
supplied research communication example: motivation first, a complete
pipeline with a frozen/trainable legend, design-space tradeoffs, staged
experiment plans, fair baseline comparisons and dated findings linked to runs.
Choose **Create visual stream** for an editable draft scaffold with an SVG
pipeline and plan tables. **Use skill** selects its complete authoring
instructions in the research assistant. Add your notes, papers and evidence
as context; the assistant produces a draft and has no automatic write tools.

The same skill is available to local agents as `$research-stream-author` and
is maintained in `skills/research-stream-author/`. Its Lab Book reference
describes how an agent can update the workspace through the HTTP API while
preserving IDs, run evidence, human edits and published versions. Agent
instructions are available at
`/api/v1/skill?name=research-stream-author&resource=bundle`.

The template starts with explicitly unmeasured results, not the original
example's run data. The example's HTML/PDF and private research results are
not copied into the repository. Publication remains an explicit action.

### A short path from idea to evidence

A page's **Related** area brings together its boards, linked tasks,
experiments and repositories. Research-page experiment filters include child
pages and work on linked boards, and the filter is saved in the URL so it
can be bookmarked or shared. You can log an experiment directly from a page
or a Git branch with its context already selected.

The branch map groups related branches, shows PR state and linked runs, and
links back to research notes. Open a branch's run count to see just those
experiments. The results table links to the relevant page, task, code branch
and logs; hides completely empty machine/cluster columns; and copies the
visible, sorted results as Markdown for reuse in notes or documents.

The app logo is also used as its favicon. No additional workflow entities
or required steps are introduced by these shortcuts.

### Scientific diagram editor

Use editor **+ → Diagram** or **Edit diagram** on an existing
figure. The visual canvas supports blocks, ellipses, decisions, multiline
text, orthogonal arrows, image objects, colors, dashed borders and links to
notes/papers/boards. Drag to move, use the corner handle to resize, edit
properties on the right, duplicate/delete objects, and undo/redo changes.
Templates cover a model pipeline, two-stage training, and frozen/trainable
branches. Export SVG or PNG for papers and engineering documents.

The bottom panel accepts PNG/JPEG/WebP images or SVG figures. Existing SVG
primitives are imported where possible; complex unsupported artwork remains
an image layer. SVG/HTML source editing is retained, including legacy HTML
diagrams. Source can be saved directly; use **Import SVG into canvas** to
apply source edits to the visual scene. Scripts never execute in figures.

**Generate with OpenAI** supports an editable scene or a generated raster
image. Editable scenes use the Responses API with a strict JSON schema;
images use the Images API and become movable image layers. The server reads
the same OpenAI key from the environment / shell profiles as the rest of the
app. Generation only runs after clicking Generate and consumes API credits.
Default models are `gpt-4.1-mini` and `gpt-image-1-mini`, configurable via
`LABBOOK_DIAGRAM_MODEL` and `LABBOOK_DIAGRAM_IMAGE_MODEL`. The endpoint is
`POST /api/diagrams/generate` with `{ "mode": "editable" | "image", "prompt": "…" }`.
See the official [Images API reference](https://developers.openai.com/api/reference/resources/images/methods/generate)
and [structured outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs).

Diagrams save inside the note and retain their editable scene when reopened.
Run `npm run test:diagram-model` and `npm run test:diagram-editor`. OpenAI
tests use simulated responses and do not incur API costs.

### Tasks from a Kanban column

The board workspace uses one navigation bar for **Combined views** and
**Individual boards**, with a view selector and the relevant create/configure
actions. Both modes offer search, project, research stream, tag and task-type
filters. Filters are included in the URL for reload, sharing and browser
navigation; switching boards clears only filters that no longer apply.

Projects follow the top-level page in the existing document hierarchy.
Streams follow the nearest research/board-linked page, including inherited
parent-task links. Tasks with no research page fall back to their source
board; no extra project entities or mandatory metadata are required.

Combined cards use a stable colored border and dot per stream, plus its
name so color is never the only identifier. Click the color legend to filter
a stream. When adding a task from a filtered column, source-board choices
and the suggested research page respect the selected stream. Moving a card
still updates its native source-board status. Verify with
`npm run test:board-workspace`.

Each column ends with **+ Add task**, preselecting that column's native status
and the board's research page. Use the searchable research-page field to link
any note or nested research-stream document. Linked pages appear on task
cards and open directly. Combined views offer a destination board/status
choice and preserve source-board identity. Cancel/Escape creates no placeholder
task. Run `npm run test:column-tasks` to verify these flows.

### Typed experiment columns

Use **Experiments → Columns** (also available in embedded ablation tables)
to add, rename, reorder or hide columns. Reorder with drag and drop or the
arrow buttons. Each field supports continuous numbers, integers, categories,
ordered categories, yes/no, text, dates, URLs or structured values. Numeric
fields can define units, decimal places and optional bounds. Choose whether
higher or lower is better; ordinal fields use their explicit low-to-high
category order. Sorting follows the field type, keeps missing values last,
and highlights the best recorded value within the current view.

Experiment forms use typed fields for metrics and configuration instead of
whole-object JSON inputs. Existing fields are inferred without rewriting
their data; configuration fields are initially hidden in the results table.
You can add fields directly from the experiment form without losing unsaved
values. Renaming a label or hiding a column preserves stored values. An
incompatible type/category change is rejected instead of converting data
silently. Structured values use a dedicated JSON field only when necessary.

`table-schema.js` shares inference, validation, formatting and sorting between
the UI and API. Column definitions live in the `tableSchemas` API collection;
the underlying engine and editor accept other collections as well. Generic
custom fields can be stored under `properties`. The first full UI integration
is Experiments; this does not change the Kanban status columns.

Verify with `npm run test:columns`, `npm run test:column-editor` and
`npm run test:research-api`.

### TEST demo workspace

Start TEST with `npm run start:test`, then run `npm run seed:test` in another
terminal. Open [the demo start page](http://localhost:4175/notes/demo-home).
The seeder checks the server environment and refuses production endpoints.
It preserves existing content, backs up TEST state before adding fixtures,
and can be repeated without duplicating records or overwriting edited demos.
Use `LABBOOK_TEST_URL` for a different TEST address.

The demo includes three research streams with child documents, four boards,
epics/tasks/subtasks, two combined views, eighteen experiments covering all
run states, three mock repositories and fifteen branches with different PR
states. Two fictional local PDFs include highlights and handwritten guides.
The editor playground demonstrates headings, quotes, tables with merged
cells, embedded images, a gallery, clickable HTML/SVG diagrams and multiple
paper references. A separate draft contains two manual versions for rollback.
The assistant starts with note, paragraph, whole-paper and highlight context.
All demo scores, jobs, machines and PRs are explicitly fictional. No OpenAI
calls, real training jobs or remote repository actions are performed.

Run `npm run test:demo` to verify production protection, repeatability,
preservation of edits, entity relationships and local PDF storage using
temporary databases.

The workspace `+` opens a template menu. Choose **Blank page**, **Research
stream**, **Experiment plan**, or **Folder**. A research stream is a normal
editable page with child documents and an optional linked board. Its type is
only an initial template; it has the same URL, autosave and manual versions
as any other note. Use **Pages & boards → + Page** to add nested documents,
or **+ Task board** to link an existing board or create one.

Tasks support epics, tasks and subtasks, parent relationships, tags and a
linked research page. **Task boards → + Combined view** saves a view over
multiple boards. It does not duplicate tasks. Optional column mapping joins
different status names; dragging updates the source board. Ambiguous or
unmapped moves are rejected with an explanation.

**Experiments** records baselines and ablations, configuration, numeric
metrics, training status, machine, cluster and run logs. Click a metric header
to sort in either direction. **Repositories** displays a horizontal branch
tree with PR state and linked training runs. These are reported metadata,
not automatic Git synchronization or a job scheduler.

Editor `+` supports **Ablation results**, **Git branches**, and **HTML / SVG
diagram** blocks. Diagrams preserve their source and support real links to
notes, papers, boards and external URLs, including links on SVG shapes.
Fragment links stay in the diagram. Scripts and event handlers are disabled.
All blocks autosave without requiring a manual version.

Agents can discover the API at `/api/v1/schema` and its documentation at
`/api/v1/docs`; the source documentation is [agent-api.md](agent-api.md).
Set `LABBOOK_AGENT_TOKEN` on the server to require bearer authentication for
the agent API. Reload open browser windows after external writes to load
their revision. Existing stale browser saves are rejected instead of
overwriting agent changes. The reusable skill is
[skills/lab-book-research/SKILL.md](skills/lab-book-research/SKILL.md).

Run `npm run test:workspace` for template, nested page, diagram navigation
and autosave checks. Research API tests use temporary data directories and
never modify the real library.
