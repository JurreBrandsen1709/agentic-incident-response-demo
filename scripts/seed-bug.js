#!/usr/bin/env node
// Seeds this repo instance with the incident this demo is built around:
// a real, merged PR that changes an inclusive boundary comparison to an
// exclusive one, disguised behind a boring commit message. Run once per
// freshly generated template instance.

const { execSync } = require("child_process");
const fs = require("fs");

const FILE = "app/src/ReconciliationJob/RecordStore.cs";
const BRANCH = "seed/boundary-refactor";
const OLD_LINE = "r.TimestampUtc >= fromUtc && r.TimestampUtc <= toUtc";
const NEW_LINE = "r.TimestampUtc >= fromUtc && r.TimestampUtc < toUtc";

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function applyBugChange() {
  const content = fs.readFileSync(FILE, "utf8");
  if (!content.includes(OLD_LINE)) {
    throw new Error(`Expected line not found in ${FILE}. Has the file already been seeded or changed?`);
  }
  fs.writeFileSync(FILE, content.replace(OLD_LINE, NEW_LINE));
}

async function openPullRequest(repo, token) {
  const response = await fetch(`https://api.github.com/repos/${repo}/pulls`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      title: "refactor: clean up date formatting for the report header",
      head: BRANCH,
      base: "main",
      body: "Small cleanup pass through the reconciliation job's date handling. No behavior change intended.",
    }),
  });

  if (response.status !== 201) {
    throw new Error(`Failed to open PR: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function waitForChecks(repo, token, sha, attempts = 20, delayMs = 15000) {
  for (let i = 0; i < attempts; i++) {
    const response = await fetch(`https://api.github.com/repos/${repo}/commits/${sha}/check-runs`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    const { check_runs } = await response.json();

    if (check_runs.length === 0) {
      console.log(`No check runs reported yet (attempt ${i + 1}/${attempts})`);
    } else {
      const allCompleted = check_runs.every((c) => c.status === "completed");
      console.log(`Check runs: ${check_runs.map((c) => `${c.name}=${c.status}/${c.conclusion}`).join(", ")}`);
      if (allCompleted) {
        return check_runs.every((c) => c.conclusion === "success");
      }
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;

  if (!repo || !token) {
    console.error("GITHUB_REPOSITORY and GITHUB_TOKEN must be set.");
    process.exit(1);
  }

  run(`git checkout -b ${BRANCH}`);
  applyBugChange();
  run(`git add ${FILE}`);
  run(`git commit -m "refactor: clean up date formatting for the report header"`);
  run(`git push origin ${BRANCH}`);

  const sha = execSync(`git rev-parse ${BRANCH}`, { encoding: "utf8" }).trim();
  const pr = await openPullRequest(repo, token);
  console.log(`Opened PR #${pr.number}: ${pr.html_url}`);

  const passed = await waitForChecks(repo, token, sha);
  if (!passed) {
    console.error("CI did not pass — resolve this before approving/merging the seed PR.");
    process.exit(1);
  }

  console.log(
    `CI passed. Review PR #${pr.number} yourself, then merge it before running the rest of the demo: ${pr.html_url}. ` +
      `No formal approval step — GitHub blocks a PR author from approving their own PR, and branch protection is configured with 0 required approvals for exactly that reason.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
