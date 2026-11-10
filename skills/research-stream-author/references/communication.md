# Communication pattern extracted from the supplied example

The source bundle contained a two-page communication essay, the Proto
Patchifier HTML page and its authoring guide. The HTML stored 129 runs in
one structured dataset, along with batches, backbones and dated findings.
Those project-specific measurements are not included in this skill.

## What makes it effective

The opening paragraph says what the component produces, what consumes it,
and which pretrained component is reused. The motivation contrasts feeding
all layers as independent images with showing only a composite, then names
the information and token-budget gap. This makes the design constraints
visible before introducing the implementation.

The pipeline uses input examples, patch grids, modules, token groups,
training-only decoders and losses. Its legend distinguishes frozen, trained,
optional and training-only pieces. Explanations of hidden-token construction,
grid choices and query variants are behind clickable details so the main
flow remains readable.

The design-space comparison shows token counts against the naive baseline
with budget tabs and a counting-method footnote. A chart should specify what
was counted, the dataset/sample count, aggregation and exclusions. A smaller
token count alone is not evidence of equal quality or lower total cost.

The protocol precedes results. Its plan table records stage, question,
candidate settings, baseline, supporting runs, status and progress. Results
can be filtered by backbone, scheme, budget, metric and evaluation set.
Baselines appear in the same comparison. Uncertainty and split definitions
remain available next to the numbers rather than buried elsewhere.

The conclusion log links each dated interpretation to its run IDs. Superseded
conclusions remain part of the record. The page's section navigation and
shareable filtered URLs support both a first read and later targeted review.

## Useful structures

Plan table:

| Stage | Research question | Variable and candidates | Controls/budget | Baseline | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Calibration | How noisy is this measurement? | Seeds, supplied by project | Matched protocol | Baseline run | Run links when available | Planned |
| Ablation | Does the component help? | One controlled change | Matched protocol | Calibration winner | Run links when available | Planned |
| Retuning | Is the gap due to optimization? | Nuisance settings | Equal tuning allowance | Retuned baseline | Run links when available | Planned |
| Final check | Does the conclusion survive? | Finalists | Full budget; repeated seeds | Fair baseline | Held-out evaluation | Planned |

Finding structure:

```json
{
  "id": "finding-stable-id",
  "date": "date of the actual observation",
  "claim": "A narrow claim supported by the comparison",
  "runIds": ["actual-run-id", "actual-baseline-id"],
  "evaluationSet": "actual split",
  "budget": "actual matched budget",
  "uncertainty": "measured interval or not yet measured",
  "limitation": "what this comparison does not establish",
  "nextAction": "the next decision or experiment",
  "supersedes": null
}
```

In a small project these may be a native table and dated headings. Keep the
information model consistent without requiring a particular frontend.

## Practical language

Use the user's working language, explaining uncommon acronyms once. Prefer
short sentences and concrete labels. Preserve equations, units and tensor
notation where they clarify a mechanism. Bilingual documents should give
equivalent information in each language; avoid translating only headings.

Do not copy this example's conclusions, seed counts, budgets or thresholds
into another research stream. They are choices for that project.
