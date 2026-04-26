"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/lib/cart";
import Link from "next/link";

type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category?: string;
  description?: string;
  stock?: number | null;  // ✅ tambah | null
};

export default function ProductDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [userSession, setUserSession] = useState<any>(null);
  const { addToCart, cart } = useCart();

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          router.push("/login");
          return;
        }

        setUserSession(session.user);
      } catch (error) {
        console.error("Auth error:", error);
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching product:", error);
    } else {
      setProduct(data);
    }
    setLoading(false);
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    // Cek stok sebelum menambah ke cart
    if (product.stock !== null && product.stock !== undefined && product.stock < quantity) {
      alert(`Stok tidak mencukupi! Tersisa ${product.stock} item.`);
      return;
    }
    
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const cartCount = cart.reduce((total, item) => total + item.qty, 0);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-orange-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-500">Memuat produk...</p>
        </div>
      </div>
    );
  }

  // Product not found
  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Produk Tidak Ditemukan</h2>
          <Link href="/" className="text-orange-500 hover:text-orange-600">Kembali Belanja</Link>
        </div>
      </div>
    );
  }

  // Setelah product pasti ada, baru hitung stok
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock !== null && product.stock !== undefined && product.stock > 0 && product.stock <= 5;
  const hasStock = product.stock !== null && product.stock !== undefined;
  const stockAmount = product.stock !== null && product.stock !== undefined ? product.stock : null;

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* HEADER */}
      <div className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-white shadow-md" 
          : "bg-white border-b border-gray-100"
      } px-6 py-4`}>
        
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Kantin
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
              <span>👤</span>
              <span>{userSession?.email?.split('@')[0]}</span>
            </div>
            
            <Link href="/cart" className="relative">
              <span className="text-xl">🛒</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Product Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Back Button */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-1 text-gray-500 hover:text-orange-600 mb-6 text-sm transition-colors"
        >
          ← Kembali
        </Link>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 p-6">
            
            {/* Image Section */}
            <div className="bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={product.image_url || "https://via.placeholder.com/500?text=No+Image"}
                alt={product.name}
                className="w-full h-96 object-cover"
              />
            </div>

            {/* Product Info Section */}
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">{product.name}</h1>
              
              {product.category && (
                <span className="inline-block px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-sm mb-4">
                  {product.category}
                </span>
              )}

              <div className="mb-4">
                <p className="text-2xl font-bold text-orange-600">{formatPrice(product.price)}</p>
              </div>

              {/* Stock Info with amount */}
              <div className="mb-4">
                {isOutOfStock ? (
                  <div className="flex items-center gap-2 text-red-600">
                    <span className="text-lg">❌</span>
                    <span className="font-medium">Stok Habis</span>
                  </div>
                ) : isLowStock ? (
                  <div className="flex items-center gap-2 text-orange-600">
                    <span className="text-lg">⚠️</span>
                    <span className="font-medium">Sisa {product.stock} item</span>
                  </div>
                ) : hasStock ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <span className="text-lg">✅</span>
                    <span className="font-medium">Stok {stockAmount} item</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-blue-600">
                    <span className="text-lg">♾️</span>
                    <span className="font-medium">Stok tidak terbatas</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div className="mb-4">
                  <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={isOutOfStock}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    -
                  </button>
                  <span className="text-lg font-semibold text-gray-800 min-w-[40px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => {
                      if (hasStock && quantity >= product.stock!) {
                        alert(`Stok maksimal ${product.stock} item`);
                        return;
                      }
                      setQuantity(quantity + 1);
                    }}
                    disabled={isOutOfStock || (hasStock && quantity >= product.stock!)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isOutOfStock
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-orange-500 hover:bg-orange-600 text-white"
                }`}
              >
                {addedToCart ? (
                  <>
                    <span>✅</span>
                    <span>Berhasil Ditambahkan!</span>
                  </>
                ) : isOutOfStock ? (
                  <>
                    <span>❌</span>
                    <span>Stok Habis</span>
                  </>
                ) : (
                  <>
                    <span>🛒</span>
                    <span>Tambahkan ke Keranjang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Checkout Button */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 animate-slide-up z-50">
          <Link href="/checkout">
            <div className="bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-lg overflow-hidden transition-all">
              <div className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{cartCount} Item</p>
                  <p className="text-xs opacity-90">Total</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">
                    {formatPrice(cart.reduce((sum, item) => sum + item.price * item.qty, 0))}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}