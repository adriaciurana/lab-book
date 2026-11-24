![Lab Book — Connect papers, ideas and experiments](docs/images/hero.svg)

# Lab Book

A local research workspace that connects papers, annotated PDFs, nested notes, task boards and experiments. Use it in your browser or as an Electron desktop app. Your workspace stays in local files; optional AI features send selected context to OpenAI.

## Get started

Requires **Node.js 22+**, npm and macOS or Linux for the shell launchers. Windows users can use the npm commands directly.

```sh
git clone https://github.com/adriaciurana/lab-book.git
cd lab-book
./install.sh
./run_server.sh
```

Open **http://localhost:4173**. No API key is required for notes, papers, boards or experiment records. Set `OPENAI_API_KEY` in the process environment to use the assistant and literature discovery. Requests can incur API charges.

```sh
./run_electron.sh          # desktop app, built-in server on port 4174
./run_server.sh --test    # separate TEST workspace on port 4175
./run_server.sh --mdns    # advertise an HTTP service on your local network
```

`--mdns` requires `dns-sd` on macOS or `avahi-publish-service` from avahi-utils on Linux. It binds to all interfaces by default. Discover the advertised service using your network's DNS-SD browser; the script does not reserve a custom hostname. Override `HOST` and `PORT` as needed. Localhost is the default without mDNS.

## Your research, connected

- Import papers, read local PDFs, annotate passages and link evidence into notes.
- Write nested research pages with equations, diagrams and versioned drafts.
- Organize boards, tasks, repositories, runs and typed ablation tables.
- Ask the assistant about selected research context and review proposed workspace changes before applying them.
- Expose structured research records through the [agent API](agent-api.md).

See the [full user guide](docs/user-guide.md) for editing, paper management and research workflows.

## Switch environments

The installer creates `labbook.config.json` from [the example](labbook.config.example.json). Register named HTTP(S) addresses there, then click **REAL** or **TEST** in the top bar to choose one. The destination server must already be running. Navigation opens the destination home page; it never copies workspace data. For a desktop destination, register `http://localhost:4174`.

Production and TEST use separate directories under `data/production` and `data/test`. Set `LABBOOK_DATA_DIR` to move the data root. Packaged desktop builds use Electron's user data directory. Back up the entire data root, including attachments and PDFs. Data and local configuration are excluded from Git.

## Scheduled SOTA reviews

The server and desktop app include a lightweight scheduler. In **Settings → SOTA review**, enable reviews, choose an interval (1–365 days) and a model. Automatic reviews are disabled until explicitly enabled. Keep the server running, or minimize the desktop window, for periodic checks. Closing the process stops checks; missed reviews resume on the next start. No OS service installation is needed.

The scheduler checks once a minute, prevents overlapping scheduled runs in that process, retries failed attempts after an hour and records the interval from the last successful review. Run one server per environment. Reviews discover candidates through OpenAI search, retrieve paper metadata and skip existing papers. They add papers to the bank; they do not launch training or independently certify SOTA claims. Reports and configuration are saved under the active environment's data directory.

For an always-on server, supervise `node server.cjs` using your OS service manager with the same data directory and environment variables. Historical `sota-install` scripts are deprecated: remove any old `com.labbook.sota-review` LaunchAgent before relying on the built-in scheduler.

## Configuration and access

| Variable | Purpose |
| --- | --- |
| `PORT`, `HOST` | Browser server address (defaults: 4173, 127.0.0.1) |
| `LABBOOK_DATA_DIR` | Persistent data root |
| `LABBOOK_CONFIG` | Path to environment registry JSON |
| `OPENAI_API_KEY` | Optional server-side AI credentials |
| `LABBOOK_AGENT_TOKEN` | Bearer token for the structured agent API |
| `LABBOOK_SOTA_MODEL` | Override literature review model |

This is a trusted local workspace, not a multi-tenant hosted application. The agent token protects the agent API; it does not authenticate every UI endpoint. Use a VPN or an authenticated reverse proxy before exposing it beyond trusted devices. Do not commit API keys, research data or downloaded papers. Some legacy AI helpers also read exported keys from shell profile files.

## Development and verification

```sh
npm ci
npm test
npm run test:coverage
npm run desktop
npm run package:desktop
```

The default test suite covers isolated server persistence, the research API, typed columns, lifecycle behavior, environment configuration and SOTA scheduling. Coverage uses Node's built-in instrumentation and prints measured results; it is not a claim of full UI coverage. Additional `test:*` scripts exercise Electron browser flows and generally require a running local server. Tests use simulated AI responses and temporary storage.

CI runs the default suite with coverage on Linux. See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution checks and [SECURITY.md](SECURITY.md) for reporting issues. No open-source license has been selected yet; public visibility alone does not grant redistribution rights.
