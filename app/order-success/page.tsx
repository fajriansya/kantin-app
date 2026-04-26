"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/lib/cart";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string;
};

export default function Page() {
  const [products, setProducts] = useState<Product[]>([]);
  const { addToCart, cart } = useCart();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [userSession, setUserSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
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
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*");
    setProducts(data || []);
  };

  const cartCount = cart.reduce((total, item) => total + item.qty, 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Memeriksa sesi login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-gray-50">
      
      {/* HEADER */}
      <div className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-white/95 backdrop-blur-md shadow-lg" 
          : "bg-gradient-to-r from-orange-500 to-amber-600"
      } text-white px-6 py-4`}>
        
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-3xl transition-transform group-hover:scale-110">🍽️</span>
            <span className="text-xl font-bold tracking-tight font-['Playfair_Display']">
              KANTIN
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm bg-white/20 px-3 py-1 rounded-full">
              <span>👤</span>
              <span>{userSession?.email?.split('@')[0]}</span>
            </div>
            
            <Link href="/cart" className="relative">
              <span className="text-2xl">🛒</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-orange-500 to-amber-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-6xl animate-float">🍕</div>
          <div className="absolute bottom-10 right-10 text-6xl animate-float-delayed">🍝</div>
          <div className="absolute top-1/2 left-1/3 text-5xl animate-float-slow">🥗</div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold font-['Playfair_Display'] mb-4">
            Menu Spesial Hari Ini
          </h1>
          <p className="text-lg md:text-xl opacity-90">
            Temukan hidangan terbaik untuk setiap suasana
          </p>
        </div>
      </div>

      {/* Search & Filter Section */}
      <div className="sticky top-[73px] z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
              🔍
            </span>
            <input
              placeholder="Cari produk favoritmu..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition-all text-gray-700"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {["Semua", "Elektronik", "Fashion", "Gaming"].map((c) => (
              <button
                key={c}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                {c === "Semua" ? "🍽️ Semua" : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600 text-sm">
            Menampilkan <span className="font-semibold text-orange-600">{products.length}</span> produk
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((p, index) => (
            <div
              key={p.id}
              className="group bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Link href={`/product/${p.id}`} className="block relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                <div className="relative h-56 w-full">
                  <img 
                    src={p.image_url} 
                    alt={p.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
              </Link>

              <div className="p-4">
                <Link href={`/product/${p.id}`}>
                  <h3 className="font-semibold text-gray-800 text-md mb-1 line-clamp-1 hover:text-orange-600 transition">
                    {p.name}
                  </h3>
                </Link>
                
                <p className="text-orange-600 font-bold text-lg mb-3">
                  {formatPrice(p.price)}
                </p>

                <button
                  onClick={() => addToCart(p)}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white py-2.5 rounded-xl font-medium text-sm hover:from-orange-600 hover:to-amber-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-md"
                >
                  <span>🛒</span>
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Checkout Button */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 animate-slide-up z-50">
          <Link href="/checkout">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl shadow-2xl overflow-hidden transform hover:scale-105 transition-all duration-300">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛒</span>
                  <div>
                    <p className="font-bold text-lg">{cartCount} Items</p>
                    <p className="text-sm opacity-90">Ready to checkout</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-80">Total</p>
                  <p className="font-bold text-xl">
                    {formatPrice(cart.reduce((sum, item) => sum + item.price * item.qty, 0))}
                  </p>
                </div>
              </div>
              <div className="bg-green-600 px-6 py-2 text-center text-sm font-semibold">
                Checkout Now →
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Custom CSS */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-5deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-25px) rotate(3deg); }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 7s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
          opacity: 0;
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}