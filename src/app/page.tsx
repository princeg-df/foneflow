"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useLocalStorage from '@/hooks/use-local-storage';
import Dashboard from "@/components/dashboard";

export default function Home() {
  const [isAuthenticated] = useLocalStorage('foneflow-auth', false);
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router, isClient]);

  if (!isClient || !isAuthenticated) {
    // You can render a loading spinner here while redirecting
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return <Dashboard />;
}
