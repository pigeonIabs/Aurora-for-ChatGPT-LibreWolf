# Development

Aurora uses plain JavaScript and CSS. Each website loads its own adapter and styles through `manifest.json`.

## Build and releases

```sh
python scripts/build_xpi.py --output build/aurora-universal-development.xpi
```

The builder packages tracked source and manifest resources with stable ordering, normalized line endings, and fixed ZIP timestamps. Keep generated XPIs in `build/` and local captures, backups, and installation receipts in `work/`.

Develop on `main`. Create tags and publish releases when requested. Preserve the Gecko ID `aurora-for-chatgpt-librewolf@local` so settings and backgrounds carry forward.

## Source map

| Location | Purpose |
| --- | --- |
| `modules/aurora/sites.js` | Website registry and page capabilities |
| `modules/aurora/adapters/` | Native routes, surfaces, composers, and workflow controls |
| `modules/aurora/material.js` and `glass.js` | Native surface ownership and glass appearance |
| `modules/aurora/central-observer.js` | Shared observation and incremental updates |
| `modules/aurora/interface.js` and `features.css` | Focus, width, and privacy targets |
| `modules/message-queue.js` | Conversation-scoped message queue |
| `modules/aurora/model-preferences.js` | Native model catalogs and per-website preferences |
| `modules/aurora/preferences.js` | Shared defaults |
| `popup.html`, `popup.js`, and `popup.css` | Toolbar settings |
| `assets/fonts/` and `fonts.css` | Bundled fonts and licenses |

## Implementation rules

Glass changes existing native surface fills, tint, border colors, shadows, and backdrop blur. Preserve website shapes, dimensions, spacing, typography, icons, and hit areas. Keep appearance separate from focus and cinema settings.

Use the shared observer and process changed branches incrementally. Discover workflow controls independently of glass surfaces. Scope selectors to known composers and use native send controls.

Queues preserve active drafts and stay within the current conversation. Navigation, cleanup, or disabling the feature clears pending work. Guard against duplicate submissions and pause uncertain sends for an explicit retry.

Page capabilities determine which controls appear in both settings panels. Reading fonts load from the extension package. User data stays in browser storage or page memory as described in [PRIVACY.md](PRIVACY.md).

## Verification

Use focused startup or installation checks when a change needs them. The startup regression is available with `node tests/startup-scope.cjs`. Live interface acceptance belongs to the user's testing pass.
