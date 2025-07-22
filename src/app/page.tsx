"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useLocalStorage from '@/hooks/use-local-storage';
import Dashboard from "@/components/dashboard";

export default function Home() {
  const [isAuthenticated] = useLocalStorage('foneflow-auth', false);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    // You can render a loading spinner here while redirecting
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return <Dashboard />;
}
