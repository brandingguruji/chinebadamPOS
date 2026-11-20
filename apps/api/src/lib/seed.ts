import bcryptjs from 'bcryptjs';
import { connectDB } from './mongodb';
import { UserModel, TableModel } from './models';

let seeded = false;

export async function ensureSeeded() {
  await connectDB();
  if (seeded) return;

  const userCount = await UserModel.countDocuments();
  if (userCount === 0) {
    const passwordHash = bcryptjs.hashSync('admin123', 10);
    await UserModel.create({ username: 'admin', passwordHash, role: 'admin' });
  }

  const tableCount = await TableModel.countDocuments();
  if (tableCount === 0) {
    const seedTables = Array.from({ length: 10 }, (_, i) => ({
      number: i + 1,
      capacity: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
      status: i < 3 ? 'Occupied' : i < 5 ? 'Reserved' : 'Available',
    }));
    await TableModel.insertMany(seedTables);
  }

  seeded = true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeDoc(doc: any) {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  obj.id = String(obj._id);
  delete obj._id;
  delete obj.__v;

  // Normalize common alternate field names from existing Atlas collections
  if (obj.name === undefined && obj.title) obj.name = obj.title;
  if (obj.description === undefined && obj.note) obj.description = obj.note;
  if (obj.description === undefined && obj.title) obj.description = obj.title;
  if (obj.total === undefined && obj.totalAmount !== undefined) obj.total = Number(obj.totalAmount);
  if (obj.total === undefined && obj.grandTotal !== undefined) obj.total = Number(obj.grandTotal);
  if (obj.amount !== undefined) obj.amount = Number(obj.amount);
  if (obj.price !== undefined) obj.price = Number(obj.price);
  if (!obj.date && obj.createdAt) obj.date = obj.createdAt;
  if (obj.available === undefined) obj.available = true;
  if (!obj.category && obj.categoryName) obj.category = obj.categoryName;
  if (!obj.orderNumber && obj.id) obj.orderNumber = `#${obj.id.slice(-5).toUpperCase()}`;

  return obj;
}
