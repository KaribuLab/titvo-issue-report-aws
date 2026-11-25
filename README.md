# Security report

Findings optionally carry `acceptance: { reason, accepted_by, expires_on }` (strings).
The upstream deterministic repository policy supplies this metadata; the renderer
neither authorizes acceptance nor validates expiry. `accepted_by` is a declared
responsible party, not an authenticated approver. Repository review governs trust.

Accepted findings retain their original evidence and severity. When acceptance is
present, the report additionally shows active and accepted counts; severity counts
and total counts still include every finding. New acceptance text uses Mustache
escaping. Without acceptance, rendering remains unchanged.

## Draft an exception from HTML

Eligible active findings include a selectable YAML draft—not approval. The shared
HTML report is also available from GitHub and Bitbucket report links; provider
messages are unchanged. No clipboard button or additional JavaScript is required.

1. Verify the exact path, line, and category against the repository revision.
2. Complete all three null fields: `reason`, `accepted_by` (declared responsible
   party), and `expires_on` (quoted `YYYY-MM-DD`). Unedited drafts fail validation.
3. Submit the root `.titvoignore.yml` through Git review before use. For an existing
   file, merge the entry under its `exceptions` list; never append duplicate root keys.

Drafts require an actual nonempty category (not the placeholder `Unknown`), an
exact repository-relative POSIX path, and a positive safe-integer line. Missing or
invalid selectors and accepted findings have no draft. Coordinates are never
trimmed, guessed from finding type, or stripped of storage/revision prefixes.
Original evidence, severity, counts, and existing acceptance details are unchanged.

Run `npm test` and `./node_modules/.bin/tsc --noEmit --incremental false`.
