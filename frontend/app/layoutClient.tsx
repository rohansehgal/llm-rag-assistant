'use client'

import { useRef, useState } from 'react'
import Navbar from '@/components/navbar'
import ProjectModal from '@/components/ProjectModal'

export default function LayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const [showModal, setShowModal] = useState(false)

  // ✅ Ref to allow Navbar to call refreshProjects()
  const navbarRef = useRef<{ refreshProjects: () => void }>(null)

  return (
    <>
      <Navbar ref={navbarRef} onAddProject={() => setShowModal(true)} />
      <ProjectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onProjectCreated={() => {
          navbarRef.current?.refreshProjects()
        }}
      />
      <div className="flex-1 min-h-screen overflow-y-auto">{children}</div>
    </>
  )
}
