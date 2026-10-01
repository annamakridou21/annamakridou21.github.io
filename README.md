# TikTok pixel test site

## Google Tag Manager experiment

Both pages initialize `window.dataLayer`. Each event sent through this site's
`ttq.track()` calls also pushes a `tiktok_event` message with
`tiktok_event_name` and the exact `tiktok_parameters` object. The values are
available in the browser's `window.dataLayer` and in Tag Assistant's
Preview > Data Layer view. For example, click
**FIRE CANARY LEAK** and inspect `tiktok_parameters.description` on the
`tiktok_event` message.

The GTM web container `GTM-5LB35DZV` is installed on both pages. Open its
**Preview** in <https://tagmanager.google.com/> and connect to the
published site to inspect each `tiktok_event` in Tag Assistant. Do not
configure a second TikTok tag in GTM while the direct
TikTok pixel remains in these pages, or the same action may be counted twice.
The current test payloads include raw names and emails, so do not forward them
to Google Analytics. GTM Preview is a live debugging view; it does not archive
past visitors' event values.
