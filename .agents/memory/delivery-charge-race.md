---
name: Delivery charge checkout race condition
description: Why the pincode delivery-charge lookup must gate order submission, and where the safety nets live.
---

The checkout ("Place order") flow computes the delivery fee from an async hub/pincode
config fetch (`HubContext`). Submitting before that fetch resolves silently defaults
the charge to ₹0 and gets persisted — a real revenue leak, not just a display bug.

**Why:** `pincodeDeliveryCharge` derives from `selectedSubHub?.pincodes`, which loads
asynchronously on app mount/resume. There was no gate on the submit button, so a fast
tap (especially right after load, or right after returning from a UPI payment app via
the `visibilitychange` resume flow) could build the order payload while the config was
still unloaded, baking in a ₹0 charge.

**How to apply:** `HubContext` exposes `isHubReady` — treat it as a hard precondition
for anything that trusts `selectedSubHub.pincodes` (checkout submit button, the
`placeOrder` handler, and the UPI-resume `visibilitychange` handler in
`CartDrawer.tsx` all gate on it now). The server (`server/routes.ts`) also
authoritatively recomputes the charge from the DB and overrides a mismatched
client-submitted value for delivery orders — but it silently keeps the client's number
if no pincode config match is found, so that path now logs a warning instead of
failing silently. See `explain.md` in the repo root for a plain-language writeup of
this specific incident.
