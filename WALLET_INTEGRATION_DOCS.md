# Fishtokri Wallet Integration — Customer Website Side

This document describes every change made on the **customer-facing website** (this Replit project) to support the Fishtokri Wallet feature. Share this with the admin-panel Replit project so it can align its logic and detect/resolve any conflicts.

---

## 1. MongoDB Schema Change — `customers` Collection

**Database:** `customers`  
**Collection:** `customers`

A new field `walletBalance` was added to every customer document.

```
Field: walletBalance
Type: Number
Default: 0
```

**Example document shape (relevant fields):**
```json
{
  "_id": "...",
  "phone": "9619523254",
  "name": "Sairaj Koyande",
  "walletBalance": 100,
  ...
}
```

> **Important for admin side:** If the admin panel's Mongoose schema for the `customers` collection does not declare `walletBalance`, it will silently strip the field on read/write. The field must be added to the admin-side Mongoose schema as:
> ```js
> walletBalance: { type: Number, default: 0 }
> ```

---

## 2. How Wallet Balance is Deducted — Order Creation Flow

**When a customer places an order using wallet balance**, the customer website sends `walletAmountUsed` in the order request payload to `/api/orders` (POST).

After the order is created, the server runs:
```js
await CustomerDbModel.findByIdAndUpdate(customerId, {
  $inc: { walletBalance: -walletAmountUsed }
});
```

This directly updates the `customers` collection in the `customers` database.

**The order document itself does NOT store `walletAmountUsed`** — only the customer's balance is decremented.

---

## 3. Order Request Payload — `walletAmountUsed` Field

The `/api/orders` POST endpoint now accepts an additional field:

```
walletAmountUsed: number | null | undefined
```

This field is part of the order creation body. It tells the server how much wallet credit was applied to the order total.

**Example payload (relevant fields):**
```json
{
  "customerName": "Sairaj Koyande",
  "phone": "9619523254",
  "customerId": "6a16a5c99bbeed61c0e94498",
  "items": [...],
  "subtotal": 400,
  "discount": 0,
  "total": 300,
  "walletAmountUsed": 100,
  ...
}
```

> **Note:** The `total` sent to the server is already the **final amount after wallet deduction** (i.e. `subtotal - discount + deliveryFee - walletAmountUsed`). The wallet deduction is a UI-side calculation; the server trusts the `total` value and separately deducts `walletAmountUsed` from the customer's `walletBalance`.

---

## 4. Zod Schema Change (Critical)

The Zod validation schema `insertOrderRequestSchema` in `shared/schema.ts` was updated to include `walletAmountUsed`. **Without this, Zod silently strips the field from the request body before the server handler runs.**

```ts
// shared/schema.ts — insertOrderRequestSchema
walletAmountUsed: z.number().nullable().optional(),
```

> **Admin side risk:** If the admin panel also uses a shared schema or its own Zod schema for order creation, it must similarly include `walletAmountUsed` if it ever needs to read or forward this value.

---

## 5. Customer API Response — `walletBalance` Now Included

The `/api/customer/me` GET endpoint now returns `walletBalance` in its response:

```json
{
  "id": "...",
  "phone": "9619523254",
  "name": "Sairaj Koyande",
  "walletBalance": 100,
  ...
}
```

The `toCustomer()` mapper in `server/storage.ts` was updated:
```ts
walletBalance: doc.walletBalance ?? 0,
```

---

## 6. Customer-Facing UI Changes

### Profile Page (`/profile`)
- Top-right of the "My Profile" header shows a **Fishtokri Wallet badge** with the live balance pulled from `/api/customer/me`.
- Displays: wallet icon + "Fishtokri Wallet" label + `₹{balance}` in brand blue `#364F9F`.

### Cart Drawer
- A **"Use Fishtokri Wallet"** toggle appears in the order summary (below the Offers / coupon section) **only when the logged-in customer has `walletBalance > 0`**.
- When toggled on:
  - `walletDeduction = Math.min(walletBalance, orderTotal)` — cannot exceed the order amount.
  - Bill Details shows a **−₹X Wallet** line in blue.
  - The displayed total updates to `orderTotal - walletDeduction`.
  - `walletAmountUsed` is sent in the order payload.
- After successful order placement, the customer's `walletBalance` in MongoDB is decremented by `walletAmountUsed`.

---

## 7. Files Changed on the Customer Website

| File | Change |
|------|--------|
| `server/customerDb.ts` | Added `walletBalance: { type: Number, default: 0 }` to Mongoose `customerSchema` |
| `server/storage.ts` | Added `walletBalance: doc.walletBalance ?? 0` to `toCustomer()` mapper |
| `server/routes.ts` | After order creation: `$inc walletBalance by -walletAmountUsed` on `CustomerDbModel` |
| `shared/schema.ts` | Added `walletAmountUsed: z.number().nullable().optional()` to `insertOrderRequestSchema`; added `walletBalance: number` to `Customer` type; added `walletAmountUsed?: number | null` to `InsertOrderRequest` type |
| `client/src/pages/storefront/Profile.tsx` | Replaced two Lottie animations with wallet balance badge |
| `client/src/components/storefront/CartDrawer.tsx` | Added wallet toggle, bill deduction line, updated totals |

---

## 8. What the Admin Side Should Check / Align

1. **Mongoose schema for `customers`** — confirm `walletBalance` field exists with `type: Number, default: 0`. Without it, the field is invisible to the admin panel.

2. **Admin order view** — `walletAmountUsed` is in the order payload but **not persisted to the orders collection** by the customer website. If the admin panel needs to show "wallet used" on an order, it should add `walletAmountUsed` to its own order schema and store it.

3. **Admin wallet top-up** — the customer website has no mechanism to credit wallet balance. The admin panel needs a feature to set/increment a customer's `walletBalance` via:
   ```js
   CustomerModel.findByIdAndUpdate(customerId, { $inc: { walletBalance: amount } })
   // or set absolutely:
   CustomerModel.findByIdAndUpdate(customerId, { $set: { walletBalance: amount } })
   ```

4. **Order total integrity** — the `total` stored in the orders collection already reflects the post-wallet-deduction amount (what the customer actually pays). If the admin panel recalculates the total independently, it must also account for `walletAmountUsed`.

---

## 9. Test Case to Verify End-to-End

1. Customer `9619523254` has `walletBalance: 100` in MongoDB.
2. Customer adds items totalling ₹400.
3. Customer enables "Use Fishtokri Wallet" toggle in cart.
4. Cart shows: Subtotal ₹400 → Wallet −₹100 → **Total ₹300**.
5. Customer places order.
6. After order: check `customers` collection → `walletBalance` should be **0**.
7. Customer refreshes Profile page → wallet badge shows **₹0**.
