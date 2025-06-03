// components/ProjectFileTable.tsx
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
  const [selectedCategory, setSelectedCategory] = useState("All");

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`/project/${slug}/files`);
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
      const res = await fetch(`/project/${slug}/delete-file`, {
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
    selectedCategory === "All"
      ? files
      : files.filter((f) => f.category === selectedCategory);

  return (
    <div className="text-sm mt-8">
      {/* Filter chips */}
      <div className="mb-3 flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full border ${
              selectedCategory === cat
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-xl bg-white p-4 shadow">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Uploaded Files</h2>

        {visibleFiles.length === 0 ? (
          <p className="text-gray-500">No files uploaded yet.</p>
        ) : (
          <table className="w-full table-auto text-left border-collapse">
            <thead className="border-b text-gray-600">
              <tr>
                <th className="py-1.5 px-2">File Name</th>
                <th className="py-1.5 px-2">Category</th>
                <th className="py-1.5 px-2">Size</th>
                <th className="py-1.5 px-2">Uploaded</th>
                <th className="py-1.5 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleFiles.map((file) => (
                <tr key={file.filename} className="border-b last:border-none">
                  <td className="py-1.5 px-2">{file.filename}</td>
                  <td className="py-1.5 px-2">{file.category}</td>
                  <td className="py-1.5 px-2">{file.size_kb} KB</td>
                  <td className="py-1.5 px-2">{file.uploaded_at}</td>
                  <td className="py-1.5 px-2">
                    <div className="flex gap-3 items-center">
                      <a
                        href={`/project/${slug}/files/${file.filename}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <Eye size={16} />
                      </a>
                      <button
                        onClick={() => handleDelete(file.filename)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
