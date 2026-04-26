"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  email: string;
  role: string;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>("user");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
        return;
      }

      // Get user role from database
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      const role = userData?.role || "user";
      
      setUser({
        id: session.user.id,
        email: session.user.email || "",
        role: role
      });
      setUserRole(role);
      
    } catch (error) {
      console.error("Auth error:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const requireAdmin = () => {
    if (!loading && userRole !== 'admin') {
      router.push("/");
      return false;
    }
    return true;
  };

  const requireUser = () => {
    if (!loading && !user) {
      router.push("/login");
      return false;
    }
    return true;
  };

  return { user, userRole, loading, requireAdmin, requireUser };
}