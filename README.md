# Pixel tracking through Google Tag Manager

Both pages load only Google Tag Manager (`GTM-5LB35DZV`). The page scripts in `index.js` and `second_page.js` describe user actions; `tracking.js` places those actions in the data layer. GTM owns the TikTok and OpenAI pixel initialization and sends their events.

The GTM workspace contains these tags:

| Tag | Trigger | Purpose |
| --- | --- | --- |
| OpenAI Pixel - Base and Page View | Tracking v2 - Initialization | Initialize OpenAI pixel and send `page_viewed` |
| TikTok Pixel - Base and Page View | Tracking v2 - Initialization | Initialize TikTok pixel and send page view |
| OpenAI Pixel - Events | Site - OpenAI Event | Send the custom `email` conversion |
| TikTok Pixel - Events | Site - TikTok Event | Send TikTok track and identify actions |

`tracking_version: 'v2'` is pushed before the GTM snippet. It gates the new base tags so the old live site continues using its direct pixels until the updated pages are deployed. Publish the GTM container first, then deploy all five site files together: `index.html`, `second_page.html`, `tracking.js`, `index.js`, and `second_page.js`. Publishing the HTML before the GTM container would leave the pages without active pixels.

GTM Preview shows which tags fire. TikTok Events Manager and OpenAI Ads Event Stream show what each destination receives. GTM itself does not store a historical event log.
