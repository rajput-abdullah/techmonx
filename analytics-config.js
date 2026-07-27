/*
 * TechMonx GA4 configuration
 * -----------------------------------------------------------------
 * This file exists ONLY to hold the GA4 Measurement ID, kept out of
 * consent.js and every page's HTML so it's not hard-coded through the
 * main source files and can be swapped/rotated in one place.
 *
 * A GA4 Measurement ID (format: G-XXXXXXXXXX) is a public identifier,
 * not a secret — it is visible in any browser's network tab once
 * analytics is loaded. There is no true server-side "environment
 * variable" mechanism available on a static HTML/Hostinger site, so
 * this file is the closest equivalent: a single, isolated place to
 * set the ID, separate from tracked application logic.
 *
 * SETUP: replace the empty string below with your real Measurement ID
 * from GA4 (Admin > Data Streams > your web stream > Measurement ID).
 * See ga4-setup-guide.md for full instructions and how to verify
 * tracking once this is live.
 *
 * Leave this as an empty string to keep analytics fully inert —
 * consent.js will not load GA4 at all if no ID is set here, even if
 * a visitor accepts analytics cookies.
 */
window.TECHMONX_GA4_ID = "";
