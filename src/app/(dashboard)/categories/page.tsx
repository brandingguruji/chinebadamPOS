'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import { getToken } from '@/lib/auth';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { Pagination } from '@/components/Pagination';
import type { Category } from '@/types';
import { Plus, Edit3, Trash2, Check, X, Tags, Search } from 'lucide-react';

const PAGE_SIZE = 10;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const token = getToken() ?? '';
  const toast = useToast();

  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories(token);
      setCategories(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const filtered = categories.filter((c) =>
    (c.name || '').toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError('');
    const trimmed = newName.trim();
    if (trimmed.length < 2) {
      setError('Category name must be at least 2 characters.');
      return;
    }

    setSaving(true);
    try {
      const created = await createCategory(token, trimmed);
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      toast.success(`Category "${created.name}" added`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add category';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleRename(cat: Category) {
    setError('');
    const trimmed = editingName.trim();
    if (trimmed.length < 2) {
      toast.error('Category name must be at least 2 characters.');
      return;
    }
    try {
      const updated = await updateCategory(token, cat.id, trimmed);
      setCategories((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
      toast.success(`Category renamed to "${updated.name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rename category');
    }
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await deleteCategory(token, cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      toast.success(`Deleted category "${cat.name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete category');
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
    <div className="p-4 sm:p-6 max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Categories</h1>
        <p className="text-sm text-slate-500 mt-1">
          Add, rename, or remove menu categories ({categories.length} total)
        </p>
      </div>

      {/* Add Category Card */}
      <form
        onSubmit={handleAdd}
        className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm space-y-3"
      >
        <label className="block text-xs font-semibold text-slate-700">Add New Category</label>
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl px-3.5 py-2">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Momos, Beverages, Chinese Corner"
            className="flex-1 px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-teal-300 text-white text-xs font-bold transition shadow-sm"
          >
            <Plus size={15} />
            {saving ? 'Adding...' : 'Add Category'}
          </button>
        </div>
      </form>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search categories..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Categories List + Pagination */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {paginated.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No categories found. Add your first category above.
            </div>
          ) : (
            paginated.map((cat) => {
              const isEditing = editingId === cat.id;
              return (
                <div
                  key={cat.id}
                  className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D9488] flex items-center justify-center flex-shrink-0">
                      <Tags size={15} />
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm border border-teal-400 rounded-lg focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-semibold text-slate-800 truncate">{cat.name}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRename(cat)}
                          className="p-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100"
                          title="Save"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
                          title="Cancel"
                        >
                          <X size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(cat.id);
                            setEditingName(cat.name);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition"
                          title="Edit category"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete category"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Pagination
          currentPage={page}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
