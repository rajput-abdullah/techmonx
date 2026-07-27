# TechMonx — GA4 & Cookie Consent Setup Guide

This covers how the new cookie-consent system and Google Analytics 4 (GA4) integration work, where to add your real GA4 ID, and how to verify tracking after deployment.

## 1. How the system works

- Every page loads `analytics-config.js` and `consent.js` in `<head>`, before anything else.
- `consent.js` immediately sets Google Consent Mode v2 to **denied** for analytics on every page load.
- On first visit, a banner appears (Accept all / Reject non-essential / Manage preferences). The choice is stored in the browser under the key `techmonx_cookie_consent_v1` and honoured on return visits.
- GA4's script (`gtag.js`) is **only** injected into the page after a visitor explicitly accepts analytics — it is never present in the page source otherwise, and no analytics cookie (`_ga`, `_ga_<container-id>`) is set until then.
- A "Cookie Settings" link in every page footer reopens the preferences panel so visitors can change their mind at any time.
- Once analytics is active, a global helper `window.techmonxTrack(eventName, params)` fires custom GA4 events from `script.js` and `consent.js` — page views, service/project page views, CTA clicks, booking events, form submissions, phone/email clicks, and outbound social clicks. No form content, email addresses, or other personal data is ever included in these events.

## 2. Where to add your GA4 Measurement ID

Open **`analytics-config.js`** in the site root and replace the empty string:

```js
window.TECHMONX_GA4_ID = "G-XXXXXXXXXX";
```

Get this ID from GA4: **Admin → Data Streams → (your web stream) → Measurement ID**. If you don't have a GA4 property yet, create one first (Admin → Create Property), add a Web data stream for `https://techmonx.co.uk`, then copy the Measurement ID it generates.

That's the only file that needs a real value — everything else (consent gating, event tracking, policy pages) is already wired up.

**Note on "secrets":** a GA4 Measurement ID is a public identifier by design — it's visible in any browser's network tab the moment analytics loads for any visitor, on any GA4-enabled site. There's no way to make it a true server-side secret on a static HTML site with no backend. Keeping it in this one isolated config file (rather than hard-coded inside `consent.js` or scattered across 22 HTML files) is about making it easy to find, rotate, or swap out — not about hiding it.

## 3. Verifying tracking after deployment

Once the ID is set and the site is live:

1. **GA4 Realtime report** (Admin → or Reports → Realtime): open the live site in a new browser/incognito window, accept analytics cookies in the banner, and browse a few pages. You should see yourself appear as an active user within ~30 seconds.
2. **GA4 DebugView** (Admin → DebugView): for detailed per-event inspection, install the [Google Analytics Debugger Chrome extension](https://chrome.google.com/webstore), enable it, then browse the site the same way — each event (`page_view`, `view_service_page`, `cta_start_project_click`, `booking_open_click`, `contact_form_submit`, `phone_click`, etc.) should appear in DebugView as you trigger it.
3. **Confirm consent gating works:** open the site in a fresh incognito window and check the Network tab (DevTools) *before* interacting with the banner — you should see **no** request to `googletagmanager.com`. Click "Reject non-essential" and confirm it still doesn't load. Reload the page, click "Accept all", and confirm the `gtag/js` request now fires.
4. **Confirm the choice persists:** after accepting, reload the page — the banner should not reappear, and GA4 should load automatically (check the Network tab again).
5. **Confirm "Cookie Settings" works:** click the footer link, toggle analytics off, save, and confirm no further GA4 events fire on subsequent navigation.

## 4. Events being tracked

| Event name | Fires when |
|---|---|
| `page_view` | Automatic, via GA4's standard page view (fires once GA4 is loaded) |
| `view_service_page` | Visiting `services.html` |
| `view_project_page` | Visiting `portfolio.html` or any `project-*.html` page |
| `cta_start_project_click` | Clicking any "Start a Project" link/button |
| `cta_lets_talk_click` | Clicking any "Let's Talk" link/button |
| `booking_open_click` | Opening the booking modal (FAB, chat link, or any `[data-open-booking]` trigger) |
| `booking_request_submit` | A booking request is successfully sent |
| `contact_form_submit` | The main contact form is successfully sent |
| `chat_message_submit` | The AI-assistant chat widget successfully sends a message |
| `phone_click` | Clicking a `tel:` link |
| `email_click` | Clicking a `mailto:` link |
| `social_click` | Clicking an outbound link to Facebook, Instagram, LinkedIn, X, TikTok, or YouTube |

None of these events carry PII — only generic labels like page path, service name, or the social platform's hostname.

## 5. Files involved

- `analytics-config.js` — holds the GA4 Measurement ID (edit this one).
- `consent.js` — consent banner/modal logic, Consent Mode, GA4 loader, `techmonxTrack()` helper, automatic click tracking.
- `styles.css` — banner/modal styling (search for "COOKIE CONSENT").
- `script.js` — tracking calls added inside the existing contact form, chat form, and booking form handlers.
- `cookie-policy.html` / `privacy-policy.html` — updated to describe GA4 cookies, purpose, retention, and how to manage consent.
- Every page's footer has a `Cookie Settings` link (`.js-cookie-settings`) that reopens the preferences modal.
