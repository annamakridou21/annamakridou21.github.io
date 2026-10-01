# TikTok pixel test site

## Save events on this computer

Run `node server.js` in this directory, then visit <http://127.0.0.1:8765/>.
Every event fired through `trackAndMirror()` is sent to TikTok and saved as one
JSON line in `event-logs/events.jsonl`. The log is excluded from Git because
some test events contain personal information. Stop the server with Ctrl+C.

The mirror saves the event name and the exact parameter object passed to
`ttq.track()`. TikTok's SDK adds browser context to its own network request;
that extra context is not copied here. Automatic pixel events such as Pageview
and EngagedSession do not call this site's `ttq.track()` handlers and are not
in the local log.

The public GitHub Pages site cannot POST to this local server. Use the local
URL above when you want events saved on this computer.

## Google Tag Manager experiment

Both pages initialize `window.dataLayer`. Each event sent through this site's
`ttq.track()` calls also pushes a `tiktok_event` message with
`tiktok_event_name` and the exact `tiktok_parameters` object. The values are
available in the browser's `window.dataLayer` and, after a GTM web container is
installed, in Tag Assistant's Preview > Data Layer view. For example, click
**FIRE CANARY LEAK** and inspect `tiktok_parameters.description` on the
`tiktok_event` message.

The GTM web container `GTM-5LB35DZV` is installed on both pages. Open its
**Preview** in <https://tagmanager.google.com/> and connect to the local or
published site to inspect each `tiktok_event` in Tag Assistant. Do not
configure a second TikTok tag in GTM while the direct
TikTok pixel remains in these pages, or the same action may be counted twice.
The current test payloads include raw names and emails, so do not forward them
to Google Analytics. GTM Preview is a live debugging view; it does not archive
past visitors' event values.
