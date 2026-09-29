# Aurora Universal

A lightweight glass theme extension for ChatGPT, Claude, and Gemini, built from the LibreWolf fork of Aurora for ChatGPT.

Universal development lives on `main`. The published [Aurora 1.8 release](https://github.com/pigeonIabs/aurora-universal/releases/tag/v1.8) contains the ChatGPT overhaul. Development builds retain manifest version 1.8 while the larger Universal update takes shape.

## Current development

One shared engine provides appearance settings, custom backgrounds, glass transparency and blur, automatic light and dark detection, fonts, quick settings, and sidebar privacy styling. Each website loads its own small adapter. ChatGPT keeps its existing workflow modules and current app shell styling.

| Feature | ChatGPT | Claude | Gemini |
| --- | --- | --- | --- |
| Backgrounds and glass surfaces | Supported | Initial adapter | Initial adapter |
| Fonts and appearance settings | Supported | Initial adapter | Initial adapter |
| Sidebar history and avatar blur | Supported | Initial adapter | Initial adapter |
| Focus mode and quick settings | Supported | Initial adapter | Initial adapter |
| Message queue and default model | Supported | Planned | Planned |
| Pattern masking and voice styling | Supported | Planned | Planned |

The popup follows the active supported website and shows its available controls. Appearance preferences are shared between sites. The master toggle restores the site's native appearance. Existing users keep their settings through the original extension ID.

Gemini selectors were mapped against its live composer and navigation in September 2026. Claude uses semantic chat selectors and awaits signed-in validation. Manual use across conversation, project, and mobile layouts remains the next development step.

Runtime code uses plain JavaScript and CSS, with one DOM observer for content changes and separate lightweight theme observation. Streaming updates process added subtrees. Background media pauses in hidden tabs.

## Use a development build

In Firefox or LibreWolf, open `about:debugging#/runtime/this-firefox`, choose `Load Temporary Add-on`, and select `manifest.json` from this checkout. Open ChatGPT, Claude, or Gemini and use the Aurora toolbar button to change settings.

The GitHub XPI uses this fork's local extension ID and targets LibreWolf profiles configured to load unsigned extensions. The published 1.8 XPI is available on the release page.

## Build

Run `python scripts/build_xpi.py --output build/aurora-universal-development.xpi` from the repository root. Python 3.8 and Git are required. The builder packages tracked files and manifest resources with stable ordering, normalized line endings, and fixed ZIP timestamps.

See [DEVELOPMENT.md](DEVELOPMENT.md) for adapter structure and release policy.

## Privacy and permissions

Preferences use browser storage. Uploaded backgrounds stay in local storage, with a 15 MB file limit. `unlimitedStorage` supports these media files. Host access covers `chatgpt.com`, `claude.ai`, `gemini.google.com`, and the optional upstream feedback endpoint.

Feedback is sent only after the user submits it and grants Firefox's optional data permission. See [PRIVACY.md](PRIVACY.md).

## Upstream and license

Based on [TG-TG-TG-TG-TG-TG/Aurora-for-ChatGPT](https://github.com/TG-TG-TG-TG-TG-TG/Aurora-for-ChatGPT). Independently maintained. OpenAI, Anthropic, Google, LibreWolf, and the upstream maintainers retain their own products and trademarks.

MIT. The upstream copyright and permission notice are preserved in [LICENSE](LICENSE).
