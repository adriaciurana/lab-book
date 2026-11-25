# README screenshots

Run `npm ci` and `npm run screenshots` on a machine that supports Electron. The capture script starts its own server on a temporary port, creates an isolated TEST data directory, loads synthetic demo fixtures and captures the real interface. It deletes the temporary workspace when finished. No OpenAI requests or personal workspace reads are needed.

Images are saved in `docs/images/screenshots/`:

| Image | What it shows |
| --- | --- |
| `research-workspace.png` | A research page with linked pages and a clickable architecture figure |
| `paper-annotations.png` | An editable note beside a local PDF with an existing highlight |
| `task-boards.png` | A combined board of fictional research tasks |
| `experiment-results.png` | Typed metrics, run states and linked research context |
| `repository-branches.png` | Branch relationships and run metadata in dark theme |
| `environment-switching.png` | Registered destinations and the new environment form |

All papers, scores, repositories, machines and runs in these screenshots are fictional. Demo notes are published only inside the temporary capture workspace so readers can see their contents. The environment form is filled for illustration and is not submitted. Screenshot text and README captions are in English.

After changing the UI, regenerate the images, inspect each one and commit the relevant PNG files with the documentation changes.
