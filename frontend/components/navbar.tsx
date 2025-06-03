'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  Home,
  Upload,
  BarChart3,
  Settings,
  Image,
  Folder,
  Plus,
  Menu,
  X,
} from 'lucide-react'

export default function Navbar() {
  const [open, setOpen] = useState(false)

  const links = [
    { href: '/', label: 'Home', icon: <Home size={18} /> },
    { href: '/upload', label: 'Upload Manager', icon: <Upload size={18} /> },
    { href: '/stats', label: 'Statistics', icon: <BarChart3 size={18} /> },
    { href: '/settings', label: 'Settings', icon: <Settings size={18} /> },
    { href: '/image', label: 'Image Analysis', icon: <Image size={18} /> },
    { href: '/project', label: 'Projects', icon: <Folder size={18} /> },
  ]

  const projects = ['Risk Audit 2025', 'Test 1zzz']

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r h-screen p-4 space-y-6">
        <div className="text-2xl font-bold text-gray-800">SecureAI</div>

        <nav className="flex-1 space-y-2">
          {links.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-3 py-2 rounded text-gray-700 hover:bg-gray-100"
            >
              {icon}
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2 text-gray-800 font-semibold">
            <Folder size={16} />
            Projects
            <Plus size={16} className="ml-auto cursor-pointer" />
          </div>
          <ul className="ml-6 list-disc">
            {projects.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Mobile Toggle Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setOpen(!open)}
          className="p-2 text-gray-700 bg-white border rounded-md shadow"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Slide-in Menu */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-40" onClick={() => setOpen(false)}>
          <div
            className="absolute left-0 top-0 w-64 h-full bg-white shadow-md p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-2xl font-bold text-gray-800 mb-6">SecureAI</div>
            <nav className="space-y-3">
              {links.map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 px-3 py-2 rounded text-gray-700 hover:bg-gray-100"
                  onClick={() => setOpen(false)}
                >
                  {icon}
                  <span className="text-sm font-medium">{label}</span>
                </Link>
              ))}
            </nav>
            <div className="border-t mt-4 pt-4 space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2 font-semibold text-gray-800">
                <Folder size={16} />
                Projects
                <Plus size={16} className="ml-auto" />
              </div>
              <ul className="ml-6 list-disc">
                {projects.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
