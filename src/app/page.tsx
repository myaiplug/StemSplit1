'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

// Dynamically import components to avoid SSR issues with Tauri APIs
const ReactorZone = dynamic(
  () => import('@/components/ReactorZone'),
  { ssr: false }
);

const PythonSetup = dynamic(
  () => import('@/components/PythonSetup'),
  { ssr: false }
);

const UpdateModal = dynamic(
  () => import('@/components/UpdateModal'),
  { ssr: false }
);

const LicenseModal = dynamic(
  () => import('@/components/LicenseModal'),
  { ssr: false }
);

export default function Home() {
  const [isPythonReady, setIsPythonReady] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);

  useEffect(() => {
    const handleOpenLicense = () => setIsLicenseModalOpen(true);
    window.addEventListener('open-license-modal', handleOpenLicense);
    return () => window.removeEventListener('open-license-modal', handleOpenLicense);
  }, []);

  return (
    <main>
      <PythonSetup onReady={() => setIsPythonReady(true)} />
      <UpdateModal />
      <LicenseModal isOpen={isLicenseModalOpen} onClose={() => setIsLicenseModalOpen(false)} />
      <ReactorZone />
    </main>
  );
}
