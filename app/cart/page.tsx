"use client";

import { useCart } from "@/lib/cart";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type ProductStock = {
  id: string;
  stock: number;
  name: string;
};

export default function CartPage() {
  const { cart, removeFromCart, clearCart, updateQuantity } = useCart();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userSession, setUserSession] = useState<any>(null);
  const [productStocks, setProductStocks] = useState<Map<string, number>>(new Map());
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          router.push("/login");
          return;
        }

        const expiresAt = new Date(session.expires_at! * 1000);
        const now = new Date();
        
        if (expiresAt < now) {
          await supabase.auth.signOut();
          router.push("/login");
          return;
        }

        setUserSession(session.user);
        
      } catch (error) {
        console.error("Auth error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          router.push("/login");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Fetch product stocks
  useEffect(() => {
    const fetchStocks = async () => {
      if (cart.length === 0) return;
      
      const productIds = cart.map(item => item.id);
      const { data } = await supabase
        .from("products")
        .select("id, stock, name")
        .in("id", productIds);
      
      if (data) {
        const stockMap = new Map();
        data.forEach(product => {
          stockMap.set(product.id, product.stock);
        });
        setProductStocks(stockMap);
      }
    };
    
    fetchStocks();
  }, [cart]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  // Cek apakah ada masalah dengan stok
  const hasStockIssue = () => {
    for (const item of cart) {
      const currentStock = productStocks.get(item.id);
      // Jika stok habis atau quantity melebihi stok
      if (currentStock === 0 || (currentStock !== undefined && currentStock !== null && item.qty > currentStock)) {
        return true;
      }
    }
    return false;
  };

  const getStockIssueMessage = () => {
    for (const item of cart) {
      const currentStock = productStocks.get(item.id);
      if (currentStock === 0) {
        return `"${item.name}" stok habis`;
      }
      if (currentStock !== undefined && currentStock !== null && item.qty > currentStock) {
        return `"${item.name}" quantity melebihi stok (max ${currentStock})`;
      }
    }
    return "";
  };

  const handleQuantityChange = (id: string, newQty: number, currentStock: number | undefined) => {
    if (newQty < 1) {
      removeFromCart(id);
    } else {
      // Cek stok sebelum update quantity
      if (currentStock !== undefined && currentStock !== null && newQty > currentStock) {
        alert(`Stok tidak mencukupi! Maksimal ${currentStock} item.`);
        return;
      }
      
      if (updateQuantity && typeof updateQuantity === 'function') {
        updateQuantity(id, newQty);
      }
    }
  };

  const handleCheckout = async () => {
    // Cek stok sebelum checkout
    if (hasStockIssue()) {
      alert(`Tidak dapat melanjutkan checkout karena:\n${getStockIssueMessage()}`);
      return;
    }
    
    setCheckoutLoading(true);
    
    // Verifikasi ulang stok ke database
    for (const item of cart) {
      const { data: product } = await supabase
        .from("products")
        .select("stock, name")
        .eq("id", item.id)
        .single();
      
      if (product && product.stock !== null && product.stock < item.qty) {
        alert(`❌ Stok ${product.name} tidak mencukupi!\nTersisa: ${product.stock} item\nDiminta: ${item.qty} item`);
        setCheckoutLoading(false);
        return;
      }
    }
    
    setCheckoutLoading(false);
    router.push("/checkout");
  };

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-orange-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-500">Memeriksa sesi login...</p>
        </div>
      </div>
    );
  }

  const isCheckoutDisabled = hasStockIssue() || checkoutLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* HEADER */}
      <div className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-white shadow-md" 
          : "bg-white border-b border-gray-100"
      } px-6 py-4`}>
        
        <div className="max-w-7xl mx-auto flex justify-between items-center">
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
            
            <Link 
              href="/" 
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-orange-600 transition-colors"
            >
              <span>←</span>
              <span>Kembali</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Cart Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Keranjang Belanja</h1>
          <p className="text-gray-500 text-sm">{cart.length} item dalam keranjang</p>
        </div>

        {cart.length === 0 ? (
          // Empty Cart State
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Keranjang masih kosong</h2>
            <p className="text-gray-500 mb-6">Yuk, mulai pesan makanan favoritmu!</p>
            <Link 
              href="/" 
              className="inline-block px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Cart Items - Left Column */}
            <div className="lg:col-span-2 space-y-3">
              {cart.map((item) => {
                const currentStock = productStocks.get(item.id);
                const isOutOfStock = currentStock === 0;
                const isLowStock = currentStock !== undefined && currentStock !== null && currentStock <= 5 && currentStock > 0;
                const stockExceeded = currentStock !== undefined && currentStock !== null && item.qty > currentStock;
                
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-lg shadow-sm border p-4 transition-all ${
                      stockExceeded ? 'border-red-300 bg-red-50' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-bold bg-red-500 px-1 py-0.5 rounded">HABIS</span>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <Link href={`/product/${item.id}`}>
                            <h3 className="font-medium text-gray-800 hover:text-orange-600 transition">
                              {item.name}
                            </h3>
                          </Link>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                        
                        <p className="text-orange-600 font-semibold text-lg mt-1">
                          {formatPrice(item.price)}
                        </p>

                        {/* Stock Info */}
                        {currentStock !== undefined && currentStock !== null && (
                          <div className="mt-1">
                            {isOutOfStock ? (
                              <span className="text-xs text-red-500">Stok habis</span>
                            ) : isLowStock ? (
                              <span className="text-xs text-orange-500">Sisa {currentStock} item</span>
                            ) : (
                              <span className="text-xs text-green-500">Stok {currentStock} item</span>
                            )}
                          </div>
                        )}

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.qty - 1, currentStock)}
                            disabled={isOutOfStock}
                            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            -
                          </button>
                          <span className={`text-gray-700 font-medium min-w-[30px] text-center ${stockExceeded ? 'text-red-600' : ''}`}>
                            {item.qty}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.qty + 1, currentStock)}
                            disabled={isOutOfStock || (currentStock !== undefined && currentStock !== null && item.qty >= currentStock)}
                            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                          <span className="text-sm text-gray-400 ml-2">
                            Subtotal: {formatPrice(item.price * item.qty)}
                          </span>
                        </div>

                        {stockExceeded && (
                          <p className="text-xs text-red-500 mt-1">
                            ⚠️ Melebihi stok! Maksimal {currentStock}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary - Right Column */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
                  <h2 className="font-semibold text-gray-800 text-lg mb-4">Ringkasan Pesanan</h2>
                  
                  <div className="flex justify-between mb-3 pb-3 border-b border-gray-100">
                    <span className="text-gray-600">Total Item</span>
                    <span className="font-semibold text-gray-800">
                      {cart.reduce((sum, item) => sum + item.qty, 0)} item
                    </span>
                  </div>

                  <div className="flex justify-between mb-4 pb-3 border-b border-gray-100">
                    <span className="text-gray-600">Total</span>
                    <span className="text-xl font-bold text-orange-600">
                      {formatPrice(total)}
                    </span>
                  </div>

                  {/* Peringatan jika ada masalah stok */}
                  {hasStockIssue() && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600 font-medium">⚠️ Tidak dapat checkout</p>
                      <p className="text-xs text-red-500 mt-1">{getStockIssueMessage()}</p>
                    </div>
                  )}

                  {/* Checkout Button */}
                  <button
                    onClick={handleCheckout}
                    disabled={isCheckoutDisabled}
                    className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                      isCheckoutDisabled
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-green-500 hover:bg-green-600 text-white"
                    }`}
                  >
                    {checkoutLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        <span>Memeriksa Stok...</span>
                      </>
                    ) : (
                      <>
                        <span>✅</span>
                        <span>Lanjut ke Pembayaran</span>
                      </>
                    )}
                  </button>

                  {/* Clear Cart Button */}
                  <button
                    onClick={clearCart}
                    className="w-full mt-3 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    Kosongkan Keranjang
                  </button>

                  {/* Continue Shopping Link */}
                  <Link 
                    href="/"
                    className="block text-center mt-4 text-sm text-gray-500 hover:text-orange-600 transition"
                  >
                    ← Lanjutkan Belanja
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>

    </div>
  );
}