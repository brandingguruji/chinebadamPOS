'use client';

import { useEffect, useState, FormEvent } from 'react';
import { getToken } from '@/lib/auth';
import { useToast } from '@/components/ToastProvider';
import { Pagination } from '@/components/Pagination';
import {
  getDishes,
  createDish,
  updateDish,
  deleteDish,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/api';
import type { Dish, Category } from '@/types';
import clsx from 'clsx';
import { Plus, Search, Edit3, Trash2, X, CheckCircle2, Tags, Check } from 'lucide-react';

export default function ManageDishesPage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Dish modal state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Dish | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Categories modal state
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [catError, setCatError] = useState('');
  const [catSaving, setCatSaving] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');


  const token = getToken() ?? '';

  const toast = useToast();

  useEffect(() => {
    Promise.all([getDishes(token), getCategories(token)])
      .then(([d, c]) => {
        setDishes(d);
        setCategoriesList(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  // Combine MongoDB categories + any category strings already on dishes
  const allCategoryNames = Array.from(
    new Set([
      ...categoriesList.map((c) => c.name).filter(Boolean),
      ...dishes.map((d) => d.category).filter(Boolean),
    ])
  );

  const filterTabs = ['All', ...allCategoryNames];

  const filtered = dishes.filter((d) => {
    const matchCat = categoryFilter === 'All' || d.category === categoryFilter;
    const matchSearch = (d.name || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const paginatedDishes = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ─── Dish CRUD ─────────────────────────────────────────────────────────────

  function openAdd() {
    setEditing(null);
    setName('');
    setCategory(allCategoryNames[0] || '');
    setPrice('');
    setDescription('');
    setImage('');
    setAvailable(true);
    setError('');
    setShowModal(true);
  }

  function openEdit(dish: Dish) {
    setEditing(dish);
    setName(dish.name || '');
    setCategory(dish.category || allCategoryNames[0] || '');
    setPrice(String(dish.price ?? ''));
    setDescription(dish.description || '');
    setImage(dish.image || '');
    setAvailable(dish.available ?? true);
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (name.trim().length < 2) {
      setError('Dish name must be at least 2 characters.');
      return;
    }
    if (!category.trim()) {
      setError('Please select or enter a category.');
      return;
    }
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      setError('Price must be greater than ₹0.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category: category.trim(),
        price: priceNum,
        description: description.trim(),
        image: image.trim(),
        available,
      };
      if (editing) {
        const updated = await updateDish(token, editing.id, payload);
        setDishes((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        toast.success(`Updated "${updated.name}"`);
      } else {
        const created = await createDish(token, payload);
        setDishes((prev) => [created, ...prev]);
        toast.success(`Added "${created.name}"`);
      }
      setShowModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save dish';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAvailable(dish: Dish) {
    try {
      const updated = await updateDish(token, dish.id, { available: !dish.available });
      setDishes((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      toast.success(`${updated.name} is now ${updated.available ? 'Available' : 'Unavailable'}`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Action failed');
    }
  }

  async function handleDelete(dish: Dish) {
    if (!confirm(`Delete "${dish.name}" from menu?`)) return;
    try {
      await deleteDish(token, dish.id);
      setDishes((prev) => prev.filter((d) => d.id !== dish.id));
      toast.success(`Deleted "${dish.name}"`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Action failed');
    }
  }

  // ─── Category CRUD ─────────────────────────────────────────────────────────

  async function handleAddCategory(e: FormEvent) {
    e.preventDefault();
    setCatError('');
    const trimmed = newCatName.trim();
    if (trimmed.length < 2) {
      setCatError('Category name must be at least 2 characters.');
      return;
    }
    setCatSaving(true);
    try {
      const created = await createCategory(token, trimmed);
      setCategoriesList((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCatName('');
      toast.success(`Category "${created.name}" added`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add category';
      setCatError(msg);
      toast.error(msg);
    } finally {
      setCatSaving(false);
    }
  }

  async function handleSaveCategoryRename(cat: Category) {
    setCatError('');
    const trimmed = editingCatName.trim();
    if (trimmed.length < 2) {
      setCatError('Category name must be at least 2 characters.');
      return;
    }
    try {
      const updated = await updateCategory(token, cat.id, trimmed);
      setCategoriesList((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name))
      );
      // Sync local dishes state to reflect renamed category
      setDishes((prev) =>
        prev.map((d) => (d.category === cat.name ? { ...d, category: updated.name } : d))
      );
      if (categoryFilter === cat.name) setCategoryFilter(updated.name);
      setEditingCatId(null);
      toast.success(`Category renamed to "${updated.name}"`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to rename category';
      setCatError(msg);
      toast.error(msg);
    }
  }

  async function handleDeleteCategory(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await deleteCategory(token, cat.id);
      setCategoriesList((prev) => prev.filter((c) => c.id !== cat.id));
      if (categoryFilter === cat.name) setCategoryFilter('All');
      toast.success(`Deleted category "${cat.name}"`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete category';
      setCatError(msg);
      toast.error(msg);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manage Dishes</h1>
          <p className="text-sm text-slate-500 mt-1">
            {dishes.length} dishes across {allCategoryNames.length} categories
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setCatError('');
              setEditingCatId(null);
              setShowCatModal(true);
            }}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-xs"
          >
            <Tags size={16} className="text-[#0D9488]" />
            Manage Categories
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-[#0D9488] hover:bg-[#0F766E] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus size={16} />
            Add Dish
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search dishes..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filterTabs.map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategoryFilter(cat); setPage(1); }}
              className={clsx(
                'px-3.5 py-2 rounded-xl text-xs font-semibold transition-all',
                categoryFilter === cat
                  ? 'bg-[#0D9488] text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {paginatedDishes.map((dish) => (
          <div
            key={dish.id}
            className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col"
          >
            <div className="flex justify-end gap-1.5 mb-2">
              <button
                onClick={() => openEdit(dish)}
                className="text-slate-400 hover:text-teal-600 transition"
                title="Edit dish"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => handleDelete(dish)}
                className="text-slate-400 hover:text-rose-600 transition"
                title="Delete dish"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="flex justify-center mb-3">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-teal-50 border-2 border-slate-100 flex items-center justify-center">
                {dish.image ? (
                  <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-teal-600 text-2xl font-bold">{(dish.name || '?').charAt(0)}</span>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-400 mb-0.5">{dish.category}</div>
            <div className="text-sm font-bold text-slate-800 leading-tight mb-1 line-clamp-2">
              {dish.name}
            </div>
            <div className="text-sm font-bold text-teal-600 mb-3">₹{Number(dish.price || 0).toFixed(2)}</div>

            <button
              onClick={() => handleToggleAvailable(dish)}
              className={clsx(
                'mt-auto text-xs px-2 py-1.5 rounded-full font-semibold text-center transition',
                dish.available
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-rose-100 text-rose-600 hover:bg-rose-200'
              )}
            >
              {dish.available ? 'Available' : 'Unavailable'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
        <Pagination
          currentPage={page}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      {/* Add / Edit Dish Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">
                {editing ? 'Edit Dish' : 'Add New Dish'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl px-3.5 py-2.5">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Chicken Steamed Momos"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="" disabled>Select category</option>
                    {allCategoryNames.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 120"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description (optional)"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Image URL (optional)</label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                Available on menu
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-teal-300 text-white text-xs font-semibold"
                >
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Categories Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tags size={18} className="text-[#0D9488]" />
                <h2 className="text-lg font-bold text-slate-800">Manage Categories</h2>
              </div>
              <button onClick={() => setShowCatModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {catError && (
              <div className="mb-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl px-3.5 py-2.5">
                {catError}
              </div>
            )}

            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="New category name (e.g. Momos)"
                className="flex-1 px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={catSaving}
                className="px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-teal-300 text-white text-xs font-semibold flex items-center gap-1"
              >
                <Plus size={14} />
                Add
              </button>
            </form>

            {/* Existing Categories List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
              {categoriesList.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No categories in MongoDB yet. Add your first category above.
                </div>
              ) : (
                categoriesList.map((cat) => {
                  const isEditing = editingCatId === cat.id;
                  return (
                    <div key={cat.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="flex-1 px-2.5 py-1 text-xs border border-teal-400 rounded-lg focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                      )}

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSaveCategoryRename(cat)}
                              className="p-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100"
                              title="Save"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCatId(null)}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCatId(cat.id);
                                setEditingCatName(cat.name);
                                setCatError('');
                              }}
                              className="p-1.5 text-slate-400 hover:text-teal-600 transition"
                              title="Rename category"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                              title="Delete category"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
