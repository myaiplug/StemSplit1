'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Dynamically import components to avoid SSR issues with Tauri APIs
const ReactorZone = dynamic(
  () => import('@/components/ReactorZone'),
  { ssr: false }
);

const PythonSetup = dynamic(
  () => import('@/components/PythonSetup'),
  { ssr: false }
);

export default function Home() {
  const [isPythonReady, setIsPythonReady] = useState(false);
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    setIsTauri(typeof window !== 'undefined' && '__TAURI__' in window);
  }, []);

  return (
    <main>
      {isTauri && <PythonSetup onReady={() => setIsPythonReady(true)} />}
      <ReactorZone />
    </main>
  );
}
