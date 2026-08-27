---
name: GitHub mirror safety
description: How to verify external repository snapshots and avoid corruption or connector write throttling.
---

Treat an external GitHub snapshot as untrusted until normal paths resolve and its remote tree hash matches the local tree. Keep connector-based pushes atomic and minimize write requests by reusing content-addressed blobs.

**Why:** One API sync created paths with hidden carriage returns even though branch reads and file counts looked plausible. A later per-file sync triggered HTML 403 responses after repeated connector writes, while a compact tree/commit/ref update succeeded.

**How to apply:** Inspect a known root file and recursive paths before updating a branch. Build the complete tree before moving any ref, reuse existing blob hashes, and avoid per-file commit loops. Across sandbox boundaries, avoid NUL/tab-delimited Git output, trim carriage returns, and base64-encode file contents. Afterward, fetch the branch and compare local and remote tree hashes. On HTML 403/429 responses, stop without advancing the ref and retry with fewer atomic writes.