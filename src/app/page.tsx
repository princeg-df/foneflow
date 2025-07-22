"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useLocalStorage from '@/hooks/use-local-storage';
import Dashboard from "@/components/dashboard";
import type { User } from '@/lib/types';

export default function Home() {
  const [currentUser] = useLocalStorage<User | null>('foneflow-currentUser', null);
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, router, isClient]);

  if (!isClient || !currentUser) {
    // You can render a loading spinner here while redirecting
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return <Dashboard />;
}
