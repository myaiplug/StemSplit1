'use client';

import dynamic from 'next/dynamic';

// Dynamically import ReactorZone to avoid SSR issues with Tauri APIs
const ReactorZone = dynamic(
  () => import('@/components/ReactorZone'),
  { ssr: false }
);

export default function Home() {
  return (
    <main>
      <ReactorZone />
    </main>
  );
}
