---
name: Primary wedding record
description: Keeps the single active wedding profile deterministic despite legacy seed duplicates.
---

When accessing the active wedding profile, always order records by ID and use the earliest row rather than relying on an unordered `LIMIT 1`.

**Why:** Early simultaneous seed requests could create more than one demo wedding record. PostgreSQL does not guarantee which row an unordered query returns, so reads and edits could target different profiles.

**How to apply:** Any single-wedding read or update should use the deterministic primary-record selection. Do not silently delete duplicate rows without the user's explicit consent.