import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI not set");

const orderSchema = new mongoose.Schema(
  {
    customerId: { type: String, default: null },
    customerName: { type: String },
    phone: { type: String },
    email: { type: String, default: null },
    items: { type: mongoose.Schema.Types.Mixed },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    slotCharge: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    deliveryType: { type: String, default: "delivery" },
    address: { type: String },
    deliveryArea: { type: String },
    deliveryAddressDetail: { type: mongoose.Schema.Types.Mixed, default: null },
    pickupLocation: { type: String, default: "" },
    notes: { type: String, default: "" },
    status: { type: String, default: "pending" },
    source: { type: String, default: "online" },
    subHubId: { type: String, default: null },
    subHubName: { type: String, default: null },
    superHubId: { type: String, default: null },
    superHubName: { type: String, default: null },
    couponIds: { type: [String], default: [] },
    couponCodes: { type: [String], default: [] },
    coupons: { type: mongoose.Schema.Types.Mixed, default: [] },
    paymentStatus: { type: String, default: "unpaid" },
    payments: { type: mongoose.Schema.Types.Mixed, default: [] },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    paymentMode: { type: String, default: null },
    scheduleType: { type: String, default: null },
    deliveryDate: { type: String, default: null },
    timeslotId: { type: String, default: null },
    timeslotLabel: { type: String, default: null },
    timeslotStart: { type: String, default: null },
    timeslotEnd: { type: String, default: null },
    inventoryDeducted: { type: Boolean, default: false },
    upiTransactionId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    orderId: { type: String },
  },
  { versionKey: false }
);

const conn = await mongoose.createConnection(MONGODB_URI, { dbName: "orders" }).asPromise();
const Order = conn.model("Order", orderSchema);

const paidAt = new Date().toISOString();
const razorpayPaymentId = "pay_TEST" + Math.random().toString(36).slice(2, 12).toUpperCase();
const razorpayOrderId  = "order_TEST" + Math.random().toString(36).slice(2, 10).toUpperCase();

const doc = await Order.create({
  customerId: null,
  customerName: "Test Customer",
  phone: "9999999999",
  email: null,
  items: [
    {
      productId: "000000000000000000000001",
      name: "Surmai (King Fish) Steaks",
      price: 480,
      quantity: 2,
      unit: "500g",
      imageUrl: null,
    },
  ],
  subtotal: 960,
  discount: 0,
  slotCharge: 49,
  total: 1009,
  deliveryType: "delivery",
  address: "A-304 Sai Leela CHS, Pokhran Road No.2, Thane West",
  deliveryArea: "Thane West",
  deliveryAddressDetail: {
    name: "Test Customer",
    phone: "9999999999",
    building: "A-304 Sai Leela CHS",
    street: "Pokhran Road No.2",
    area: "Thane West",
    pincode: "400606",
    type: "house",
    label: "Home",
    instructions: "",
    _id: null,
  },
  pickupLocation: "",
  notes: "TEST ORDER — safe to delete",
  status: "pending",
  source: "online",
  subHubId: null,
  subHubName: "Thane",
  superHubId: null,
  superHubName: "Mumbai",
  couponIds: [],
  couponCodes: [],
  coupons: [],
  paymentStatus: "paid",
  payments: [
    {
      mode: "upi",
      amount: 1009,
      reference: razorpayPaymentId,
      paidAt,
    },
  ],
  paidAmount: 1009,
  dueAmount: 0,
  paymentMode: "upi",
  scheduleType: "slot",
  deliveryDate: new Date().toISOString().slice(0, 10),
  timeslotId: null,
  timeslotLabel: "7:00 AM – 9:00 AM",
  timeslotStart: "07:00",
  timeslotEnd: "09:00",
  inventoryDeducted: false,
  upiTransactionId: razorpayPaymentId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Generate orderId (same pattern as the app)
const now = new Date();
const istDate = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
const dateStr = istDate.toISOString().slice(0, 10).replace(/-/g, "");
const count = await Order.countDocuments({ orderId: { $regex: `^#FTW${dateStr}` } });
const orderId = `#FTW${dateStr}${count + 1}`;

await Order.findByIdAndUpdate(doc._id, { $set: { orderId, inventoryDeducted: true } });

console.log("\n✅ Test UPI order inserted successfully!\n");
console.log("  orderId          :", orderId);
console.log("  _id              :", doc._id.toString());
console.log("  upiTransactionId :", razorpayPaymentId);
console.log("  razorpayOrderId  :", razorpayOrderId, "(not stored — just for reference)");
console.log("  total            : ₹1009  (subtotal ₹960 + delivery ₹49)");
console.log("  paymentStatus    : paid");
console.log("  notes            : TEST ORDER — safe to delete\n");

await conn.close();
