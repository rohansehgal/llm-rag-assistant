// components/ProjectFileUploadModal.tsx
"use client";

import { useState, useRef } from "react";
import { X } from "lucide-react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  onUploadSuccess: () => void;
}

const CATEGORIES = [
  "Site Notes",
  "Gap Analysis",
  "Recommendations",
  "Template",
];

export default function ProjectFileUploadModal({
  isOpen,
  onClose,
  projectName,
  onUploadSuccess,
}: UploadModalProps) {
  const [selectedCategory, setSelectedCategory] = useState("Site Notes");
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!file || !selectedCategory) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("project_name", projectName);
    formData.append("category", selectedCategory);

    try {
      setSubmitting(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/upload-project-file`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        onUploadSuccess();
        onClose();
      }
    } catch (_e) {
      alert("❌ Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X size={18} />
        </button>

        <h2 className="text-sm font-semibold text-gray-800 mb-2">Upload File</h2>
        <p className="text-xs text-gray-500 mb-4">
          Upload a file and tag it appropriately.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {CATEGORIES.map((cat) => (
            <label key={cat} className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                value={cat}
                checked={selectedCategory === cat}
                onChange={() => setSelectedCategory(cat)}
              />
              {cat}
            </label>
          ))}
        </div>

        <div
          className="border-2 border-dashed border-gray-300 rounded p-6 text-sm text-center text-gray-500 cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          {file ? (
            <span>
              📎 {file.name} <span className="text-xs text-gray-400 ml-2">{(file.size / 1024).toFixed(1)} KB</span>
            </span>
          ) : (
            <>
              Drag and drop a file, or click to browse
              <p className="text-xs mt-1 text-gray-400">Supports PDF, DOCX, XLSX, JPG, PNG</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected && selected.size <= 25 * 1024 * 1024) {
                setFile(selected);
              } else {
                alert("❌ File must be ≤ 25MB");
              }
            }}
          />
        </div>

        <div className="mt-5 flex justify-end gap-2 text-sm">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || submitting}
            className="px-4 py-1.5 rounded bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}
