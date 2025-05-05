// components/Sidebar.tsx

import Link from "next/link";
import { useRouter } from "next/router";

export default function Sidebar() {
  const router = useRouter();
  const current = router.pathname;

  const navItems = [
    { label: "Text Analysis", path: "/" },
    { label: "Image Analysis", path: "/image-analysis" },
    { label: "Upload Manager", path: "/upload" },
    { label: "Settings", path: "/settings" },
    { label: "Statistics", path: "/stats" }
  ];

  return (
    <aside className="w-64 bg-gray-100 border-r h-screen p-4">
      <h2 className="text-xl font-semibold mb-6">LLM Assistant</h2>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`block px-3 py-2 rounded-md font-medium hover:bg-gray-200 ${
              current === item.path ? "bg-blue-100 text-blue-700" : "text-gray-800"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
