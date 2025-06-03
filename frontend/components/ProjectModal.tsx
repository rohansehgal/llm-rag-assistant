// components/ProjectModal.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: () => void; // ✅ Add this

}

export default function ProjectModal({ isOpen, onClose, onProjectCreated }: ProjectModalProps) {

  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleCreate = async () => {
    if (!name.trim()) return setError("Project name is required.");

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.slug) {
        onClose();
        onProjectCreated?.(); // ✅ trigger refresh
        router.push(`/project/${data.slug}`);
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch {
      setError("Failed to create project.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl relative">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <h2 className="text-sm font-medium text-gray-800 mb-2">Project name</h2>
        <input
          type="text"
          placeholder="e.g. Risk Audit 2025"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />
        <p className="text-xs text-gray-500 mt-2">
          Projects help organize your documents and instructions into a step-by-step workflow.
        </p>

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <div className="mt-4 flex justify-end gap-2 text-sm">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="px-4 py-1.5 rounded bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50"
          >
            Create project
          </button>
        </div>
      </div>
    </div>
  );
}
