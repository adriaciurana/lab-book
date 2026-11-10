---
name: research-stream-author
description: Create or maintain visual, evidence-linked research streams with architecture figures, staged experiment plans, comparable run tables and dated findings. Use for research communication or updating a Lab Book workspace from papers, logs or results.
---

# Research stream author

Make the project understandable in five minutes and actionable for the next
experiment. Use the supplied research evidence and the project's working
language. The example that informed this skill is a communication reference,
not evidence for a new project's results.

Read [references/communication.md](references/communication.md) for the
communication pattern and [references/visual-style.md](references/visual-style.md)
for the figure/table vocabulary. When writing to Lab Book, also read
[references/lab-book.md](references/lab-book.md). The optional
[assets/stream.html](assets/stream.html) and
[assets/framework.svg](assets/framework.svg) form a starting point. Insert
the SVG at the template's data-stream-figure placeholder when used standalone.

## Establish the project memory

Read the existing stream, diagrams, experiment protocol, measured runs and
latest findings before making changes. Identify the question, baseline,
proposed change, evidence and next unresolved decision. Reuse existing pages
and experiment IDs. If evidence is missing, record the gap and a planned
comparison instead of filling in a plausible result.

For a new stream, use a short overview page with this reading order, adapting
sections to the project:

1. Title, parent project, date, and what the method does or plugs into.
2. Motivation: the obvious approach, its failure; the cheap alternative, its
   failure; the property the proposed approach should preserve.
3. One end-to-end framework figure, from inputs to outputs and losses.
4. Design space: meaningful variants and their resource/quality tradeoffs.
5. Experiment protocol and staged plan, written before runs are presented.
6. Results, with baselines, budgets, evaluation sets and uncertainty visible.
7. Dated findings linked to run IDs, followed by the next decision.

Prefer a small number of meaningful pages. Keep explanations near the figure
or experiment they describe; use child pages for substantial details.

## Communicate visually

Use a figure for structure, a table for comparisons and a compact chart for
tradeoffs. Use a short sentence when that explains the point more clearly.
Start each section with its takeaway; include a number only when supplied by
evidence. Avoid repeating the same metric in prose, a table and a chart.

The framework figure should distinguish inputs, frozen modules, trained
modules, optional paths, training-only modules and losses with both labels
and a legend. Use named arrows and tensor dimensions when known. Match the
diagram to the implementation: do not invent shapes or training paths.
Keep details behind links, HTML details/summary, or an explainer page.
Link diagram components to actual workspace entities. Make figures legible
on a phone and exportable as SVG.

Mermaid is suitable for high-level flow. Use SVG or native tensor/volume
objects when spatial shape, depth, patch grids or per-layer flow matters.
Keep diagram source alongside the figure when the destination supports it.

## Plan and compare experiments

Separate scientific variables (the hypothesis), nuisance variables (such as
learning rate), and fixed controls (data, budget and evaluation protocol).
Record the baseline explicitly. State the selection metric, dataset/split,
objective direction, resource budget and known noise/uncertainty.

Use stages such as baseline calibration, single-factor ablations, nuisance
retuning, interactions and finalist validation. Start with cheap screening
when appropriate, then compare finalists with matched budgets. A learning
rate found for one architecture need not be optimal for another.

Never promote the example's 1.1 dB or approximately two seed spreads into a
universal significance test. Explain the measured noise and the actual
statistical method. Label a comparison inconclusive when the evidence
cannot distinguish the alternatives.

Runs have stable IDs and include the exact configuration delta, baseline or
parent run, budget, evaluation set, seed, machine/log links when provided,
status and measured metrics. Keep different splits and step budgets
distinct. Missing results remain absent, never zero. Separate planned work
from queued, training, trained, failed or cancelled runs.

An overview may show one representative run per variant, but explain the
selection rule and retain all raw runs. Select on validation, report on the
stated evaluation set, and disclose baseline contamination or budget gaps.
Use metric objectives and units consistently; never compare unlike budgets
or silently average missing evaluation sets.

## Update without rewriting history

Update canonical structured records, then refresh their linked views. Avoid
maintaining manually duplicated result numbers across pages. Append a dated
finding with its supporting runs, comparison, uncertainty, limitation and
next action. If later evidence overturns it, append a superseding finding
that links to the old one. Preserve completed run evidence; corrections
should record provenance rather than silently changing history.

Prefer a narrow update to regenerating an entire stream. Preserve human
annotations, figures, paper references, versions and unrelated records.
Publish only when requested; otherwise maintain the draft and identify it
as such. Creating documentation does not authorize running training jobs.

When finished, check that each claimed result has a source, every internal
link resolves, the figure matches the method, and the next experiment is
clear. Report the changed pages and outstanding evidence gaps.
