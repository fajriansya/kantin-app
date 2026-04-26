"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../hooks/useAuth";

export default function AddProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { userRole, loading: authLoading } = useAuth();
  
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const categories = ["Makanan", "Minuman", "Snack", "Dessert", "Lainnya"];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    router.push("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !price || !category) {
      alert("Mohon isi semua field yang diperlukan!");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("products").insert([{
      name,
      price: parseFloat(price),
      category,
      description: description || null,
      stock: stock ? parseInt(stock) : null,
      image_url: imageUrl || null,
      created_at: new Date().toISOString()
    }]);

    setLoading(false);

    if (error) {
      alert("Gagal menambahkan produk: " + error.message);
      return;
    }

    alert("✅ Produk berhasil ditambahkan!");
    router.push("/admin/products");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-amber-600 px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-3xl">➕</span>
                <h1 className="text-2xl font-bold text-white">Tambah Produk Baru</h1>
              </div>
              <Link href="/admin/products" className="text-white hover:bg-white/20 px-4 py-2 rounded-lg transition-all">
                ← Kembali
              </Link>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Nama Produk *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200 text-gray-800 bg-gray-50"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Harga (Rp) *</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-gray-50"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Kategori *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-gray-50"
                  required
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Stok (Opsional)</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">URL Gambar (Opsional)</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/gambar.jpg"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Deskripsi</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-gray-50 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-amber-700 transition-all disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "💾 Simpan Produk"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}