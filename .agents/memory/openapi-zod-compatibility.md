---
name: OpenAPI Zod compatibility
description: Contract conventions required by the current OpenAPI generator and validation package versions.
---

Avoid OpenAPI `integer` and `format: email` declarations in this workspace's generated API schemas; use compatible `number` fields and an explicit email pattern instead. Keep calendar-only dates as pattern-validated strings, not `format: date`.

**Why:** The generator emits Zod 4-only shorthand helpers for integer and email declarations, while the workspace validation package currently resolves Zod 3. `format: date` becomes a coerced JavaScript `Date`, which serializes across timezones and can shift an entered calendar day.

**How to apply:** When adding or changing API contracts, regenerate immediately and prefer the compatible schema vocabulary unless the validation dependency is upgraded together. Store and return calendar dates as `YYYY-MM-DD` strings; reserve timestamps for moments in time.