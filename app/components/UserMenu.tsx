"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type UserMenuProps = {
  userEmail: string;
  userRole?: string;
};

export default function UserMenu({ userEmail, userRole = "user" }: UserMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 text-sm font-medium hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-all text-gray-700"
      >
        <span className="text-lg">👤</span>
        <span className="hidden md:inline max-w-[150px] truncate">
          {userEmail.split('@')[0]}
        </span>
        <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{userRole === 'admin' ? '👨‍💼' : '👤'}</span>
                <div>
                  <p className="font-semibold text-sm">{userEmail}</p>
                  <p className="text-xs opacity-90 capitalize">{userRole === 'admin' ? 'Administrator' : 'Member'}</p>
                </div>
              </div>
            </div>

            <div className="py-2">
              {/* Admin Menu */}
              {userRole === 'admin' && (
                <>
                  <Link
                    href="/admin/products"
                    className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-orange-50 transition-colors flex items-center gap-3"
                    onClick={() => setShowMenu(false)}
                  >
                    <span className="text-xl">📦</span>
                    <div>
                      <p className="font-medium">Kelola Produk</p>
                      <p className="text-xs text-gray-500">Tambah, edit, hapus produk</p>
                    </div>
                  </Link>
                  
                  <Link
                    href="/admin/add-product"
                    className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-orange-50 transition-colors flex items-center gap-3"
                    onClick={() => setShowMenu(false)}
                  >
                    <span className="text-xl">➕</span>
                    <div>
                      <p className="font-medium">Tambah Produk</p>
                      <p className="text-xs text-gray-500">Tambahkan produk baru</p>
                    </div>
                  </Link>

                  <Link
                    href="/admin/orders"
                    className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-orange-50 transition-colors flex items-center gap-3"
                    onClick={() => setShowMenu(false)}
                  >
                    <span className="text-xl">📋</span>
                    <div>
                      <p className="font-medium">Kelola Pesanan</p>
                      <p className="text-xs text-gray-500">Lihat dan update status pesanan</p>
                    </div>
                  </Link>

                  <Link
                    href="/admin/banks"
                    className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-orange-50 transition-colors flex items-center gap-3"
                    onClick={() => setShowMenu(false)}
                  >
                    <span className="text-xl">🏦</span>
                    <div>
                      <p className="font-medium">Atur Bank</p>
                      <p className="text-xs text-gray-500">Kelola rekening bank pembayaran</p>
                    </div>
                  </Link>

                  <div className="border-t border-gray-100 my-1"></div>
                </>
              )}

              {/* User Menu */}
              <Link
                href="/orders"
                className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-orange-50 transition-colors flex items-center gap-3"
                onClick={() => setShowMenu(false)}
              >
                <span className="text-xl">📋</span>
                <div>
                  <p className="font-medium">Pesanan Saya</p>
                  <p className="text-xs text-gray-500">Lihat riwayat pesanan</p>
                </div>
              </Link>

              <Link
                href="/cart"
                className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-orange-50 transition-colors flex items-center gap-3"
                onClick={() => setShowMenu(false)}
              >
                <span className="text-xl">🛒</span>
                <div>
                  <p className="font-medium">Keranjang</p>
                  <p className="text-xs text-gray-500">Lihat item di keranjang</p>
                </div>
              </Link>

              <div className="border-t border-gray-100 my-1"></div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
              >
                <span className="text-xl">🚪</span>
                <div>
                  <p className="font-medium">Logout</p>
                  <p className="text-xs text-red-400">Keluar dari akun</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slide-down 0.2s ease-out; }
      `}</style>
    </div>
  );
}