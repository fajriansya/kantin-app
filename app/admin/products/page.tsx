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
  stock?: number | null;
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isImageChanged, setIsImageChanged] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (userRole !== "admin") {
        router.push("/");
        return;
      }
      fetchProducts();
    }
  }, [authLoading, userRole]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    const safeData = (data || []).map((p: any) => ({
      ...p,
      stock: p.stock ?? 0,
    }));

    setProducts(safeData);
    setLoading(false);
  };

  // Fungsi untuk menghapus gambar dari storage Supabase
  const deleteOldImageFromStorage = async (oldImageUrl: string) => {
    if (!oldImageUrl) return;
    
    try {
      // Ekstrak path dari URL
      const urlParts = oldImageUrl.split('/');
      const filePath = urlParts.slice(urlParts.indexOf('product-images') + 1).join('/');
      
      if (filePath) {
        const { error } = await supabase.storage
          .from("product-images")
          .remove([filePath]);
        
        if (error) {
          console.error("Gagal hapus gambar lama:", error);
        } else {
          console.log("Gambar lama berhasil dihapus");
        }
      }
    } catch (error) {
      console.error("Error menghapus gambar:", error);
    }
  };

  const deleteProduct = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus produk ini?")) {
      setDeletingId(id);
      
      // Cari produk yang akan dihapus
      const productToDelete = products.find(p => p.id === id);
      
      // Hapus dari database dulu
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (!error) {
        // Jika berhasil hapus dari database, hapus juga gambar dari storage
        if (productToDelete?.image_url) {
          await deleteOldImageFromStorage(productToDelete.image_url);
        }
        
        setProducts(products.filter((product) => product.id !== id));
        alert("Produk berhasil dihapus");
      } else {
        alert("Gagal menghapus produk: " + error.message);
      }
      setDeletingId(null);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct({ ...product });
    setImagePreview(product.image_url || "");
    setImageFile(null);
    setIsImageChanged(false);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return editingProduct?.image_url || null;

    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from("product-images")
      .upload(filePath, imageFile);

    if (uploadError) {
      alert("Gagal upload gambar: " + uploadError.message);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("product-images").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setEditLoading(true);

    try {
      let imageUrl = editingProduct.image_url;
      
      // Jika ada gambar baru yang diupload
      if (imageFile && isImageChanged) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          // Hapus gambar lama sebelum update dengan gambar baru
          if (editingProduct.image_url) {
            await deleteOldImageFromStorage(editingProduct.image_url);
          }
          imageUrl = uploadedUrl;
        }
      }
      
      // Jika gambar dihapus (tidak ada gambar baru dan preview kosong)
      if (!imageFile && isImageChanged && !imagePreview) {
        if (editingProduct.image_url) {
          await deleteOldImageFromStorage(editingProduct.image_url);
        }
        imageUrl = "";
      }

      const { error } = await supabase
        .from("products")
        .update({
          name: editingProduct.name,
          price: editingProduct.price,
          category: editingProduct.category,
          stock: editingProduct.stock === null ? null : Number(editingProduct.stock),
          image_url: imageUrl,
        })
        .eq("id", editingProduct.id);

      if (error) {
        alert("Gagal mengupdate produk: " + error.message);
      } else {
        alert("Produk berhasil diupdate");
        setEditingProduct(null);
        setImageFile(null);
        setImagePreview("");
        setIsImageChanged(false);
        fetchProducts();
      }
    } catch (error) {
      console.error("Error update produk:", error);
      alert("Terjadi kesalahan saat mengupdate produk");
    } finally {
      setEditLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setIsImageChanged(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    setIsImageChanged(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (userRole !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Kelola Produk
          </h1>

          <div className="flex items-center gap-6">
            <Link
              href="/admin/orders"
              className="text-sm text-gray-600 hover:text-orange-600"
            >
              Pesanan
            </Link>
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-orange-600"
            >
              Beranda
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tombol Tambah */}
        <div className="mb-6 flex justify-end">
          <Link
            href="/admin/add-product"
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg"
          >
            + Tambah Produk
          </Link>
        </div>

        {/* Tabel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">
                    Produk
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">
                    Harga
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">
                    Stok
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-600">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-gray-400"
                    >
                      Belum ada produk
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                className="w-full h-full object-cover"
                                alt={product.name}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                📷
                              </div>
                            )}
                          </div>
                          <span className="font-semibold text-gray-900 text-sm">
                            {product.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                          {product.category || "-"}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-bold text-gray-900 text-sm">
                        {formatPrice(product.price)}
                      </td>

                      <td className="px-6 py-4">
                        {(() => {
                          const stock = product.stock ?? 0;

                          return (
                            <span
                              className={`text-sm ${
                                stock > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {stock > 0
                                ? `${stock} tersisa`
                                : "Habis"}
                            </span>
                          );
                        })()}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-blue-600 hover:text-blue-700 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Edit */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Edit Produk</h2>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="p-6 space-y-4">
              {/* Gambar - PERBAIKAN UTAMA */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Foto Produk
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {imagePreview ? (
                    <div className="space-y-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded-lg mx-auto"
                      />
                      <div className="flex gap-2 justify-center">
                        <label className="cursor-pointer px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                          Ganti
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer block py-4">
                      <div className="text-gray-500">
                        📸 Klik untuk upload gambar
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
                {!imagePreview && editingProduct.image_url && (
                  <p className="text-xs text-gray-400 mt-1">
                    Gambar saat ini: {editingProduct.image_url.split('/').pop()}
                  </p>
                )}
              </div>

              {/* Nama Produk */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Nama Produk
                </label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Masukkan nama produk..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Harga */}
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Harga
                  </label>
                  <input
                    type="number"
                    value={editingProduct.price}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        price: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                {/* Kategori */}
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Kategori
                  </label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        category: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Makanan">Makanan</option>
                    <option value="Minuman">Minuman</option>
                    <option value="Snack">Snack</option>
                    <option value="Dessert">Dessert</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Stok */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Stok
                </label>
                <input
                  type="number"
                  value={editingProduct.stock === null ? "" : editingProduct.stock}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditingProduct({
                      ...editingProduct,
                      stock: value === "" ? null : Number(value),
                    });
                  }}
                  placeholder="Kosongkan jika tak terbatas"
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-sm text-gray-400 mt-1">
                  Kosongkan untuk stok tidak terbatas
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {editLoading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}