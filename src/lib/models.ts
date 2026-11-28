import mongoose, { Schema, Model } from 'mongoose';

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, default: '' },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff'], default: 'admin' },
  },
  { timestamps: true, collection: 'users' }
);

const TableSchema = new Schema(
  {
    number: { type: Number, required: true, unique: true },
    capacity: { type: Number, required: true },
    status: { type: String, enum: ['Available', 'Occupied', 'Reserved'], default: 'Available' },
  },
  { timestamps: true, collection: 'tables' }
);

// Maps directly to your existing `menuitems` collection in chinebadam_pos
const DishSchema = new Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: 'Special' },
    price: { type: Number, required: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    available: { type: Boolean, default: true },
  },
  { timestamps: true, strict: false, collection: 'menuitems' }
);

const OrderItemSchema = new Schema(
  {
    dishId: { type: String },
    dishName: { type: String },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
  },
  { _id: false, strict: false }
);

// Maps directly to your existing `orders` collection in chinebadam_pos
const OrderSchema = new Schema(
  {
    orderNumber: { type: String },
    tableId: { type: String },
    tableNumber: { type: Number, default: 1 },
    status: { type: String, default: 'InKitchen' },
    paymentStatus: { type: String, enum: ['Paid', 'Unpaid'], default: 'Paid' },
    pickupTime: { type: String, default: '' },
    items: { type: [OrderItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    donation: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentMethod: { type: String, default: null },
  },
  { timestamps: true, strict: false, collection: 'orders' }
);

// Maps directly to your existing `expenses` collection in chinebadam_pos
const ExpenseSchema = new Schema(
  {
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    category: { type: String, default: 'General' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true, strict: false, collection: 'expenses' }
);

// Maps directly to your existing `categories` collection
const CategorySchema = new Schema(
  {
    name: { type: String },
    image: { type: String, default: '' },
  },
  { timestamps: true, strict: false, collection: 'categories' }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const UserModel: Model<any> = mongoose.models.User || mongoose.model('User', UserSchema);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TableModel: Model<any> = mongoose.models.Table || mongoose.model('Table', TableSchema);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DishModel: Model<any> = mongoose.models.Dish || mongoose.model('Dish', DishSchema);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const OrderModel: Model<any> = mongoose.models.Order || mongoose.model('Order', OrderSchema);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ExpenseModel: Model<any> = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CategoryModel: Model<any> = mongoose.models.Category || mongoose.model('Category', CategorySchema);

const StockSchema = new Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: 'Grocery' },
    quantity: { type: Number, required: true, default: 0 },
    minThreshold: { type: Number, required: true, default: 5 },
    unit: { type: String, default: 'pcs' },
  },
  { timestamps: true, strict: false, collection: 'stocks' }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const StockModel: Model<any> = mongoose.models.Stock || mongoose.model('Stock', StockSchema);

const CustomerSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: '' },
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastVisit: { type: Date, default: Date.now },
  },
  { timestamps: true, strict: false, collection: 'customers' }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CustomerModel: Model<any> = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);

const BulkOrderSchema = new Schema(
  {
    orderNumber: { type: String },
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    eventType: { type: String, default: 'Birthday' },
    menuDetails: { type: String, required: true },
    peopleCount: { type: Number, required: true, default: 10 },
    totalPrice: { type: Number, required: true },
    advancePaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    paymentMethod: { type: String, default: 'Cash' },
    orderDate: { type: String, required: true },
    deliveryDate: { type: String, required: true },
    deliveryTime: { type: String, default: '' },
    status: { type: String, enum: ['Booked', 'Preparing', 'Completed', 'Cancelled'], default: 'Booked' },
    notes: { type: String, default: '' },
  },
  { timestamps: true, strict: false, collection: 'bulkorders' }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BulkOrderModel: Model<any> = mongoose.models.BulkOrder || mongoose.model('BulkOrder', BulkOrderSchema);

const StoreSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'store_settings' },
    name: { type: String, default: 'Chinebadam' },
    logo: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    whatsappLink: { type: String, default: '' },
    openingHours: { type: String, default: '' },
    availableOnZomato: { type: Boolean, default: false },
    zomatoLink: { type: String, default: '' },
    availableOnSwiggy: { type: Boolean, default: false },
    swiggyLink: { type: String, default: '' },
    availableOnOwnlly: { type: Boolean, default: false },
    ownllyLink: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    fssaiNumber: { type: String, default: '' },
    taxRate: { type: Number, default: 5 },
    currency: { type: String, default: 'INR (₹)' },
    storeType: { type: String, enum: ['small', 'medium', 'big'], default: 'big' },
  },
  { timestamps: true, strict: false, collection: 'settings' }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const StoreSettingsModel: Model<any> =
  mongoose.models.StoreSettings || mongoose.model('StoreSettings', StoreSettingsSchema);

const OrderQuerySchema = new Schema(
  {
    queryNumber: { type: String },
    customerName: { type: String, default: 'Online Customer' },
    phone: { type: String, default: '' },
    orderType: { type: String, default: 'Take Away' },
    note: { type: String, default: '' },
    items: { type: [OrderItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: { type: String, enum: ['Pending', 'Converted', 'Dismissed'], default: 'Pending' },
    convertedOrderId: { type: String, default: '' },
  },
  { timestamps: true, strict: false, collection: 'orderqueries' }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const OrderQueryModel: Model<any> =
  mongoose.models.OrderQuery || mongoose.model('OrderQuery', OrderQuerySchema);
