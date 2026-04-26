"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number | null;
  image_url: string;
  created_at: string;
};

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { userRole, loading: authLoading } = useAuth();
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (userRole !== 'admin') {
        window.location.href = '/';
        return;
      }
      fetchProducts();
    }
  }, [authLoading, userRole]);

  const fetchProducts = async () => {
    setLoading(true);
    setErrorMessage(null);
    
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching products:", error);
      setErrorMessage("Gagal memuat produk: " + error.message);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const deleteProduct = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus produk ini?")) {
      setDeletingId(id);
      const { error } = await supabase.from("products").delete().eq("id", id);
      
      if (!error) {
        setProducts(products.filter(product => product.id !== id));
        alert("✅ Produk berhasil dihapus");
        await fetchProducts();
      } else {
        console.error("Delete error:", error);
        alert("❌ Gagal menghapus produk: " + error.message);
      }
      setDeletingId(null);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct({ ...product });
    setImagePreview(product.image_url || "");
    setImageFile(null);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return editingProduct?.image_url || null;
    
    setUploadingImage(true);
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, imageFile);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      alert("❌ Gagal upload gambar: " + uploadError.message);
      setUploadingImage(false);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    setUploadingImage(false);
    return publicUrl;
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setEditLoading(true);
    setErrorMessage(null);
    
    try {
      let imageUrl = editingProduct.image_url;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }
      
      const updateData = {
        name: editingProduct.name,
        price: editingProduct.price,
        category: editingProduct.category,
        stock: editingProduct.stock === null ? null : editingProduct.stock,
        image_url: imageUrl,
        updated_at: new Date().toISOString()
      };
      
      console.log("Updating product:", editingProduct.id, updateData);
      
      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", editingProduct.id);

      if (error) {
        console.error("Update error:", error);
        setErrorMessage("Gagal mengupdate produk: " + error.message);
        alert("❌ Gagal mengupdate produk: " + error.message);
      } else {
        alert("✅ Produk berhasil diupdate");
        setEditingProduct(null);
        setImageFile(null);
        setImagePreview("");
        await fetchProducts();
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage("Terjadi kesalahan saat mengupdate produk");
      alert("❌ Terjadi kesalahan saat mengupdate produk");
    } finally {
      setEditLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Ukuran file terlalu besar! Maksimal 2MB.");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kelola Produk</h1>
            <p className="text-sm text-gray-500 mt-0.5">Atur dan kelola semua produk Anda</p>
          </div>
          
          <div className="flex items-center gap-6">
            <Link 
              href="/admin/orders" 
              className="text-sm text-gray-600 hover:text-orange-600 transition-colors"
            >
              Pesanan
            </Link>
            <Link 
              href="/" 
              className="text-sm text-gray-600 hover:text-orange-600 transition-colors"
            >
              Beranda
            </Link>

            <div className="relative">
              <button
                onClick={() => setShowLogoutMenu(!showLogoutMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">Admin</span>
                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showLogoutMenu && (
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors rounded-lg"
                  >
                    Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* Tombol Tambah */}
        <div className="mb-6 flex justify-end gap-3">
          <Link 
            href="/admin/orders"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all"
          >
            Lihat Pesanan
          </Link>
          <Link 
            href="/admin/add-product"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg shadow-sm transition-all"
          >
            Tambah Produk
          </Link>
        </div>

        {/* Tabel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Produk</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Harga</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stok</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      Belum ada produk. Klik "Tambah Produk" untuk menambahkan.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                className="w-full h-full object-cover" 
                                alt={product.name}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">📷</div>
                            )}
                          </div>
                          <span className="font-medium text-gray-900">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          {product.category || "Uncategorized"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">{formatPrice(product.price)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${
                          product.stock !== null && product.stock > 0 ? 'text-green-600' : 
                          product.stock === 0 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {product.stock !== null && product.stock > 0 ? `${product.stock} tersisa` : 
                           product.stock === 0 ? "Habis" : "Tak terbatas"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-3">
                          <button 
                            onClick={() => handleEdit(product)} 
                            className="text-sm text-gray-600 hover:text-orange-600 transition-colors font-medium"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => deleteProduct(product.id)} 
                            disabled={deletingId === product.id}
                            className="text-sm text-gray-600 hover:text-red-600 transition-colors font-medium disabled:opacity-50"
                          >
                            {deletingId === product.id ? "..." : "Hapus"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistik */}
        <div className="mt-4 flex justify-end gap-4 text-xs text-gray-400">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Tersedia
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Habis
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            Tak terbatas
          </span>
        </div>
      </main>

      {/* Modal Edit */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Edit Produk</h2>
                <p className="text-sm text-gray-500 mt-0.5">Ubah informasi produk Anda</p>
              </div>
              <button 
                onClick={() => {
                  setEditingProduct(null);
                  setImageFile(null);
                  setImagePreview("");
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="p-6 space-y-4">
              {/* Upload Gambar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Foto Produk</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-400 transition-colors">
                  {imagePreview || editingProduct.image_url ? (
                    <div className="space-y-3">
                      <img 
                        src={imagePreview || editingProduct.image_url} 
                        alt="Preview" 
                        className="w-24 h-24 object-cover rounded-lg mx-auto shadow-sm"
                      />
                      <div className="flex gap-3 justify-center">
                        <label className="cursor-pointer text-sm text-orange-600 hover:text-orange-700 font-medium">
                          Ganti Foto
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview("");
                            setImageFile(null);
                            setEditingProduct({...editingProduct, image_url: ""});
                          }}
                          className="text-sm text-red-500 hover:text-red-600"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-gray-500">Klik untuk upload gambar</span>
                        <span className="text-xs text-gray-400">Format: JPG, PNG (Max 2MB)</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Produk</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-gray-900 placeholder:text-gray-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Harga</label>
                  <input
                    type="number"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({...editingProduct, price: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-gray-900"
                  >
                    <option value="Makanan">Makanan</option>
                    <option value="Minuman">Minuman</option>
                    <option value="Snack">Snack</option>
                    <option value="Dessert">Dessert</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stok</label>
                <input
                  type="number"
                  value={editingProduct.stock === null ? "" : editingProduct.stock}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditingProduct({
                      ...editingProduct, 
                      stock: value === "" ? null : parseInt(value)
                    });
                  }}
                  placeholder="Kosongkan jika tak terbatas"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-gray-900 placeholder:text-gray-400"
                />
                <p className="text-xs text-gray-400 mt-1">Kosongkan untuk stok tidak terbatas</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setImageFile(null);
                    setImagePreview("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editLoading || uploadingImage}
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editLoading || uploadingImage ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}