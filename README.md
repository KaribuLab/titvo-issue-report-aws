# Security report

Findings optionally carry `acceptance: { reason, accepted_by, expires_on }` (strings).
The upstream deterministic repository policy supplies this metadata; the renderer
neither authorizes acceptance nor validates expiry. `accepted_by` is a declared
responsible party, not an authenticated approver. Repository review governs trust.

Accepted findings retain their original evidence and severity. When acceptance is
present, the report additionally shows active and accepted counts; severity counts
and total counts still include every finding. New acceptance text uses Mustache
escaping. Without acceptance, rendering remains unchanged.

Run `npm test` and `./node_modules/.bin/tsc --noEmit --incremental false`.
