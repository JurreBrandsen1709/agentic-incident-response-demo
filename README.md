# Agentic Incident Response — Demo

Backs the "Agentic Incident Response" talk (ISKS 2026). Everything here is
real and runnable except one thing: the Azure Application Insights anomaly
alert, which is simulated by `scripts/simulate-alert.js`. Nothing downstream
of that simulated trigger is faked — no vendor SRE platform, no live Azure
subscription required.

## Use this template

Click "Use this template" on GitHub, or:

```bash
gh repo create <you>/incident-demo-<instance> --public \
  --template JurreBrandsen1709/agentic-incident-response-demo --clone
```

Each generated instance needs its own secrets (not copied by template
generation):

```bash
gh secret set ANTHROPIC_API_KEY --repo <you>/incident-demo-<instance>
gh secret set DEMO_PAT --repo <you>/incident-demo-<instance>
```

`DEMO_PAT` is a fine-grained personal access token scoped to that repo only,
with Contents/Issues/Pull requests set to Read and write. It's required
because GitHub Actions does not start new workflow runs for events triggered
by the default `GITHUB_TOKEN` (except `workflow_dispatch` and
`repository_dispatch`) — this repo's pre-triage and seeding steps need to
trigger other workflows, so they use `DEMO_PAT` instead.

Re-apply branch protection on the new instance's `main` (see Task 10, Step 1
in the implementation plan for the exact command) — template generation does
not copy branch protection rules.

## Run it

1. Seed the bug (once per instance):
   ```bash
   gh workflow run seed.yml --repo <you>/incident-demo-<instance>
   ```
   Wait for it to open a PR and report that CI passed, then review the diff
   and merge that PR yourself. There's no formal approval step — GitHub
   blocks a PR author from approving their own PR, and branch protection is
   configured with 0 required approvals for exactly that reason.

2. Trigger the incident:
   ```bash
   gh workflow run nightly-job.yml --repo <you>/incident-demo-<instance>
   ```
   This runs the (now-buggy) reconciliation job against a batch fixture
   where every record shares one timestamp on the window's boundary,
   observes `records_processed: 0`, and fires a simulated anomaly alert.

3. Watch: a curated Issue appears, labeled `incident:triage-ready`. The
   agent (`claude-code-action`) picks it up automatically — no human clicks
   "assign" — investigates, and opens a PR with a root-cause explanation, a
   fix, a new regression test, and a filled-in post-incident review at
   `incident-log/PIR-<date>.md`.

4. Review and merge that PR yourself. Re-run `nightly-job.yml` to confirm
   the job resolves (`records_processed: 5`, not `0`) — the incident is
   closed, not just the PR merged.

## Repository layout

- `app/` — the staged .NET reconciliation job and its tests.
- `docs/adr/` — architecture decision records the pre-triage step can match against.
- `incident-log/` — past incidents (flat keyword-searchable) and the PIR template.
- `.github/agents/incident-responder.md` — the agent's system prompt.
- `.github/workflows/` — `nightly-job.yml`, `pretriage.yml`, `incident-agent.yml`, `seed.yml`, `ci.yml`.
- `scripts/` — `simulate-alert.js`, `pretriage.js`, `seed-bug.js`. No npm dependencies; Node.js built-ins only.
