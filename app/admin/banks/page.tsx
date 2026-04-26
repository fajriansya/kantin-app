"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";

type Bank = {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_active: boolean;
  created_at: string;
};

export default function AdminBanksPage() {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [formData, setFormData] = useState({
    bank_name: "",
    account_number: "",
    account_name: "",
    is_active: true
  });
  const [saving, setSaving] = useState(false);
  const { userRole, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && userRole === 'admin') {
      fetchBanks();
    } else if (!authLoading && userRole !== 'admin') {
      router.push("/");
    }
  }, [authLoading, userRole]);

  const fetchBanks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bank_settings")
      .select("*")
      .order("bank_name", { ascending: true });
    
    setBanks(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (editingBank) {
      // Update
      const { error } = await supabase
        .from("bank_settings")
        .update({
          bank_name: formData.bank_name,
          account_number: formData.account_number,
          account_name: formData.account_name,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingBank.id);

      if (error) {
        alert("Gagal update bank: " + error.message);
      } else {
        alert("Bank berhasil diupdate");
        fetchBanks();
        closeModal();
      }
    } else {
      // Insert
      const { error } = await supabase
        .from("bank_settings")
        .insert([formData]);

      if (error) {
        alert("Gagal tambah bank: " + error.message);
      } else {
        alert("Bank berhasil ditambahkan");
        fetchBanks();
        closeModal();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus bank ini?")) {
      const { error } = await supabase
        .from("bank_settings")
        .delete()
        .eq("id", id);

      if (error) {
        alert("Gagal hapus bank: " + error.message);
      } else {
        alert("Bank berhasil dihapus");
        fetchBanks();
      }
    }
  };

  const openModal = (bank?: Bank) => {
    if (bank) {
      setEditingBank(bank);
      setFormData({
        bank_name: bank.bank_name,
        account_number: bank.account_number,
        account_name: bank.account_name,
        is_active: bank.is_active
      });
    } else {
      setEditingBank(null);
      setFormData({
        bank_name: "",
        account_number: "",
        account_name: "",
        is_active: true
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBank(null);
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Atur Metode Pembayaran</h1>
            <p className="text-sm text-gray-500 mt-0.5">Kelola daftar bank untuk pembayaran transfer</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/products" className="text-sm text-gray-600 hover:text-orange-600">
              Kelola Produk
            </Link>
            <Link href="/admin/orders" className="text-sm text-gray-600 hover:text-orange-600">
              Pesanan
            </Link>
            <Link href="/" className="text-sm text-gray-600 hover:text-orange-600">
              Beranda
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Daftar Bank</h2>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Tambah Bank
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bank</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nomor Rekening</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Atas Nama</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {banks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    Belum ada bank. Klik "Tambah Bank" untuk menambahkan.
                  </td>
                </tr>
              ) : (
                banks.map((bank) => (
                  <tr key={bank.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{bank.bank_name}</td>
                    <td className="px-6 py-4 font-mono text-gray-700">{bank.account_number}</td>
                    <td className="px-6 py-4 text-gray-700">{bank.account_name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${bank.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {bank.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openModal(bank)} className="text-blue-600 hover:text-blue-700 mr-3">Edit</button>
                      <button onClick={() => handleDelete(bank.id)} className="text-red-600 hover:text-red-700">Hapus</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal Tambah/Edit Bank */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editingBank ? 'Edit Bank' : 'Tambah Bank'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Bank</label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Atas Nama</label>
                <input
                  type="text"
                  value={formData.account_name}
                  onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="w-4 h-4 text-orange-500 rounded"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">Aktifkan</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}