"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";

export default function AddProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { userRole, loading: authLoading } = useAuth();
  
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const categories = ["Makanan", "Minuman", "Snack", "Dessert", "Lainnya"];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    router.push("/");
    return null;
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    
    setUploading(true);
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, imageFile);

    if (uploadError) {
      alert("Gagal upload gambar: " + uploadError.message);
      setUploading(false);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    setUploading(false);
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !price || !category) {
      alert("Mohon isi semua field yang diperlukan!");
      return;
    }

    if (parseFloat(price) <= 0) {
      alert("Harga harus lebih dari 0!");
      return;
    }

    setLoading(true);

    // Upload image jika ada
    let imageUrl = "";
    if (imageFile) {
      const uploadedUrl = await uploadImage();
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      }
    }

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
    
    // Reset form
    setName("");
    setPrice("");
    setCategory("");
    setDescription("");
    setStock("");
    setImageFile(null);
    setImagePreview("");
    
    router.push("/admin/products");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-600 px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-3xl">➕</span>
                <h1 className="text-2xl font-bold text-white">Tambah Produk Baru</h1>
              </div>
              <Link 
                href="/admin/products" 
                className="text-white hover:bg-white/20 px-4 py-2 rounded-lg transition-all flex items-center gap-2"
              >
                <span>←</span>
                <span>Kembali</span>
              </Link>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Nama Produk */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Nama Produk <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Nasi Goreng Spesial"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200 text-gray-800 bg-gray-50 transition-all"
                required
              />
            </div>

            {/* Harga dan Kategori */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Harga (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="25000"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-gray-50 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Kategori <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-gray-50 transition-all"
                  required
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stok */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Stok (Opsional)
              </label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="Jumlah stok tersedia"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-gray-50 transition-all"
              />
              <p className="text-xs text-gray-400 mt-1">Kosongkan jika stok tidak terbatas</p>
            </div>

            {/* Upload Gambar */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Foto Produk
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-orange-400 transition-all">
                {imagePreview ? (
                  <div className="space-y-3">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="max-h-48 mx-auto rounded-lg shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview("");
                      }}
                      className="text-red-500 text-sm hover:text-red-600 transition-colors"
                    >
                      Hapus Gambar
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label 
                      htmlFor="image-upload" 
                      className="cursor-pointer inline-flex flex-col items-center gap-2"
                    >
                      <span className="text-5xl">📸</span>
                      <span className="text-gray-600">Klik untuk upload gambar</span>
                      <span className="text-xs text-gray-400">Format: JPG, PNG, GIF (Max 5MB)</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Deskripsi */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Deskripsi Produk
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Deskripsikan produk Anda..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200 text-gray-800 bg-gray-50 transition-all resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || uploading}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-amber-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {loading || uploading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <span>{uploading ? "Mengupload gambar..." : "Menyimpan produk..."}</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Simpan Produk</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}