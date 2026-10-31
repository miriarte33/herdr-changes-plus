# Changes Plus

A Changes panel for the Herdr app. It extends the `reviewer` mod with git working-tree actions. You can right-click a file to revert it, or delete it if it was never committed. A bar above the file list stages or reverts every uncommitted change. A Push button sits next to Commit. Everything from `reviewer` still works: syntax-colored diffs, a scope picker, inline review comments, and sending a review to the space's agent.

## Install

Copy `mods/changes-plus/` to `~/.config/herdr-app/mods/`. Then point a layout's Changes block at it:

```json
{ "id": "changes", "type": "block", "content": { "mod": "changes-plus" } }
```

Shipped layouts are read-only, so clone one first: `herdr-app do layout.clone '{"name":"main","as":"mine"}'`.

## What you see

- **Header:** "Changes", the file count, the scope picker (Uncommitted / Last commit / vs base branch), the total +/− counts, and Ask about diff or Submit review.
- **Uncommitted bar** (shown only when the working tree has changes): "Uncommitted · N files · M staged", then Stage all and Revert all… (red).
- **File list:** a status letter, the path, a green "staged" or "part staged" pill, a comment bubble, and +/− counts.
- **Diff:** as in `reviewer`.
- **Bottom bar:** commit message input, Commit, and Push. Push shows `Push ↑N` when there are unpushed commits.

## How it behaves

- **Right-click a file row:** opens a popup at the pointer.
  - A file with uncommitted changes shows "Revert changes…". A file that isn't in HEAD (untracked, or staged as new) shows "Delete file…".
  - A file with no uncommitted changes (possible in the Last commit and vs base scopes) shows "No uncommitted changes".
  - Choosing an item opens a confirm dialog. Enter confirms and Esc cancels.
- **Revert changes:** `git restore --source=HEAD --staged --worktree -- <path>`.
- **Delete file:** an untracked file runs `git clean -f -- <path>`; a file staged as new runs `git rm -f -- <path>`.
- **Stage all:** `git add -A`. It is disabled when everything is fully staged.
- **Revert all…:** a confirm dialog says how many tracked files it resets and how many new files it deletes. It then runs `git reset --hard HEAD` and `git clean -fd`. Ignored files are left alone. It is disabled in a repo with no commits.
- **Commit:** `git add -A` then `git commit -m <message>`, as in `reviewer`.
- **Push:** runs `git push` when the branch has an upstream. Otherwise it runs `git push -u <remote> HEAD`, using `origin` or the first remote. It is disabled when the branch is up to date, when HEAD is detached, or when there is no remote. The tooltip says why.
- Git errors show in red under the file list, or as an error toast for actions started from the overlays.

## Built from

- A clone of `reviewer` (itself a clone of the shipped `changes`), made with `mod.clone`.
- `git.js`: the git commands, all run with `--literal-pathspecs` so paths such as `:odd.txt` are taken literally.
- `menu.js`: the file popup and both confirm dialogs. They are copies of this mod opened with `openOverlay`, told apart by `props().menu`, `props().revertFile` or `props().revertAll`.
- After a change, the overlays set the shared key `changes-plus.changed` and the panel refreshes, including for remote spaces where the folder isn't watched.
- Draft comments, the scope and sent reviews use `reviewer`'s shared keys (`reviewer.drafts`, `reviewer.scope`, `reviewer.sent`), so drafts move between the two mods.

## Watch out

- The background refresh runs `git --no-optional-locks status`. Without that flag, `git status` can write `.git/index`, which wakes `watchFolder` while a refresh is running. If that refresh then queues another, the panel reloads forever. Only user actions queue a follow-up refresh.
- Buttons must not be disabled while a background refresh runs. Refreshes are frequent and Commit would look stuck.
- `exec` has a 30 s limit and no TTY. A push that prompts for credentials, or takes longer than 30 s, fails.

## Done when

- `herdr-app check mods/changes-plus` passes.
- Right-click a modified file, choose Revert changes…, and confirm: the file matches HEAD and leaves the list.
- Right-click an untracked file, choose Delete file…, and confirm: the file is gone from disk.
- Stage all makes every row show "staged".
- Revert all… with modified, staged and new files leaves `git status` clean.
- After a commit, Push shows `↑1`. Pressing it pushes, and the button goes back to a greyed-out "Push".
