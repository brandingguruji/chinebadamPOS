import mongoose, { Schema, Model } from 'mongoose';

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
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
  { name: { type: String } },
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
