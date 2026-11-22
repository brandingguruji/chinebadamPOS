export interface User {
  id: string;
  username: string;
  email?: string;
  passwordHash?: string;
  role: 'admin' | 'staff';
  createdAt: string;
}

export type TableStatus = 'Available' | 'Occupied' | 'Reserved';

export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: TableStatus;
  createdAt: string;
}

export type DishCategory = string;

export interface Dish {
  id: string;
  name: string;
  category: DishCategory;
  price: number;
  description: string;
  image?: string;
  available: boolean;
  createdAt: string;
}

export type OrderStatus = 'InKitchen' | 'WaitList' | 'Ready' | 'Served';

export interface OrderItem {
  dishId: string;
  dishName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  tableId: string;
  tableNumber: number;
  orderType?: 'Dine In' | 'Take Away';
  customerName?: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  donation: number;
  total: number;
  paymentMethod: 'Cash' | 'Card' | 'Scan' | null;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  createdAt: string;
}

export interface MonthlyReport {
  month: string; // YYYY-MM
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  orderCount: number;
  expenseCount: number;
  orders: Order[];
  expenses: Expense[];
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  totalTables: number;
  occupiedTables: number;
}

export interface Category {
  id: string;
  name: string;
  createdAt?: string;
}

export interface StockItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minThreshold: number;
  unit: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalOrders: number;
  totalSpent: number;
  lastVisit?: string;
  createdAt?: string;
}
