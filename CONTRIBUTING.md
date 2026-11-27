# Contributing to Lab Book

Bug fixes, documentation and improvements to research workflows are welcome. For a bug, open a [GitHub issue](https://github.com/adriaciurana/lab-book/issues) with the steps to reproduce it, the expected and actual behavior, and your OS, browser or Electron version. Use demo data in screenshots and follow [SECURITY.md](SECURITY.md) for security reports.

## Set up a development workspace

Use Node.js 22 or newer. From the repository root, install the locked dependencies and start the TEST server with a separate data directory:

```sh
npm ci
LABBOOK_DATA_DIR="$(mktemp -d)" npm run start:test
```

Keep that terminal open. From the repository root in a second terminal, run `npm run seed:test` to load the fictional research projects, then open the [demo workspace](http://localhost:4175/notes/showcase-start). The seed script checks that it is talking to a TEST server. Use the same `LABBOOK_DATA_DIR` for the seed command if you want its backup files in the temporary directory too.

## Find the code

| Area | Location |
| --- | --- |
| Browser UI, styles and assets | [src/client](src/client) |
| HTTP routes, storage and integrations | [src/server](src/server) |
| Models and validation used by the browser and server | [src/shared](src/shared) |
| Desktop entry point | [src/electron](src/electron) |
| Automated tests and demo fixtures | [tests](tests) and [src/server/showcase-fixtures.cjs](src/server/showcase-fixtures.cjs) |

## Verify your changes

Run `npm test` for the core suite or `npm run test:coverage` to run it with coverage, as CI does. Use `npm run` to list the available feature checks. For demo data changes, run `npm run test:demo`. For an editor change, run `npm run test:diagram-editor` with the TEST server running on port 4175. For the seeded workspace, run `npm run test:demo-browser`.

For UI changes, check both themes and a narrow viewport. Try the affected flow with an empty workspace and with demo data when both states apply. For storage or editing changes, verify that existing records still load and that changes survive a reload. Keep automated checks independent of real research data and paid API calls.

## Open a pull request

1. Branch from `main` and keep the change focused. Update the README or [user guide](docs/user-guide.md) if the workflow changes.
2. Describe what users will see, how you verified it, and any limitations. Link the related issue if there is one. Include a screenshot or recording for visible changes.
3. Review the diff for credentials, local configuration, personal PDFs and workspace data. Use fictional examples in fixtures and screenshots.

Lab Book is licensed under the [MIT License](LICENSE).


### Credentials and local files

Keep API keys, OAuth tokens, workspace data, and private certificates in local configuration or your secret store. Use dummy values in examples and test fixtures. Before publishing, review the staged diff and run a redacted secret scan with `gitleaks git --redact=100`. The LAN deployment script takes its SSH destination from `LABBOOK_DEPLOY_TARGET` and publishes the committed Git tree.
