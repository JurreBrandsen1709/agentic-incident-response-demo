#!/usr/bin/env node
// Stop hook: before the incident-responder agent finishes, checks that a
// committed code fix is backed by a regression test AND a PIR FILE (not
// PR-description text -- both must be real files in the diff). Blocks with a
// reason (Claude keeps working) rather than failing the job. An explicit
// "OVERRIDE: <reason>" line in the final message bypasses this, for the rare
// case where a test or PIR genuinely isn't warranted (e.g. coverage for this
// exact regression already exists -- name it explicitly in the override).

const { execSync } = require("child_process");

function readStdin() {
  const chunks = [];
  process.stdin.on("data", (c) => chunks.push(c));
  return new Promise((resolve) => {
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function changedFiles() {
  try {
    execSync("git fetch origin main --depth=50", { stdio: "ignore" });
  } catch {
    // best effort; the diff below still works if origin/main is already known
  }
  try {
    const out = execSync("git diff --name-only origin/main...HEAD", { encoding: "utf8" });
    return out.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

async function main() {
  const raw = await readStdin();
  let input = {};
  try {
    input = JSON.parse(raw);
  } catch {
    // malformed input -- fail open, don't block on our own parsing error
  }

  const lastMessage = input.last_assistant_message || "";
  if (/OVERRIDE:/i.test(lastMessage)) {
    process.exit(0);
  }

  const files = changedFiles();
  const codeChanged = files.some((f) => /^app\/src\/.*\.cs$/.test(f));
  if (!codeChanged) {
    // No fix committed yet -- investigation may still be in progress.
    process.exit(0);
  }

  const testsChanged = files.some((f) => /^app\/tests\/.*\.cs$/.test(f));
  const pirAdded = files.some((f) => /^incident-log\/PIR-.*\.md$/.test(f));

  if (testsChanged && pirAdded) {
    process.exit(0);
  }

  const missing = [];
  if (!testsChanged) {
    missing.push(
      "a new test under app/tests/ (via the Edit or Write tool -- add a [Fact] that " +
        "fails against the old, buggy code and passes against your fix)"
    );
  }
  if (!pirAdded) {
    missing.push(
      "a PIR file (call the Write tool with file_path set to exactly " +
        "incident-log/PIR-<today's date>.md and content based on incident-log/PIR-template.md " +
        "-- a PR description section is not a substitute, it must be a real file in the diff)"
    );
  }

  console.log(
    JSON.stringify({
      decision: "block",
      reason:
        `Your branch changes app/src/ but is still missing ${missing.join(" and ")}. ` +
        'If either genuinely isn\'t needed -- for example, an existing test by a specific ' +
        'name already fails against this exact regression -- explain why and include the ' +
        'literal line "OVERRIDE: <reason>" in your final message.',
    })
  );
}

main();
