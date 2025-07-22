// src/hooks/use-local-storage.ts
"use client"

import { useState, useEffect, useCallback } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      // The reviver function is causing issues with IDs that might look like dates.
      // The data is now parsed and then dates are manually reconstructed in `dashboard.tsx` upon import/load.
      // This is a more robust way to handle date deserialization.
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState<T>(() => {
    // Read from localStorage on initial client-side render
    if (typeof window !== 'undefined') {
        const item = window.localStorage.getItem(key);
        try {
            if (item) {
                const data = JSON.parse(item);
                // Manually parse dates for orders and transactions
                if (key === 'foneflow-orders' && Array.isArray(data)) {
                    return data.map((o: any) => ({
                        ...o,
                        orderDate: o.orderDate ? new Date(o.orderDate) : undefined,
                        deliveryDate: o.deliveryDate ? new Date(o.deliveryDate) : undefined,
                    })) as T;
                }
                if (key === 'foneflow-transactions' && Array.isArray(data)) {
                    return data.map((t: any) => ({
                        ...t,
                        date: t.date ? new Date(t.date) : undefined,
                    })) as T;
                }
                return data;
            }
        } catch (error) {
            console.warn(`Error parsing localStorage key “${key}”:`, error);
            return initialValue;
        }
    }
    return initialValue;
  });

  const setValue = (value: T | ((val: T) => T)) => {
    if (typeof window == 'undefined') {
      console.warn(
        `Tried setting localStorage key “${key}” even though environment is not a client`
      );
    }

    try {
      const newValue = value instanceof Function ? value(storedValue) : value;
      window.localStorage.setItem(key, JSON.stringify(newValue));
      setStoredValue(newValue);
      window.dispatchEvent(new Event("local-storage"));
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  };
  
  useEffect(() => {
     const handleStorageChange = (event: StorageEvent | CustomEvent) => {
        if ((event as StorageEvent).key && (event as StorageEvent).key !== key) {
            return;
        }
        
        if (typeof window !== 'undefined') {
            const item = window.localStorage.getItem(key);
             try {
                if (item) {
                    const data = JSON.parse(item);
                     if (key === 'foneflow-orders' && Array.isArray(data)) {
                        setStoredValue(data.map((o: any) => ({
                            ...o,
                            orderDate: o.orderDate ? new Date(o.orderDate) : undefined,
                            deliveryDate: o.deliveryDate ? new Date(o.deliveryDate) : undefined,
                        })) as T);
                    } else if (key === 'foneflow-transactions' && Array.isArray(data)) {
                        setStoredValue(data.map((t: any) => ({
                            ...t,
                            date: t.date ? new Date(t.date) : undefined,
                        })) as T);
                    } else {
                        setStoredValue(data);
                    }
                } else {
                    setStoredValue(initialValue);
                }
            } catch (error) {
                 console.warn(`Error parsing localStorage key “${key}” on storage change:`, error);
                 setStoredValue(initialValue);
            }
        }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("local-storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage", handleStorageChange);
    };
  }, [key, initialValue]);


  return [storedValue, setValue];
}

export default useLocalStorage;
