"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Order = {
  id: string;
  customer_name: string;
  address: string;
  phone?: string;
  total: number;
  subtotal?: number;
  shipping_cost?: number;
  tax?: number;
  status: string;
  payment_method?: string;
  payment_proof?: string;
  payment_proof_status?: string;
  payment_detail?: string;
  created_at: string;
  items: any[];
  notes?: string;
  user_id?: string;
};

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState("semua");
  const [isScrolled, setIsScrolled] = useState(false);
  const [userSession, setUserSession] = useState<any>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedProofUrl, setSelectedProofUrl] = useState("");
  const router = useRouter();

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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (userSession) {
      fetchOrders();
    }
  }, [userSession]);

  const fetchOrders = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userSession?.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setOrders(data || []);
    } else {
      console.error("Error fetching orders:", error);
    }

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      waiting_payment: "bg-orange-100 text-orange-800 border-orange-200",
      payment_review: "bg-purple-100 text-purple-800 border-purple-200",
      processing: "bg-blue-100 text-blue-800 border-blue-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
      delivered: "bg-purple-100 text-purple-800 border-purple-200",
      expired: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return statusMap[status.toLowerCase()] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusIcon = (status: string) => {
    const iconMap: Record<string, string> = {
      pending: "⏳",
      waiting_payment: "💳",
      payment_review: "👀",
      processing: "⚙️",
      completed: "✅",
      cancelled: "❌",
      delivered: "🚚",
      expired: "⌛",
    };
    return iconMap[status.toLowerCase()] || "📦";
  };

  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      pending: "Menunggu Konfirmasi",
      waiting_payment: "Menunggu Pembayaran",
      payment_review: "Verifikasi Pembayaran",
      processing: "Diproses",
      completed: "Selesai",
      cancelled: "Dibatalkan",
      delivered: "Terkirim",
      expired: "Kadaluarsa",
    };
    return textMap[status.toLowerCase()] || status;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const filteredOrders = filterStatus === "semua" 
    ? orders 
    : orders.filter(order => order.status.toLowerCase() === filterStatus);

  const openProofModal = (url: string) => {
    setSelectedProofUrl(url);
    setShowProofModal(true);
  };

  if (!userSession && loading) {
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
            
            <Link 
              href="/" 
              className="flex items-center gap-2 text-sm font-medium hover:bg-white/20 px-4 py-2 rounded-full transition-all"
            >
              <span>🛒</span>
              <span>Belanja Lagi</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">📦</span>
            <h1 className="text-3xl md:text-4xl font-bold font-['Playfair_Display'] text-gray-800">
              Pesanan Saya
            </h1>
          </div>
          <p className="text-gray-600 ml-12">
            Lihat riwayat dan status pesanan Anda
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2">
            {[
              { value: "semua", label: "Semua", icon: "📋" },
              { value: "pending", label: "Menunggu", icon: "⏳" },
              { value: "waiting_payment", label: "Belum Bayar", icon: "💳" },
              { value: "payment_review", label: "Verifikasi", icon: "👀" },
              { value: "processing", label: "Diproses", icon: "⚙️" },
              { value: "completed", label: "Selesai", icon: "✅" },
              { value: "cancelled", label: "Dibatalkan", icon: "❌" },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterStatus(filter.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                  filterStatus === filter.value
                    ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg transform scale-105"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <span>{filter.icon}</span>
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Memuat pesanan...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredOrders.length === 0 && (
          <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl">
            <div className="text-8xl mb-6 animate-float">📦</div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-3">
              {orders.length === 0 ? "Belum Ada Pesanan" : "Tidak Ada Pesanan"}
            </h2>
            <p className="text-gray-500 mb-8">
              {orders.length === 0 
                ? "Yuk, mulai pesan makanan favoritmu sekarang!" 
                : `Tidak ada pesanan dengan status ${filterStatus}`}
            </p>
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white px-8 py-3 rounded-full font-semibold hover:from-orange-600 hover:to-amber-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <span>🍽️</span>
              <span>Mulai Belanja</span>
            </Link>
          </div>
        )}

{/* Modal Preview Bukti Pembayaran - Versi Sederhana */}
{showProofModal && (
  <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
    <div className="relative max-w-3xl w-full">
      {/* Tombol Close */}
      <button
        onClick={() => setShowProofModal(false)}
        className="absolute -top-12 right-0 text-white hover:text-gray-300 text-2xl font-bold transition-colors"
      >
        ✕ Tutup
      </button>
      
      <img 
        src={selectedProofUrl} 
        alt="Bukti Pembayaran" 
        className="w-full h-auto rounded-lg shadow-2xl"
        style={{ maxHeight: '80vh', objectFit: 'contain' }}
      />
    </div>
  </div>
)}

        {/* Orders List */}
        {!loading && filteredOrders.length > 0 && (
          <div className="space-y-4">
            {filteredOrders.map((order, index) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Order Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getStatusIcon(order.status)}</span>
                      <div>
                        <p className="text-xs text-gray-500">Order ID</p>
                        <p className="font-mono text-sm font-semibold text-gray-700">
                          #{order.id.slice(0, 12)}...
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                      <button
                        onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                        className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center gap-1"
                      >
                        <span>{selectedOrder?.id === order.id ? "Sembunyikan" : "Detail"}</span>
                        <span>{selectedOrder?.id === order.id ? "▲" : "▼"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Order Summary (Always Visible) */}
                <div className="px-6 py-4">
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-400">📅</span>
                        <p className="text-sm text-gray-600">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-400">👤</span>
                        <p className="text-sm text-gray-800 font-medium">
                          {order.customer_name}
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400">🏠</span>
                        <p className="text-sm text-gray-600 flex-1">
                          {order.address}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Total Pesanan</p>
                      <p className="text-xl font-bold text-orange-600">
                        {formatPrice(order.total)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {order.items?.length || 0} item(s)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Details (Expandable) */}
                {selectedOrder?.id === order.id && (
                  <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 animate-slide-down">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <span>🛒</span>
                      <span>Detail Pesanan</span>
                    </h3>
                    
                    {/* Items List with Images */}
                    <div className="space-y-3 mb-4">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-200">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {item.image_url ? (
                              <img 
                                src={item.image_url} 
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/48?text=No+Image";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                🍽️
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{item.name}</p>
                            <p className="text-xs text-gray-500">Qty: {item.qty}</p>
                          </div>
                          
                          <p className="font-semibold text-orange-600">
                            {formatPrice(item.price * item.qty)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Price Breakdown */}
                    <div className="bg-white rounded-xl p-4 space-y-2 mb-4">
                      <h4 className="font-semibold text-gray-700 text-sm mb-2">Rincian Harga</h4>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="text-gray-800">{formatPrice(order.subtotal || order.total)}</span>
                      </div>
                      {order.shipping_cost !== undefined && order.shipping_cost > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Ongkos Kirim</span>
                          <span className="text-gray-800">{formatPrice(order.shipping_cost)}</span>
                        </div>
                      )}
                      {order.tax !== undefined && order.tax > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Pajak (10%)</span>
                          <span className="text-gray-800">{formatPrice(order.tax)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-gray-200">
                        <span className="font-bold text-gray-800">Total</span>
                        <span className="font-bold text-orange-600">{formatPrice(order.total)}</span>
                      </div>
                    </div>

                    {/* Payment Method & Proof */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">💳</span>
                        <span className="text-gray-600">Metode Pembayaran:</span>
                        <span className="font-medium text-gray-800">
                          {order.payment_method === "cash" ? "Bayar di Tempat" : 
                           order.payment_method === "transfer" ? `Transfer Bank (${order.payment_detail?.toUpperCase() || 'Bank'})` : 
                           order.payment_method === "qris" ? "QRIS" : order.payment_method}
                        </span>
                      </div>

                      {/* Bukti Pembayaran */}
                      {order.payment_proof && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">📎</span>
                          <span className="text-gray-600">Bukti Pembayaran:</span>
                          <button
                            onClick={() => openProofModal(order.payment_proof!)}
                            className="text-orange-500 hover:text-orange-600 text-sm font-medium underline"
                          >
                            Lihat Bukti Transfer
                          </button>
                        </div>
                      )}

                      {/* Payment Proof Status */}
                      {order.payment_proof_status === 'uploaded' && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">⏳</span>
                          <span className="text-sm text-yellow-600">Bukti sudah diupload, menunggu verifikasi admin</span>
                        </div>
                      )}
                      {order.payment_proof_status === 'verified' && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">✅</span>
                          <span className="text-sm text-green-600">Pembayaran telah diverifikasi</span>
                        </div>
                      )}
                      {order.payment_proof_status === 'rejected' && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">❌</span>
                          <span className="text-sm text-red-600">Bukti pembayaran ditolak, silakan upload ulang</span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                        <p className="text-xs text-yellow-800 flex items-start gap-2">
                          <span>📝</span>
                          <span>{order.notes}</span>
                        </p>
                      </div>
                    )}

                    {/* Re-upload button for rejected payment */}
                    {order.payment_proof_status === 'rejected' && order.payment_method === 'transfer' && (
                      <div className="mt-3">
                        <Link
                          href={`/checkout?reupload=${order.id}`}
                          className="inline-block px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors"
                        >
                          Upload Ulang Bukti Transfer
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
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
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
          opacity: 0;
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
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