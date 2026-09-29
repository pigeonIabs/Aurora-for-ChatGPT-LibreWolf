# Universal development

## Release policy

Keep incremental Universal work on `main`. The next release should collect the larger overhaul. Publishing a tag or release and changing the manifest version require a release request.

Preserve the Gecko ID `aurora-for-chatgpt-librewolf@local` so users retain preferences and uploaded backgrounds.

## Integration

- `modules/aurora/sites.js` holds the four-host registry, capability rules, and native theme detection. The popup uses the same registry.
- `modules/aurora/adapters/` holds site routes, app roots, surface selectors, and workflow selectors. Authentication and billing routes on the additional sites retain their native UI.
- `modules/aurora/dom.js` locates visible composers and native send controls. Textareas use their native value setter. Rich editors use browser editing commands and input events.
- `modules/aurora/surfaces.js` tags surfaces on Claude, Gemini, and Grok. `universal.css` supplies their glass treatment and native palette overrides.
- `shared.css` supplies common tokens, backgrounds, quick settings, queue controls, and sensitive draft blur. ChatGPT also uses `styles.css`, `new-features.css`, and `app-skin.css`.
- `modules/message-queue.js` owns queued text in page memory. Prepared sends, acknowledgments, active drafts, and uncertain submissions have distinct states. A new chat's canonical URL can be adopted only while generating and while its first message node remains the same.
- `data-masking.js` owns reversible visual masking. Its scheduled scans use cancellation revisions and the orchestrator's current settings and route. Editable values stay native.
- `modules/aurora/model-preferences.js` reads the additional sites' native model menus and applies exact label preferences to new chats. Catalogs are bounded to 32 labels per site. User interaction cancels an automatic picker operation.
- `modules/aurora/default-model.js` retains ChatGPT's model and reasoning integration with route, visibility, preference, and interaction guards.
- `modules/aurora/orchestrator.js` owns settings, navigation, visibility, and module cleanup. The central observer filters Aurora's own UI updates and follows body replacement.
- `manifest.json` declares matching scripts and styles for all four hosts. Each website loads only its own adapter.

## Settings

Appearance and privacy controls remain shared. `disabledSites` records per-site enable preferences. `siteDefaultModels` holds model labels for Claude, Gemini, and Grok. ChatGPT retains `defaultModel`. Local `modelCatalog:<site>` entries hold native picker labels.

The master switch changes only the enable preference. Existing backups from the previous toggle implementation are recovered once. The popup supports active-site detection, explicit site selection, settings search, keyboard-accessible choices, and import/export.

## Verification scope

The workflow changes receive focused critical checks for draft preservation, chat changes, duplicate-send prevention, failed editor writes, disabling, URL canonicalization, and masking restoration. Syntax checks and manifest-resource validation cover the packaged scripts.

Live DOM inspection informed Gemini's desktop and mobile composer selectors and Grok's composer, picker, and palette. Claude uses semantic chat selectors. The Claude page available in the development browser redirected to its login view, so its chat selectors still require live user verification. Functional and visual use across account-specific layouts belongs to the user's testing pass.

Keep selectors scoped to known composers. Preserve native handlers and account restrictions. Avoid document-wide send fallbacks or continuous full-page scans. Cleanup removes owned tags, cancels pending workflow operations, and restores app stacking properties.
