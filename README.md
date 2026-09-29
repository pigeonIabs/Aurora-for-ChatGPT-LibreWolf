# Aurora for ChatGPT LibreWolf

Unofficial LibreWolf focused fork of Aurora for ChatGPT.

This build keeps the glass theme engine, custom backgrounds, privacy controls, streamer mode, default model picker, queue while generating, audio haptics, custom fonts, and quick settings.

Seasonal Christmas and New Year theme code has been removed.

This project is independently maintained and is not affiliated with OpenAI, LibreWolf, or the upstream Aurora maintainers.

## Version 1.8

[Aurora 1.8](https://github.com/pigeonIabs/Aurora-for-ChatGPT-LibreWolf/releases/tag/v1.8) is the complete overhaul for the redesigned ChatGPT interface and Codex Cloud.

- Restores glass across the prompt bar, navigation, menus, settings, writing blocks, and code blocks.
- Separates glass transparency from blur and improves the light theme alongside Dark Reader.
- Updates model selection, queued replies, quick settings, and privacy masking for the new editor.
- Preserves the dotted message border in temporary chats and keeps the top bar seamless.
- Gives the prompt bar's voice button matching glass styling and theme colors.

The release includes the complete source and a LibreWolf XPI. The GitHub package uses this fork's local extension ID and is intended for LibreWolf profiles configured to load unsigned extensions.

## Install

Install the signed release from Firefox Add-ons, then open `https://chatgpt.com`.

For local development, open `about:debugging#/runtime/this-firefox`, choose `Load Temporary Add-on`, and select `manifest.json`.

## Build XPI

Requires Python 3.8 and Git. From the repository root, run `python scripts/build_xpi.py`. It packages tracked files and manifest resources with stable ordering, normalized text line endings, and fixed ZIP timestamps. The XPI is written under `build/` using the version in `manifest.json`.

## LibreWolf Changes

- Manifest V3 background registration now includes Firefox event page scripts.
- A Gecko extension id is included for Firefox and LibreWolf builds.
- ChatGPT and feedback host permissions are declared explicitly.
- Holiday UI, content module, styles, strings, and media assets were removed.
- The Grok Horizon preset path now points at the packaged `assets/grok-4.webp`.

## Main Features

- Glassmorphism theme with clear and dimmed styles.
- Custom image and video backgrounds with a dedicated Firefox-safe upload page and local file storage.
- Pure Black OLED background preset.
- Glass styling for fenced code and copyable writing blocks.
- Privacy suite with data masking, streamer mode, and avatar blur.
- Focus mode, upgrade element hiding, and GPT limit message handling.
- Queue while generating for composing the next message.
- Custom fonts and voice color styling.
- Import and export for settings.

## Permissions

The extension stores preferences and custom background files locally through browser storage. The `unlimitedStorage` permission lets image and video backgrounds up to the extension's 15 MB limit fit without browser-storage quota failures.

Host access is scoped to `chatgpt.com` and the optional feedback endpoint. Feedback text, a generated ticket ID, the extension version, and browser user agent are transmitted only after the user chooses to send feedback and grants Firefox's optional data permission.

See [PRIVACY.md](PRIVACY.md) for the complete privacy policy.

## Upstream

Based on [TG-TG-TG-TG-TG-TG/Aurora-for-ChatGPT](https://github.com/TG-TG-TG-TG-TG-TG/Aurora-for-ChatGPT).

## License

MIT. The upstream copyright and permission notice are preserved in [LICENSE](LICENSE).
