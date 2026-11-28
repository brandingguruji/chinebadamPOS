import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { StoreSettingsModel } from '@/lib/models';
import { verifyToken } from '@/lib/jwt';
import { DEFAULT_SETTINGS } from '@/lib/settings';

async function requireAuth(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return await verifyToken(authHeader.slice(7));
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    await connectDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc: any = await StoreSettingsModel.findOne({ key: 'store_settings' }).lean();
    if (!doc) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }
    return NextResponse.json({
      name: doc.name ?? DEFAULT_SETTINGS.name,
      logo: doc.logo ?? '',
      address: doc.address ?? '',
      phone: doc.phone ?? '',
      whatsappLink: doc.whatsappLink ?? '',
      openingHours: doc.openingHours ?? '',
      availableOnZomato: Boolean(doc.availableOnZomato),
      zomatoLink: doc.zomatoLink ?? '',
      availableOnSwiggy: Boolean(doc.availableOnSwiggy),
      swiggyLink: doc.swiggyLink ?? '',
      availableOnOwnlly: Boolean(doc.availableOnOwnlly),
      ownllyLink: doc.ownllyLink ?? '',
      gstNumber: doc.gstNumber ?? '',
      fssaiNumber: doc.fssaiNumber ?? '',
      taxRate: doc.taxRate !== undefined ? Number(doc.taxRate) : DEFAULT_SETTINGS.taxRate,
      currency: doc.currency ?? DEFAULT_SETTINGS.currency,
      storeType:
        doc.storeType === 'small' || doc.storeType === 'medium' || doc.storeType === 'big'
          ? doc.storeType
          : DEFAULT_SETTINGS.storeType,
    });
  } catch (err) {
    console.error('Settings GET error:', err);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function PUT(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const body = await request.json();

    const name = String(body.name ?? DEFAULT_SETTINGS.name).trim();
    const taxRate = Number(body.taxRate ?? DEFAULT_SETTINGS.taxRate);
    const storeType =
      body.storeType === 'small' || body.storeType === 'medium' || body.storeType === 'big'
        ? body.storeType
        : DEFAULT_SETTINGS.storeType;

    if (name.length < 2) {
      return NextResponse.json({ error: 'Store name must be at least 2 characters' }, { status: 400 });
    }
    if (Number.isNaN(taxRate) || taxRate < 0 || taxRate > 50) {
      return NextResponse.json({ error: 'Tax rate must be between 0% and 50%' }, { status: 400 });
    }

    const updatePayload = {
      key: 'store_settings',
      name,
      logo: String(body.logo ?? ''),
      address: String(body.address ?? '').trim(),
      phone: String(body.phone ?? '').trim(),
      whatsappLink: String(body.whatsappLink ?? '').trim(),
      openingHours: String(body.openingHours ?? '').trim(),
      availableOnZomato: Boolean(body.availableOnZomato),
      zomatoLink: String(body.zomatoLink ?? '').trim(),
      availableOnSwiggy: Boolean(body.availableOnSwiggy),
      swiggyLink: String(body.swiggyLink ?? '').trim(),
      availableOnOwnlly: Boolean(body.availableOnOwnlly),
      ownllyLink: String(body.ownllyLink ?? '').trim(),
      gstNumber: String(body.gstNumber ?? '').trim().toUpperCase(),
      fssaiNumber: String(body.fssaiNumber ?? '').trim(),
      taxRate,
      currency: String(body.currency ?? DEFAULT_SETTINGS.currency).trim() || DEFAULT_SETTINGS.currency,
      storeType,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saved: any = await StoreSettingsModel.findOneAndUpdate(
      { key: 'store_settings' },
      { $set: updatePayload },
      { new: true, upsert: true }
    ).lean();

    return NextResponse.json({
      name: saved.name,
      logo: saved.logo ?? '',
      address: saved.address ?? '',
      phone: saved.phone ?? '',
      whatsappLink: saved.whatsappLink ?? '',
      openingHours: saved.openingHours ?? '',
      availableOnZomato: Boolean(saved.availableOnZomato),
      zomatoLink: saved.zomatoLink ?? '',
      availableOnSwiggy: Boolean(saved.availableOnSwiggy),
      swiggyLink: saved.swiggyLink ?? '',
      availableOnOwnlly: Boolean(saved.availableOnOwnlly),
      ownllyLink: saved.ownllyLink ?? '',
      gstNumber: saved.gstNumber ?? '',
      fssaiNumber: saved.fssaiNumber ?? '',
      taxRate: Number(saved.taxRate ?? 5),
      currency: saved.currency ?? 'INR (₹)',
      storeType: saved.storeType ?? 'big',
    });
  } catch (err) {
    console.error('Settings PUT error:', err);
    return NextResponse.json({ error: 'Failed to save store settings' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
