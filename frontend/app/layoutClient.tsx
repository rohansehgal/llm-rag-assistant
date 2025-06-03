'use client';

import { useState } from 'react';
import Navbar from '@/components/navbar';
import ProjectModal from '@/components/ProjectModal';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Used to force Navbar refresh

  return (
    <>
      <Navbar
        key={refreshKey} // force re-render when new project is created
        onAddProject={() => setShowModal(true)}
      />
      <ProjectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onProjectCreated={() => {
          setShowModal(false);
          setRefreshKey((k) => k + 1); // trigger Navbar re-fetch of projects
        }}
      />
      <div className="flex-1 min-h-screen overflow-y-auto">{children}</div>
    </>
  );
}
