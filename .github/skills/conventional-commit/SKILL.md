---
name: conventional-commit
description: Draft, review, or create Conventional Commits for this repository. Use when asked to prepare a commit message or commit changes.
---

# Conventional Commit workflow

## Inspect before writing

1. Check `git status --short` and inspect the staged diff. If changes are
   unstaged, inspect those too before deciding what belongs in the commit.
2. Do not include unrelated or pre-existing user changes. Never stage
   everything with `git add -A`.
3. If asked only to draft a message, provide the message without creating a
   commit. Create a commit only when explicitly requested.
4. If the intended changes cannot be identified safely, ask before staging or
   committing.

## Message format

Use the Conventional Commits header:

```text
<type>[optional scope][!]: <imperative summary>
```

Common types:

- `feat`: add user-facing functionality.
- `fix`: correct a defect.
- `docs`: documentation-only changes.
- `style`: formatting changes without behavior changes.
- `refactor`: restructure code without changing behavior.
- `perf`: improve performance.
- `test`: add or adjust tests.
- `build`: build system or dependency changes.
- `ci`: continuous integration changes.
- `chore`: maintenance that does not fit another type.

Use a concise, specific summary in the imperative mood, without a trailing
period. Add a short lowercase scope when it makes the change clearer, such as
`fix(server): reject stale seat sockets`.

## Line length and body

- Keep every line in the commit message, including the header and any footer,
  at **72 characters or fewer**.
- Wrap body paragraphs and bullet points at 72 characters. Count the complete
  header, including type and scope, against the same limit.
- Separate the header, body and footer with blank lines.
- Include a body when context is useful. Explain why the change was needed,
  what behavior or design changed, and any important consequences. Use
  specific details rather than repeating the header or listing obvious edits.
- Mention tests or checks only if they were actually run; describe failures
  honestly.
- Add a `BREAKING CHANGE: <description>` footer when the change breaks
  compatibility. Include issue references only when known and relevant; never
  invent them.

## Creating the commit

1. Confirm the staged diff contains only the intended changes.
2. Run `git diff --cached --check` and the focused checks appropriate to the
   changes.
3. Verify that every proposed commit-message line is at most 72 characters
   before committing. For example, pipe the proposed lines into:

   ```sh
   awk 'length($0) > 72 { print NR ":" length($0) ":" $0; failed = 1 } END { exit failed }'
   ```

   For example:

   ```sh
   printf '%s\n' 'feat: add a sample feature' '' 'Explain why it is useful.' |
     awk 'length($0) > 72 { print NR ":" length($0) ":" $0; failed = 1 } END { exit failed }'
   ```
4. Create the commit with the verified header, body and any applicable footer.
5. Report the resulting commit hash and message, plus the checks that were run.
