---
name: GitHub connector Git uploads
description: Reliable repository synchronization when connector-proxied Git Data API writes trigger Cloudflare filtering.
---

Connector-proxied GitHub blob writes may be rejected by Cloudflare when an encoded HTML blob contains a literal external script element, even though repository permissions and unrelated blob writes are valid. Prefer a standards-supported build-time HTML transformation that keeps the literal element out of the stored source while preserving normal production bundling.

**Why:** Reauthorization, cooldowns, alternate GitHub write endpoints, harmless byte shifts, and valid script-tag formatting variations did not clear the content-specific rejection. Removing the literal script element did.

**How to apply:** Confirm the block is content-specific by testing an unrelated blob, preserve framework entry discovery through a pre-processing build hook, run a production build, and compare the final remote tree hash with the local committed tree hash before declaring the sync complete.