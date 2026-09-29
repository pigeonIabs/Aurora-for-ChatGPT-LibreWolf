# Universal development

## Release policy

Keep incremental Universal work on `main`. The next release should collect the larger overhaul. Publishing a tag or release and changing the manifest version require a release request.

The Gecko ID `aurora-for-chatgpt-librewolf@local` is the existing installation identity. Preserve it so users retain preferences and uploaded backgrounds.

## Layout

- `modules/aurora/sites.js` holds the host registry, feature availability, and native theme detection. The popup also reads this registry.
- `modules/aurora/adapters/` holds site routes, app roots, and selectors. The ChatGPT adapter owns its existing selector configuration.
- `modules/aurora/surfaces.js` tags supported surfaces and their background layers for Claude and Gemini.
- `shared.css` holds shared theme variables, background media styles, and quick settings.
- `universal.css` styles adapter surfaces and supplies the small host-specific overrides.
- ChatGPT retains `styles.css`, `new-features.css`, and `app-skin.css` plus its workflow modules.
- `manifest.json` specifies the scripts and styles for each host. Only the matching host entry runs.

## Add a site

Register its exact hostname and feature availability in `sites.js`. Add an adapter with an app root, supported chat routes, and semantic selectors for the composer, editor, sidebar, menus, user messages, history items, avatars, and page planes. Add a matching manifest entry using the shared module sequence and the adapter.

Favor stable custom elements, roles, and data attributes observed on the site. Keep uncertain selectors conservative. Authentication, account, and billing routes should retain their native UI. Use the existing observer's added subtrees for dynamic content and preserve native message submission behavior.

Surface styles apply only while Aurora is enabled. Cleanup removes Aurora tags and restores app stacking properties. Custom font rules preserve the site's icon fonts and code formatting.

New adapters initially share visual settings. Enable workflow features only when their integration is implemented for that site. Update both the capability registry and the manifest when adding a feature.

## Current verification scope

The development package is assembled from the manifest's declared resources. Live Gemini DOM inspection informed its adapter. Claude chat support awaits signed-in manual use. Functional and visual testing belongs to the user's next development pass.
