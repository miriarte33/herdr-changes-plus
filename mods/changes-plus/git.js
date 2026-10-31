// Working-tree actions for the Changes panel. `xy` is a path's two-letter
// `git status --porcelain` code; null means it has no uncommitted change.
import { exec } from "herdr";

export const CHANGED = "changes-plus.changed";

async function git(root, on, args) {
  const r = await exec("git", ["--literal-pathspecs", ...args], { cwd: root, on });
  if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim() || `git ${args[0]} failed`);
  return r.stdout;
}

/** A path that HEAD doesn't have: reverting it deletes it. */
export const isNew = (xy) => xy === "??" || xy?.[0] === "A";

export function revertFile({ root, on, path, xy }) {
  if (xy === "??") return git(root, on, ["clean", "-f", "-q", "--", path]);
  if (xy[0] === "A") return git(root, on, ["rm", "-f", "-q", "--", path]);
  return git(root, on, ["restore", "--source=HEAD", "--staged", "--worktree", "--", path]);
}

export async function revertAll({ root, on }) {
  await git(root, on, ["reset", "--hard", "-q", "HEAD"]);
  await git(root, on, ["clean", "-f", "-d", "-q"]);
}

export const stageAll = ({ root, on }) => git(root, on, ["add", "-A"]);

export const push = ({ root, on, upstream, remote }) =>
  git(root, on, upstream ? ["push"] : ["push", "-u", remote, "HEAD"]);

/** What a push would do: the upstream (null if none), commits ahead of it, and the remote a first push goes to. */
export async function pushInfo({ root, on }) {
  const out = async (args) => { const r = await exec("git", args, { cwd: root, on }); return r.code === 0 ? r.stdout.trim() : null; };
  const branch = await out(["symbolic-ref", "-q", "--short", "HEAD"]);
  if (!branch) return null;
  const upstream = await out(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
  const ahead = upstream ? Number(await out(["rev-list", "--count", "@{u}..HEAD"])) || 0 : null;
  const remotes = (await out(["remote"]))?.split("\n").filter(Boolean) ?? [];
  const remote = remotes.includes("origin") ? "origin" : remotes[0] ?? null;
  return { branch, upstream, ahead, remote };
}
