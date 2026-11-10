# Figure and table language

Read when authoring figures or comparison tables. These observations come
from inspecting the supplied Proto Patchifier page visually and reading its
SVG/CSS, rather than inferring style from section headings alone.

## Figures

Use a quiet canvas, fine borders, generous space between stages and compact
labels. A framework figure can contain nested groups: inputs at the top,
shared preprocessing, the proposed module, a grouped output set, then the
training-only decoder and losses. Group outlines communicate hierarchy;
arrows explain the flow. Put arrow labels on clear space, away from labels.

Use explanatory miniatures inside cards: patch grids, sparse highlighted
cells, stacked RGBA layers with checkerboard transparency, token strips or
dimensioned volumes. These should explain what the representation means,
not merely decorate a rectangle. Use actual input images only when supplied.

Keep semantic colors consistent between the framework, legends, charts,
variant chips and tables. An adaptable palette inspired by the reference:

| Meaning | Visual encoding |
| --- | --- |
| Given input / preserved composite | green border or strip |
| Trainable module / learned grid | blue accent, solid border |
| Sparse / optional content | amber accent; label optional |
| Frozen module | neutral dashed outline; label frozen |
| Training-only loss/path | orange dashed path; label training only |
| Structural metadata / layer keys | neutral tokens |

Color is supplementary to names, outlines and the legend. Use neutral main
arrows, thinner than module outlines, and dashed colored loss paths. Keep
font sizes readable relative to the final export size. Use a two-level label
hierarchy: component name above a smaller explanation or shape notation.

Keep the main diagram uncluttered. Link an information marker/card to a
details block or explainer note. Offer a larger figure view where supported.
Do not put shadows, gradients or decorative icons on every module. Export
with an explicit background and text colors so the figure survives sharing.
The bundled framework.svg is a schematic vocabulary sample, not an asserted
architecture for the user's project.

## Tables

Prefer a single outer border, thin horizontal rules and a quiet header over
a full heavy cell grid. Group experiments by stage or batch with a tinted
group row, a short phase label and an optional colored left edge. Indent
ablations under their stage. Keep column widths proportional to content.

Use a short bold name with a muted explanatory line beneath it. Highlight
the actual baseline setting in bold; distinguish changed hyperparameters
with a compact chip. Use monospaced/tabular numerals for metrics, deltas,
budgets and run counts. Keep metric columns aligned and label units and
optimization direction in the header.

Separate the absolute metric from the delta versus a named baseline. Use
green/orange with explicit +/- and a neutral treatment when differences
are within measured uncertainty. Positive is not automatically good: apply
the metric objective direction. Missing measurements display an em dash
or 'Not measured', never a fabricated zero.

Use small readable status pills for planned/queued/training/completed/failed;
show progress only when measured. Add run links or IDs next to the evidence.
An expandable detail can hold configurations, per-split metrics and intervals.
Do not hide essential split/budget information behind hover alone: phone
and keyboard users must be able to read it.

State how the representative row was selected. Keep the full run record
available. Selection on validation and reporting on held-out data are
different operations. A dense table can remain readable through grouping,
hierarchy and alignment rather than deleting provenance.

## Theme and responsive behavior

The app provides .research-report-table inside .research-table-scroll,
.research-stage rows, .research-cell-note, .research-number and
.research-status[data-status]. Use those classes in Lab Book authored HTML.
Standalone reports need their own semantic theme variables and CSS.
Keep tables horizontally scrollable on narrow screens. Keep captions,
legends and uncertainty definitions outside the scrolling grid when possible.
The app template never includes the reference project's measured results.
