import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { serializeDoc } from '@/lib/seed';
import { StoreSettingsModel, CategoryModel, DishModel } from '@/lib/models';
import { DEFAULT_SETTINGS } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();

    const [settingsDoc, rawCategories, rawDishes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      StoreSettingsModel.findOne({ key: 'store_settings' }).lean() as Promise<any>,
      CategoryModel.find().sort({ name: 1 }).lean(),
      DishModel.find({ available: { $ne: false } }).sort({ category: 1, name: 1 }).lean(),
    ]);

    const dishes = rawDishes.map(serializeDoc);
    const dbCategoryNames = rawCategories.map((c) => serializeDoc(c).name).filter(Boolean);
    const dishCategoryNames = dishes.map((d) => d.category).filter(Boolean);

    // Combine categories preserving DB order, then any extra categories found on dishes
    const uniqueCategories = Array.from(new Set([...dbCategoryNames, ...dishCategoryNames]));

    const categories = uniqueCategories
      .map((catName) => {
        const catDishes = dishes.filter((d) => d.category === catName);
        const firstImage = catDishes.find((d) => d.image)?.image || '';
        return {
          name: catName,
          count: catDishes.length,
          image: firstImage,
        };
      })
      .filter((c) => c.count > 0);

    const store = {
      name: settingsDoc?.name ?? DEFAULT_SETTINGS.name,
      logo: settingsDoc?.logo ?? '',
      address: settingsDoc?.address ?? '',
      phone: settingsDoc?.phone ?? '',
      whatsappLink: settingsDoc?.whatsappLink ?? '',
      taxRate: settingsDoc?.taxRate !== undefined ? Number(settingsDoc.taxRate) : DEFAULT_SETTINGS.taxRate,
      currency: settingsDoc?.currency ?? DEFAULT_SETTINGS.currency,
    };

    return NextResponse.json({ store, categories, dishes });
  } catch (err) {
    console.error('Public menu GET error:', err);
    return NextResponse.json({ error: 'Failed to load menu' }, { status: 500 });
  }
}
