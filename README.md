# Pixel tracking on this test website

This repository is the source for [annamakridou21.github.io](https://annamakridou21.github.io/). It is a small test site for TikTok Pixel and OpenAI Ads Pixel events. Google Tag Manager (GTM) container `GTM-5LB35DZV` owns both pixel installations. The website's JavaScript decides **when** an event happens and supplies its data; GTM calls the pixel SDKs.

## Files and responsibilities

| File | Responsibility |
| --- | --- |
| `index.html` | Home page form and buttons; loads the GTM snippet, SHA-256 library, `tracking.js`, `openai-matching.js`, and `index.js`. |
| `second_page.html` | Second page and ViewContent button; loads the GTM snippet, `tracking.js`, and `second_page.js`. |
| `index.js` | Home page event listeners, test event payloads, and manual TikTok matching field capture. |
| `second_page.js` | Sends ViewContent when its button is clicked. |
| `tracking.js` | Shared bridge that queues TikTok and OpenAI actions for GTM. It also restores saved TikTok matching values on page load. |
| `openai-matching.js` | Normalizes and hashes the home page form fields for OpenAI manual advanced matching. |

Both HTML pages push `tracking_version: 'v2'` into `window.dataLayer` **before** the GTM snippet. The version value is the firing condition for the base pixel tags. The `defer` scripts run in order: `tracking.js`, then `openai-matching.js` on the home page, then the page-specific listener script.

There is no event receiver or historical event database in this repository. GTM routes events but does not store a browsable history of visitors or event payloads.

## Event path

```text
User action in index.js or second_page.js
  -> window.siteTracking in tracking.js
  -> window.dataLayer.push({ event: 'site_tiktok_event' or 'site_openai_event', ... })
  -> matching GTM Custom Event trigger
  -> GTM Custom HTML tag
  -> TikTok ttq.track/ttq.identify or OpenAI oaiq.init/oaiq.measure
```

`tracking.js` gives each queued action a page-local `tracking_event_id` and stores the full action in `window.siteTracking.pending[id]`. The data layer entry includes that ID and preview fields such as `tiktok_parameters` or `openai_event_data`. The GTM tag uses the ID to retrieve the corresponding action, sends it to the pixel, then deletes the pending entry. This keeps rapid events, including **FIRE ALL EVENTS**, paired with their own payloads.

The data layer event names (`site_tiktok_event` and `site_openai_event`) are **routing signals for GTM**. The destination event names, such as `liveEmailLeak` and `email`, are separate values inside those signals. GTM must be published for the website's queued events to reach the pixels.

## GTM configuration

The published container has two user-defined Data Layer Variables, three triggers, and four tags:

| GTM item | Configuration |
| --- | --- |
| `DLV - Tracking Version` | Reads `tracking_version`. |
| `DLV - Tracking Event ID` | Reads `tracking_event_id`. |
| `Tracking v2 - Initialization` | Initialization trigger when `DLV - Tracking Version` equals `v2`. |
| `Site - TikTok Event` | Custom Event trigger for `site_tiktok_event`. |
| `Site - OpenAI Event` | Custom Event trigger for `site_openai_event`. |
| `TikTok Pixel - Base and Page View` | Initializes pixel `DA62U6RC77UC1JSQS2AG` and calls `ttq.page()` on each page load. |
| `TikTok Pixel - Events` | Calls `ttq.track(name, data)` or `ttq.identify(data)` for queued TikTok actions. |
| `OpenAI Pixel - Base and Page View` | Initializes pixel `UWu3tSwiTo9pgFriyv5Cd8` and measures `page_viewed` on each page load. |
| `OpenAI Pixel - Events` | Calls `oaiq('init', {pixelId, user})` for available matching data, then `oaiq('measure', name, data, options)` when the queued action includes a conversion. |

The two base tags use `Tracking v2 - Initialization`. Each event tag uses its corresponding Custom Event trigger and the `DLV - Tracking Event ID` variable.

## Events in the site code

| Action | File | Destination event/action | Data |
| --- | --- | --- | --- |
| Load either page | GTM base tags | TikTok Page View; OpenAI `page_viewed` | Page context; OpenAI `type: 'contents'`. |
| Change the first name field | `index.js` | TikTok custom `firstNameSubmit` | Description, raw `first_name_value`, form location. |
| Change the email field | `index.js` | TikTok custom `liveEmailLeak` | Content fields, value/currency, raw email in `description`. |
| Click **FIRE CANARY LEAK** | `index.js` | TikTok custom `canaryLeak` | Timestamped synthetic test values, including fake email and phone fields. |
| Click **Submit Data & Identify** with any valid matching field but no valid email | `index.js` -> `openai-matching.js` -> `tracking.js` | OpenAI user update | Available normalized and hashed matching fields; this alone does not create an Event Stream conversion row. |
| Click **Submit Data & Identify** with a valid email | `index.js` -> `openai-matching.js` -> `tracking.js` | OpenAI user update and custom `email` in one GTM action | Fixed demo signup content, `amount: 1234`, `currency: 'USD'`, and unique `event_id`, with matching data sent immediately before the conversion. |
| Click **Submit Data & Identify** with any populated field | `index.js` | TikTok `identify`; TikTok custom `fullIdentityLeak` | Hashed matching fields in `identify`; raw populated form fields joined in the custom event's `contents[0].content_name`. |
| Click **FIRE ALL EVENTS** | `index.js` | TikTok `identify` if saved hashes exist, then ten standard events | Saved hashed identity plus a fixed demo product payload for AddToCart, Lead, InitiateCheckout, PlaceAnOrder, Purchase, Schedule, StartTrial, SubmitApplication, Subscribe, and ViewContent. |
| Click **FIRE ViewContent EVENT** on the second page | `second_page.js` | TikTok ViewContent | Second page demo product, value `10`, currency `USD`. |

The OpenAI `email` conversion's event data uses fixed demo values and a content name of `Demo email signup`. Its separate manual matching update sends a SHA-256 hash of the entered email and other available identity fields. The TikTok `liveEmailLeak` and `fullIdentityLeak` events are different tests and deliberately include raw form text. Since the website is public, use fake values in those fields if you do not want real visitor data sent to TikTok.

## Manual advanced matching for TikTok

The implementation is in `captureAndSavePII()` in `index.js` and `tiktokIdentify()` in `tracking.js`:

1. On blur of any identity field, `index.js` reads all currently populated fields. It also reads them when **Submit Data & Identify** is clicked.
2. First name, last name, email, city, state, and country are trimmed and lowercased. Phone, ZIP code, and customer ID are trimmed. Each nonempty value is passed through the loaded SHA-256 library.
3. Each resulting hash is saved in browser `localStorage` under a `ttq_*` key, such as `ttq_email` or `ttq_phone`. Raw values are not saved by this matching function.
4. `window.siteTracking.tiktokIdentify(identifyData)` queues a TikTok identify action. The GTM TikTok event tag calls `ttq.identify()` with the hashes.
5. On every page load, `tracking.js` reads any saved hashes from `localStorage` and queues another identify action. **FIRE ALL EVENTS** also sends the saved hashes before the standard test events.

The stored fields are `first_name`, `last_name`, `email`, `phone_number`, `city`, `state`, `country`, `zip_code`, and `external_id`. The current code has no clear/reset button for these saved values; clearing site storage in the browser removes them.

Manual advanced matching and event parameters are different paths. `ttq.identify()` receives hashed identity fields. `ttq.track()` receives each event's payload; those payloads can include raw text in the test events listed above. Hashing the identity fields does not hash the custom event payloads.

## Manual advanced matching for OpenAI

When **Submit Data & Identify** is clicked, `captureOpenAIUser()` in `index.js` reads the form. `openai-matching.js` builds a `user` object from the available valid fields. If the email is valid, `tracking.js` queues one action containing both the user update and custom `email` conversion. The GTM OpenAI event tag calls `oaiq('init', {pixelId, user})` and then `oaiq('measure', ...)` during that same action. Without a valid email, it queues only a user update, which does not create an Event Stream conversion row. The initial page view happens before form submission, so this update does not retroactively add matching data to that page view.

| Form field | OpenAI `user` field | Processing |
| --- | --- | --- |
| Email | `email_sha256` | Trim, lowercase, then SHA-256; include only a valid email. |
| Phone | `phone_number_sha256` | Remove formatting, leading `+`, and leading zeroes; require 8–15 digits, then SHA-256. Enter the country calling code. |
| Customer ID | `external_id_sha256` | Trim, preserve case, then SHA-256. Enter a stable pseudonymous ID. |
| First name | `first_name_sha256` | Lowercase, remove whitespace and ASCII punctuation, then SHA-256. |
| Last name | `last_name_sha256` | Same normalization as first name. |
| Country | `country` | Uppercase two-letter code. Enter a real ISO 3166-1 country code. |
| City | `city` | Trim, lowercase; maximum 128 characters. |
| State / Region | `region` | Trim; maximum 128 characters. |
| ZIP / Postal code | `postal_code` | Trim; maximum 32 letters, digits, spaces, or hyphens. |

Missing or invalid fields are omitted. Only hashes of the email, phone, customer ID, and names are sent to OpenAI through this matching path; location fields are sent as text. This OpenAI matching object is not saved in local storage and is only sent after this form submission. The browser still briefly holds the entered values while processing the form. The test page no longer opens blocking alerts when the email field changes or the submit button is clicked, so those alerts cannot delay pixel requests. See the [OpenAI Ads Measurement Pixel documentation](https://developers.openai.com/ads/measurement-pixel) for the accepted `user` fields and normalization rules.

## Where to change things

- To change **when a home page event fires** or its TikTok parameters, edit the listener and payload in `index.js`.
- To change the second page ViewContent payload, edit `second_page.js`.
- To add another TikTok event from a page listener, call `window.siteTracking.tiktokTrack('EventName', parameters)`. The existing GTM TikTok event tag will route it.
- To change the OpenAI `email` payload, edit `openaiEmail()` in `tracking.js`. For another OpenAI conversion, add a shared tracking method and call it from the relevant page listener; the existing `site_openai_event` GTM trigger routes queued OpenAI actions.
- To change OpenAI manual matching normalization or field selection, edit `openai-matching.js` and the form capture in `index.js`.
- To change pixel IDs, SDK setup, or page view behavior, edit the **base tags in GTM** and publish a new container version. Those pixel setup calls are no longer in the HTML files.
- To change TikTok matching normalization, hashes, or storage behavior, edit `captureAndSavePII()` in `index.js` and the storage-key mapping in `tracking.js` together.

## Checking a change

Use **Preview** in GTM to see the data layer events and which tags fired. Check TikTok Test Events or OpenAI Ads Event Stream to see what the destinations actually received. A GTM tag firing confirms the dispatch code ran; it does not guarantee that a destination accepted every parameter or displays it in its reporting dashboard.

When changing both GTM and the website, publish the compatible GTM version before deploying the HTML/JavaScript files. GitHub Pages serves the files from this repository's `main` branch.
