"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/lib/cart";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Bank = {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_active: boolean;
};

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const router = useRouter();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [loading, setLoading] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [userSession, setUserSession] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUserSession(session.user);
    };
    checkAuth();
  }, [router]);

  // Ambil data bank dari database
  useEffect(() => {
    const fetchBanks = async () => {
      const { data } = await supabase
        .from("bank_settings")
        .select("*")
        .eq("is_active", true)
        .order("bank_name", { ascending: true });
      
      setBanks(data || []);
      setLoadingBanks(false);
    };
    
    fetchBanks();
  }, []);

  useEffect(() => {
    if (cart.length === 0) {
      router.push("/");
    }
  }, [cart, router]);

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const grandTotal = total + shippingCost;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const uploadPaymentProof = async (orderId: string): Promise<string | null> => {
    if (!paymentProof) return null;
    
    setUploadingProof(true);
    
    try {
      const fileExt = paymentProof.name.split('.').pop();
      const fileName = `payment_proof_${orderId}_${Date.now()}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, paymentProof, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        
        if (uploadError.message.includes('bucket not found')) {
          alert("Bucket 'payment-proofs' tidak ditemukan! Silakan buat bucket terlebih dahulu di Supabase Storage.");
        } else {
          alert("Gagal upload bukti transfer: " + uploadError.message);
        }
        setUploadingProof(false);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      setUploadingProof(false);
      return publicUrl;
      
    } catch (error) {
      console.error("Error:", error);
      alert("Terjadi kesalahan saat upload bukti transfer");
      setUploadingProof(false);
      return null;
    }
  };

  const handleProofImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Ukuran file terlalu besar! Maksimal 2MB.");
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        alert("File harus berupa gambar!");
        return;
      }
      
      setPaymentProof(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

const handleCheckout = async () => {
  if (!name || !address || !phone) {
    alert("Isi semua data yang diperlukan!");
    return;
  }

  if (phone.length < 10) {
    alert("Nomor telepon tidak valid!");
    return;
  }

  if (paymentMethod === 'transfer' && !selectedBankId) {
    alert("Pilih bank tujuan transfer!");
    return;
  }

  setLoading(true);

  const orderData = {
    customer_name: name,
    address,
    phone,
    notes: notes || null,
    payment_method: paymentMethod,
    payment_detail: paymentMethod === 'transfer' ? selectedBankId : null,
    payment_proof: null,
    status: paymentMethod === 'cash' ? "waiting_payment" : "pending",
    subtotal: total,
    shipping_cost: shippingCost,
    total: grandTotal,
    items: cart,
    user_id: userSession?.id,
    created_at: new Date().toISOString(),
  };

  console.log("Inserting order:", orderData);

  const { data, error } = await supabase.from("orders").insert([orderData]).select();

  setLoading(false);

  if (error) {
    console.error("Insert error:", error);
    alert("Gagal checkout: " + error.message);
    return;
  }

  console.log("Order created:", data);

  if (paymentMethod === 'transfer' && data && data[0]) {
    setCurrentOrderId(data[0].id);
    setShowPaymentModal(true);
  } else {
    clearCart();
    router.push("/order-success");
  }
};

const submitPaymentProof = async () => {
  if (!paymentProof) {
    alert("Silakan upload bukti transfer!");
    return;
  }

  setUploadingProof(true);
  
  const proofUrl = await uploadPaymentProof(currentOrderId!);
  
  if (proofUrl) {
    const { error } = await supabase
      .from("orders")
      .update({
        payment_proof: proofUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", currentOrderId);

    if (!error) {
      alert("✅ Bukti transfer berhasil diupload! Pesanan Anda akan segera diproses.");
      setShowPaymentModal(false);
      clearCart();
      router.push("/orders");
    } else {
      console.error("Update error:", error);
      alert("Gagal menyimpan bukti transfer: " + error.message);
    }
  }
  
  setUploadingProof(false);
};

  if (cart.length === 0) {
    return null;
  }

  if (!userSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const selectedBank = banks.find(b => b.id === selectedBankId);

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-white/80 backdrop-blur-md shadow-sm" 
          : "bg-white border-b border-slate-100"
      } px-6 py-4`}>
        
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Kantin
            </span>
          </Link>

          <Link 
            href="/cart" 
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-orange-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Kembali ke Keranjang</span>
          </Link>
        </div>
      </header>

      {/* Modal Upload Bukti Transfer */}
      {showPaymentModal && selectedBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-slide-up">
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Upload Bukti Transfer</h2>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Informasi Rekening Tujuan dari Database */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">Informasi Rekening Tujuan</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Bank:</span>
                    <span className="font-medium text-blue-900">{selectedBank.bank_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Nomor Rekening:</span>
                    <span className="font-mono font-bold text-blue-900">{selectedBank.account_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Atas Nama:</span>
                    <span className="font-medium text-blue-900">{selectedBank.account_name}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-200">
                    <span className="text-blue-700">Total Transfer:</span>
                    <span className="font-bold text-blue-900">{formatPrice(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Upload Bukti */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload Bukti Transfer
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-orange-300 transition-colors">
                  {paymentProofPreview ? (
                    <div className="space-y-3">
                      <img 
                        src={paymentProofPreview} 
                        alt="Preview Bukti Transfer" 
                        className="max-h-48 mx-auto rounded-lg shadow-sm"
                      />
                      <div className="flex gap-2 justify-center">
                        <label className="cursor-pointer text-sm text-orange-600 hover:text-orange-700 font-medium">
                          Ganti Foto
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/jpg"
                            onChange={handleProofImageChange}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentProof(null);
                            setPaymentProofPreview("");
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
                        <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-slate-500">Klik untuk upload bukti transfer</span>
                        <span className="text-xs text-slate-400">Format: JPG, PNG (Max 2MB)</span>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={handleProofImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Informasi Penting */}
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <p className="text-xs text-yellow-700">
                  ⚠️ Pastikan Anda mentransfer sesuai dengan total yang tertera. 
                  Upload bukti transfer untuk verifikasi pembayaran Anda.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    clearCart();
                    router.push("/");
                  }}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={submitPaymentProof}
                  disabled={!paymentProof || uploadingProof}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploadingProof ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    "Kirim Bukti Transfer"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">Checkout</h1>
          <p className="text-slate-500">Lengkapi data diri untuk menyelesaikan pesanan</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Customer Information */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Informasi Pelanggan</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    placeholder="Contoh: Ahmad Fauzi"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nomor Telepon <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="081234567890"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Alamat Pengiriman <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="Jl. Contoh No. 123"
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none text-slate-800"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Catatan (Opsional)
                  </label>
                  <textarea
                    placeholder="Contoh: Pintu belakang"
                    rows={2}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none text-slate-800"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Metode Pembayaran</h2>
              </div>
              
              <div className="p-6 space-y-3">
                {/* Cash */}
                <label className="flex items-center p-3 border border-slate-200 rounded-xl cursor-pointer transition-all hover:border-orange-300 hover:bg-orange-50/50">
                  <input
                    type="radio"
                    name="payment"
                    value="cash"
                    checked={paymentMethod === "cash"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3 text-orange-500 w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">Bayar di Tempat (Cash)</p>
                    <p className="text-xs text-slate-400">Bayar langsung saat pesanan sampai</p>
                  </div>
                </label>

                {/* Transfer Bank dengan pilihan bank dari database */}
                <div className={`border rounded-xl transition-all ${paymentMethod === 'transfer' ? 'border-orange-400 bg-orange-50/30' : 'border-slate-200'}`}>
                  <label className="flex items-center p-3 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      value="transfer"
                      checked={paymentMethod === "transfer"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-3 text-orange-500 w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">Transfer Bank</p>
                      <p className="text-xs text-slate-400">Transfer ke rekening bank</p>
                    </div>
                  </label>
                  
                  {paymentMethod === 'transfer' && (
                    <div className="px-3 pb-3 pt-0 grid grid-cols-2 gap-2">
                      {loadingBanks ? (
                        <div className="col-span-2 text-center py-2 text-gray-400">
                          <div className="animate-spin inline-block w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full mr-2"></div>
                          Memuat data bank...
                        </div>
                      ) : banks.length === 0 ? (
                        <div className="col-span-2 text-center py-2 text-gray-400">
                          Belum ada bank yang tersedia
                        </div>
                      ) : (
                        banks.map((bank) => (
                          <button
                            key={bank.id}
                            type="button"
                            onClick={() => setSelectedBankId(bank.id)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              selectedBankId === bank.id
                                ? "bg-orange-500 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {bank.bank_name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-800">Ringkasan Pesanan</h2>
                </div>

                <div className="p-6">
                  <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-start pb-3 border-b border-slate-100">
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{item.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Jumlah: {item.qty}</p>
                        </div>
                        <p className="font-semibold text-orange-600 text-sm">
                          {formatPrice(item.price * item.qty)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Ongkos Kirim</span>
                      <span className="text-sm font-medium text-slate-800">
                        {shippingCost === 0 ? "Akan diatur admin" : formatPrice(shippingCost)}
                      </span>
                    </div>

                    <div className="flex justify-between pt-3 border-t border-slate-200">
                      <span className="font-semibold text-slate-800">Total</span>
                      <span className="font-bold text-orange-600 text-xl">
                        {formatPrice(grandTotal)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={loading || (paymentMethod === 'transfer' && !selectedBankId)}
                    className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        <span>Memproses...</span>
                      </span>
                    ) : (
                      "Buat Pesanan"
                    )}
                  </button>

                  <p className="text-xs text-slate-400 text-center mt-3">
                    Data Anda aman dan terenkripsi
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
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
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}