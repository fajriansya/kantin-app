"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Email dan password harus diisi!");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg("Format email tidak valid!");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password harus minimal 6 karakter!");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Konfirmasi password tidak cocok!");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      }
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setSuccessMsg("✨ Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi, lalu login.");
    
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    
    setTimeout(() => {
      router.push("/login");
    }, 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 text-7xl opacity-10 animate-float">🍕</div>
        <div className="absolute bottom-20 right-10 text-8xl opacity-10 animate-float-delayed">🍝</div>
        <div className="absolute top-1/3 right-20 text-6xl opacity-10 animate-float-slow">🥗</div>
        <div className="absolute bottom-1/3 left-20 text-7xl opacity-10 animate-float">🥘</div>
        <div className="absolute top-20 right-1/4 text-5xl opacity-8 animate-float-delayed">🍷</div>
        <div className="absolute bottom-10 left-1/3 text-6xl opacity-10 animate-float-slow">🍣</div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl rotate-6 shadow-lg mb-4">
              <span className="text-4xl transform -rotate-6">🍽️</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent font-['Playfair_Display']">
              Daftar Akun
            </h1>
            <p className="text-gray-500 text-sm mt-2">Bergabung dengan KANTIN</p>
          </div>

          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <span>✅</span>
                <span>{successMsg}</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg animate-shake">
              <div className="flex items-center gap-2 text-red-700 text-sm">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Email Input */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Email
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10">📧</span>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-300 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition-all text-gray-800 placeholder-gray-400"
                style={{ color: "#333", backgroundColor: "#f9fafb" }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10">🔒</span>
              <input
                type="password"
                placeholder="minimal 6 karakter"
                className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-300 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition-all text-gray-800 placeholder-gray-400"
                style={{ color: "#333", backgroundColor: "#f9fafb" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Konfirmasi Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10">🔐</span>
              <input
                type="password"
                placeholder="ulangi password Anda"
                className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-300 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition-all text-gray-800 placeholder-gray-400"
                style={{ color: "#333", backgroundColor: "#f9fafb" }}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Register Button */}
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-amber-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Mendaftar...
              </span>
            ) : (
              "Daftar Sekarang →"
            )}
          </button>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Sudah punya akun?{" "}
              <Link href="/login" className="text-orange-600 font-semibold hover:text-orange-700 transition-colors">
                Login di sini ✨
              </Link>
            </p>
          </div>

          {/* Divider */}
          <div className="mt-6 flex items-center justify-center gap-3 text-gray-400 text-xs">
            <span className="text-orange-300">🍜</span>
            <span className="w-12 h-px bg-gray-200"></span>
            <span>bergabung dengan kami</span>
            <span className="w-12 h-px bg-gray-200"></span>
            <span className="text-orange-300">🍷</span>
          </div>
        </div>
      </div>

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
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
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
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}