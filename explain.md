# The ₹49 delivery charge bug — explained simply

## What was happening

Some online orders (the ones with IDs like `#FTW202607111`) were being saved with
**₹0 delivery charge**, even though the customer's pincode has a real ₹49 delivery
fee configured for it. Not all orders to that pincode were affected — the *same*
pincode was charged correctly most of the time, and wrong only sometimes. That
"sometimes right, sometimes wrong" pattern is the fingerprint of a **race condition**
— a bug that only shows up depending on timing, not on what the customer actually did.

## A simple analogy

Imagine a cashier who has to look up today's delivery-fee price list before ringing
up a bill. The price list is kept in a back room and someone has to go fetch it.
Most of the time, by the time a customer is ready to pay, the price list is already
on the counter, so the cashier charges correctly.

But every now and then, a customer pays *very* fast — right as the cashier is still
walking back from the room. If the cashier doesn't wait, and rings up the bill using
"no list yet = ₹0 by default", the customer pays without the delivery fee. The price
list arrives on the counter a second later, but it's too late — the bill is already
printed.

## What was actually happening in the app

1. When the storefront loads, it fetches the customer's hub/area configuration in
   the background — this is the "price list," and it contains the delivery charge for
   every pincode in that area.
2. This fetch takes a moment (it's a network request).
3. The checkout screen calculated the delivery fee from that configuration the moment
   it was available — but the "Place Order" button was **not blocked** while waiting
   for that fetch to finish.
4. If a customer tapped "Place Order" quickly enough — right after opening the app,
   or right after coming back from paying via a UPI app like GPay/PhonePe — the
   button would happily submit the order using whatever the delivery fee happened to
   be *at that exact instant*, which could still be its untouched starting value: ₹0.
5. The order was then saved to the database with that ₹0 baked in — a small but real
   amount of missed revenue on every order this happened to.

## The fix

- The "Place Order" button now stays disabled (and shows "Loading delivery
  details...") until the area's delivery-charge configuration has actually finished
  loading. No more guessing with a ₹0 default.
- The same check was added to the "resume after paying via UPI app" flow, since that
  was the riskiest moment for this race (the app can reload while the customer is
  away in their UPI app).
- As a safety net, right before an order is submitted, the app now logs the delivery
  charge and the pincode it was computed for — if a ₹0 charge is ever submitted for a
  pincode that should be charged, it will show up clearly in the logs instead of only
  being noticed later as missing money.
- On the server, when it double-checks the delivery charge against the database and
  can't find a matching pincode configuration, it now logs a clear warning too, so
  that failure mode is visible instead of silent.

## Why this matters

Every order that slipped through with ₹0 delivery charge was a real, delivered order
where the ₹49 (or whatever the configured fee was) never got collected. It's not a
display bug — it's actual money not charged.

---

# The duplicate-order bug (two orders for one payment) — explained simply

## What was happening

Occasionally, one UPI payment resulted in **two separate orders** being created —
same customer, same items, same amount, placed in the same minute, back-to-back
order IDs. It only happened once in a while, not on every UPI order, which again
points to a race condition (a timing-dependent bug).

## Why it happened

The app has two different ways of noticing "the customer's payment succeeded":

1. **Razorpay's own callback** — when the payment popup/app confirms success, the
   Razorpay checkout script calls back into our code directly.
2. **The "welcome back" check** — when a customer pays via a UPI app like GPay and
   then switches back to our browser tab, the app notices the tab became visible
   again and asks the server "did this payment actually go through?" If yes, it
   places the order.

Both of these were written to independently place the order once they detected a
successful payment. Normally only one of them fires. But occasionally — especially
right when the customer switches back from their UPI app — **both** can detect
success within a second of each other. Since neither one checked "wait, did the
other one already place this order?", both went ahead and created their own order
for the same payment.

## The fix

Both order-placing code paths now share a single flag that says "someone has
already claimed this payment." Whichever one notices the successful payment first
sets that flag immediately; the other one checks the flag right before acting and
backs off if it's already set. This closes the timing gap client-side.

As a backup, the server itself now also checks: before creating any new order paid
via UPI, it looks at the UPI payment reference and if an order with that exact
payment reference already exists, it does **not** create a second one — it just
returns the existing order. This protects against the same problem even if it
somehow slipped past the app's own check (e.g. a network retry).

## Why this matters

A duplicate order looks like two paid orders in the system, but the customer was
only charged once. Left unfixed, this double-counts revenue in reports, ties up
double the inventory (the fish/meat gets reserved twice), and creates confusing
duplicate deliveries that need to be manually cleaned up, like the one you deleted.
