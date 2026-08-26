---
name: GitHub mirror path corruption
description: How to verify and safely repair the project’s external GitHub snapshot when API-created paths contain hidden carriage returns.
---

Treat the external GitHub snapshot as corrupt if recursive tree entries end in carriage-return characters or the contents API cannot find normal paths such as `package.json`, even when the branch and file counts look plausible.

**Why:** A previous API-based repository sync created tracked paths with hidden carriage returns. Branch reads continued to work, but normal file lookups failed. The connected GitHub account also lacks repository-admin permission for deletion, and later content-bearing Git Data writes were rejected by the connector while read and ref requests remained healthy.

**How to apply:** Before any future sync, verify a known root file through the contents API and inspect recursive tree paths for hidden suffixes. If deletion is unavailable, create a new repository rather than mutating the damaged one. Build a clean tree from exact local bytes, verify every path, then create both target refs. If content writes return HTML 403/429 responses, stop without moving refs and retry through a properly authenticated Git remote or after the connector write block is resolved.