"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/lib/cart";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UserMenu from "./components/UserMenu";

type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category?: string;
  description?: string;
  stock?: number | null;  // ✅ tambah | null
};

type UserSession = {
  user: any;
  session: any;
  role?: string;
};

export default function Page() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [categories, setCategories] = useState<string[]>(["Semua"]);
  const { addToCart, cart } = useCart();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [userRole, setUserRole] = useState<string>("user");
  const [loading, setLoading] = useState(true);

  // Check authentication and session
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
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

        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        const role = userData?.role || "user";
        setUserRole(role);
        setUserSession({
          user: session.user,
          session: session,
          role: role
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            if (event === 'SIGNED_OUT' || !currentSession) {
              router.push("/login");
            } else if (event === 'TOKEN_REFRESHED') {
              setUserSession({
                user: currentSession.user,
                session: currentSession,
                role: role
              });
            } else if (event === 'SIGNED_IN') {
              const { data: newUserData } = await supabase
                .from('users')
                .select('role')
                .eq('id', currentSession.user.id)
                .single();
              
              setUserSession({
                user: currentSession.user,
                session: currentSession,
                role: newUserData?.role || "user"
              });
              setUserRole(newUserData?.role || "user");
            }
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (userSession) {
      fetchProducts();
    }
  }, [userSession]);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, selectedCategory, products]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      }
    }, 5 * 60 * 1000);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearInterval(interval);
    };
  }, [router]);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*");
    setProducts(data || []);
    setFilteredProducts(data || []);
    
    if (data) {
      const uniqueCategories = ["Semua", ...new Set(data.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories as string[]);
    }
  };

  const filterProducts = () => {
    let filtered = products;
    
    if (selectedCategory !== "Semua") {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    if (searchTerm.trim()) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredProducts(filtered);
  };

  const cartCount = cart.reduce((total, item) => total + item.qty, 0);
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.qty), 0);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
          <p className="mt-3 text-gray-500 text-sm">Memeriksa sesi login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* HEADER - SEMUA SEJAJAR dalam 1 BARIS */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-white/90 backdrop-blur-md shadow-sm" 
          : "bg-white border-b border-gray-100"
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-2.5">
          {/* Semua elemen dalam 1 baris flex */}
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">K</span>
              </div>
              <span className="text-lg font-semibold text-gray-800 tracking-tight">Kantin</span>
            </Link>

            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                placeholder="Cari produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400 text-sm text-gray-700"
              />
            </div>

            {/* Filter Categories */}
            <div className="flex gap-2 overflow-x-auto pb-1 shrink">
              {categories.slice(0, 6).map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === c
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {c === "Semua" ? "Semua" : c}
                </button>
              ))}
            </div>

            {/* Navigation Menu */}
            <div className="flex items-center gap-4 shrink-0">
              <Link 
                href="/orders" 
                className="text-sm text-gray-600 hover:text-orange-600 transition-colors"
              >
                Pesanan
              </Link>

              <Link 
                href="/cart" 
                className="relative text-gray-600 hover:text-orange-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 1.5M17 13l1.5 1.5M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-3 bg-orange-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>

              <UserMenu 
                userEmail={userSession?.user?.email || ""} 
                userRole={userRole}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Simple Greeting */}
      <div className="px-6 py-3">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-gray-500">
            Selamat datang, <span className="font-medium text-gray-700">{userSession?.user?.email?.split('@')[0]}</span>
          </p>
        </div>
      </div>

      {/* PRODUCTS Section */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-gray-400 text-sm">Produk tidak ditemukan</p>
            <button 
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("Semua");
              }}
              className="mt-2 text-orange-500 text-xs hover:underline"
            >
              Reset filter
            </button>
          </div>
        ) : (
          <>
            <p className="text-gray-400 text-xs mb-4">{filteredProducts.length} produk ditemukan</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock === 0;
                const stock = p.stock ?? 0;
const isLowStock = stock > 0 && stock <= 5;
                
                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all"
                  >
                    <Link href={`/product/${p.id}`} className="block relative">
                      <div className="relative h-36 w-full bg-gray-100">
                        <img 
                          src={p.image_url} 
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[10px] font-semibold">HABIS</span>
                          </div>
                        )}
                      </div>
                      {p.category && (
                        <span className="absolute top-1.5 left-1.5 bg-white/90 text-orange-600 text-[10px] px-1.5 py-0.5 rounded-full">
                          {p.category}
                        </span>
                      )}
                    </Link>

                    <div className="p-2.5">
                      <Link href={`/product/${p.id}`}>
                        <h3 className="font-medium text-gray-800 text-xs mb-0.5 line-clamp-1 hover:text-orange-600">
                          {p.name}
                        </h3>
                      </Link>
                      
                      <p className="text-orange-600 font-semibold text-sm">
                        {formatPrice(p.price)}
                      </p>

                      <div className="mt-1 mb-1.5">
                        {isOutOfStock ? (
                          <span className="text-[10px] text-red-500">Stok habis</span>
                        ) : isLowStock ? (
                          <span className="text-[10px] text-orange-500">Sisa {p.stock}</span>
                        ) : p.stock !== null ? (
                          <span className="text-[10px] text-green-500">Stok {p.stock}</span>
                        ) : (
                          <span className="text-[10px] text-gray-400">Tersedia</span>
                        )}
                      </div>

                      <button
                        onClick={() => addToCart(p)}
                        disabled={isOutOfStock}
                        className={`w-full py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                          isOutOfStock
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-orange-500 hover:bg-orange-600 text-white"
                        }`}
                      >
                        {isOutOfStock ? "Stok Habis" : "+ Tambah"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* FLOATING CHECKOUT BUTTON */}
      {cartCount > 0 && (
        <div className="fixed bottom-5 right-5 z-50">
          <Link href="/checkout">
            <div className="bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg px-4 py-2.5 flex items-center gap-2 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 1.5M17 13l1.5 1.5M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              <div>
                <p className="font-semibold text-xs">{cartCount} item</p>
                <p className="text-xs font-bold">{formatPrice(cartTotal)}</p>
              </div>
            </div>
          </Link>
        </div>
      )}

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