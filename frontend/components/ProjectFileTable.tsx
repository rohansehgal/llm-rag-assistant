"use client";

import { useEffect, useState, useCallback } from "react";
import { Eye, Trash2 } from "lucide-react";

interface FileEntry {
  filename: string;
  category: string;
  size_kb: number;
  uploaded_at: string;
}

interface Props {
  slug: string;
}

const CATEGORIES = ["All", "Site Notes", "Gap Analysis", "Recommendations", "Template"];

export default function ProjectFileTable({ slug }: Props) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [filter, setFilter] = useState<string>("All");

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/project/${slug}/files`);
      const data = await res.json();
      setFiles(data);
    } catch {
      console.error("❌ Failed to fetch project files.");
    }
  }, [slug]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete file "${filename}"?`)) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/project/${slug}/delete-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      if (res.ok) {
        fetchFiles();
      } else {
        alert("❌ Failed to delete file.");
      }
    } catch {
      alert("❌ Failed to delete file.");
    }
  };

  const visibleFiles =
    filter === "All" ? files : files.filter((f) => f.category === filter);

  return (
    <div className="mt-6">
      {/* Filter Chips */}
      <div className="flex gap-2 mb-4 text-sm">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full border ${
              filter === cat
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white text-sm shadow">
        <table className="w-full table-auto text-left">
          <thead className="border-b border-gray-200 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-2">File Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Size</th>
              <th className="px-4 py-2">Uploaded</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleFiles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-center text-gray-500">
                  No files uploaded yet.
                </td>
              </tr>
            ) : (
              visibleFiles.map((file) => (
                <tr key={file.filename} className="border-b border-gray-200 last:border-0">
                  <td className="px-4 py-2">{file.filename}</td>
                  <td className="px-4 py-2">{file.category}</td>
                  <td className="px-4 py-2">{file.size_kb} KB</td>
                  <td className="px-4 py-2">{file.uploaded_at}</td>
                  <td className="px-4 py-2 flex items-center justify-center gap-3 text-gray-500">
                    <Eye className="w-4 h-4 hover:text-gray-700 cursor-pointer" />
                    <Trash2
                      className="w-4 h-4 hover:text-red-600 cursor-pointer"
                      onClick={() => handleDelete(file.filename)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
