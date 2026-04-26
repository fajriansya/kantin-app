"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";

type Order = {
  id: string;
  customer_name: string;
  address: string;
  phone: string;
  notes: string;
  payment_method: string;
  payment_proof?: string;
  payment_proof_status?: string;
  status: string;
  total: number;
  subtotal: number;
  shipping_cost: number;
  items: any[];
  user_id: string;
  created_at: string;
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState("semua");
  const { userRole, loading: authLoading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedProofUrl, setSelectedProofUrl] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showProofModal) {
        setShowProofModal(false);
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    
    if (showProofModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [showProofModal]);

  useEffect(() => {
    if (!authLoading) {
      if (userRole !== 'admin') {
        router.push("/");
        return;
      }
      fetchOrders();
    }
  }, [authLoading, userRole]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching orders:", error);
    } else {
      setOrders(data || []);
      const pending = data?.filter(o => o.status === 'pending' || o.status === 'waiting_payment').length || 0;
      setPendingCount(pending);
    }
    
    setLoading(false);
  };

  const updateOrderStatus = async (id: string, newStatus: string, oldStatus: string, items: any[]) => {
    setUpdatingId(id);
    setUpdateError(null);
    
    try {
      console.log(`Updating order ${id} from ${oldStatus} to ${newStatus}`);
      
      const { error } = await supabase
        .from("orders")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) {
        console.error("Update error:", error);
        setUpdateError(error.message);
        alert("Gagal mengupdate status: " + error.message);
        setUpdatingId(null);
        return;
      }

      alert(`Status pesanan berhasil diubah menjadi ${getStatusText(newStatus)}`);
      await fetchOrders();
      
    } catch (err) {
      console.error("Error:", err);
      alert("Terjadi kesalahan saat mengupdate status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      waiting_payment: "bg-orange-100 text-orange-800",
      processing: "bg-blue-100 text-blue-800",
      shipping: "bg-indigo-100 text-indigo-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return statusMap[status.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      pending: "Menunggu Konfirmasi",
      waiting_payment: "Menunggu Pembayaran",
      processing: "Diproses",
      shipping: "Dikirim",
      completed: "Selesai",
      cancelled: "Dibatalkan",
    };
    return textMap[status.toLowerCase()] || status;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
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

  const openProofModal = (url: string) => {
    setSelectedProofUrl(url);
    setShowProofModal(true);
  };

  const filteredOrders = filterStatus === "semua" 
    ? orders 
    : orders.filter(order => order.status.toLowerCase() === filterStatus);

  const statusOptions = [
    { value: "pending", label: "Menunggu Konfirmasi", color: "yellow" },
    { value: "waiting_payment", label: "Menunggu Bayar", color: "orange" },
    { value: "processing", label: "Diproses", color: "blue" },
    { value: "shipping", label: "Dikirim", color: "indigo" },
    { value: "completed", label: "Selesai", color: "green" },
    { value: "cancelled", label: "Dibatalkan", color: "red" },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-white shadow-md" 
          : "bg-white border-b border-slate-200"
      } px-6 py-4`}>
        
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-slate-800">Manajemen Pesanan</h1>
            <Link 
              href="/admin/products" 
              className="text-sm text-slate-600 hover:text-orange-600 transition-colors"
            >
              Kelola Produk
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {pendingCount > 0 && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 rounded-full">
                <span className="text-yellow-600">⏳</span>
                <span className="text-sm font-medium text-yellow-700">{pendingCount} Perlu Tindakan</span>
              </div>
            )}
            
            <Link href="/" className="text-sm text-slate-600 hover:text-orange-600 transition-colors">
              Beranda
            </Link>

            <div className="relative">
              <button
                onClick={() => setShowLogoutMenu(!showLogoutMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <span className="text-sm font-medium text-slate-700">Admin</span>
                <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showLogoutMenu && (
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
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

      {/* Modal Preview Bukti Pembayaran */}
      {showProofModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowProofModal(false)}
        >
          <div 
            className="relative max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
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

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Daftar Pesanan</h1>
          <p className="text-slate-500 mt-1">Kelola dan update status pesanan customer</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {statusOptions.map((status) => {
            const count = orders.filter(o => o.status === status.value).length;
            const total = orders.filter(o => o.status === status.value).reduce((sum, o) => sum + o.total, 0);
            const isPending = status.value === 'pending' || status.value === 'waiting_payment';
            return (
              <div 
                key={status.value} 
                className={`bg-white rounded-xl shadow-sm border p-3 cursor-pointer hover:shadow-md transition-all ${
                  isPending && count > 0 ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200'
                }`}
                onClick={() => setFilterStatus(status.value)}
              >
                <p className={`text-xs font-medium truncate ${isPending && count > 0 ? 'text-yellow-700' : 'text-slate-500'}`}>
                  {status.label}
                </p>
                <p className={`text-xl font-bold ${isPending && count > 0 ? 'text-yellow-700' : 'text-slate-800'}`}>
                  {count}
                </p>
                <p className="text-xs text-orange-600 truncate">{formatPrice(total)}</p>
              </div>
            );
          })}
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus("semua")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                filterStatus === "semua"
                  ? "bg-orange-500 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Semua ({orders.length})
            </button>
            {statusOptions.map((status) => {
              const count = orders.filter(o => o.status === status.value).length;
              return (
                <button
                  key={status.value}
                  onClick={() => setFilterStatus(status.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    filterStatus === status.value
                      ? "bg-orange-500 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {status.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {updateError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            Error: {updateError}
          </div>
        )}

        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <p className="text-slate-500">Tidak ada pesanan</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-sm font-mono text-slate-600">#{order.id.slice(0, 8)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                    <span className="text-sm text-slate-500">{formatDate(order.created_at)}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value, order.status, order.items)}
                      disabled={updatingId === order.id}
                      className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-slate-700"
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                      className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      {selectedOrder?.id === order.id ? "Sembunyikan" : "Detail"}
                    </button>
                  </div>
                </div>

                <div className="px-6 py-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Pelanggan</p>
                      <p className="font-medium text-slate-800">{order.customer_name}</p>
                      <p className="text-sm text-slate-600">{order.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Alamat</p>
                      <p className="text-sm text-slate-700 line-clamp-2">{order.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-1">Total Pesanan</p>
                      <p className="text-xl font-bold text-orange-600">{formatPrice(order.total)}</p>
                      <p className="text-xs text-slate-500 mt-1">{order.items?.length} item(s)</p>
                    </div>
                  </div>
                </div>

                {selectedOrder?.id === order.id && (
                  <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
                    <h3 className="font-semibold text-slate-800 mb-3">Detail Pesanan</h3>
                    
                    <div className="space-y-2 mb-4">
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-200">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">🍽️</div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 text-sm">{item.name}</p>
                              <p className="text-xs text-slate-500">Qty: {item.qty}</p>
                            </div>
                          </div>
                          <p className="font-semibold text-orange-600 text-sm">
                            {formatPrice(item.price * item.qty)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white rounded-lg p-4 space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Subtotal</span>
                        <span className="text-slate-800">{formatPrice(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Ongkos Kirim</span>
                        <span className="text-slate-800">{formatPrice(order.shipping_cost)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-200">
                        <span className="font-semibold text-slate-800">Total</span>
                        <span className="font-bold text-orange-600">{formatPrice(order.total)}</span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-500">💳</span>
                        <span className="text-slate-600">Metode Pembayaran:</span>
                        <span className="font-medium text-slate-800">
                          {order.payment_method === "cash" ? "Bayar di Tempat" : 
                           order.payment_method === "transfer" ? "Transfer Bank" : 
                           order.payment_method === "qris" ? "QRIS" : order.payment_method}
                        </span>
                      </div>

                      {order.payment_proof && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">📎</span>
                          <span className="text-slate-600">Bukti Transfer:</span>
                          <button
                            onClick={() => openProofModal(order.payment_proof!)}
                            className="text-orange-500 hover:text-orange-600 text-sm font-medium underline"
                          >
                            Lihat Bukti Transfer
                          </button>
                        </div>
                      )}
                    </div>

                    {order.notes && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                        <p className="text-xs text-yellow-700">📝 Catatan: {order.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}