"use client";

import { useEffect, useState } from "react";
import { Trash2, Eye } from "lucide-react";

interface FileEntry {
  filename: string;
  category: string;
  size_kb: number;
  uploaded_at: string;
}

export default function ProjectFileTable({ projectSlug }: { projectSlug: string }) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/project/${projectSlug}/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (e) {
      console.warn("⚠️ Failed to fetch project files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [projectSlug]);

  const handleDelete = async (filename: string) => {
    const confirmed = confirm(`Delete file "${filename}"?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/project/${projectSlug}/delete-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });

      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.filename !== filename));
      } else {
        alert("❌ Failed to delete file");
      }
    } catch (e) {
      alert("❌ Error deleting file");
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading files...</p>;

  if (files.length === 0) {
    return <p className="text-sm text-gray-500">No files uploaded yet.</p>;
  }

  return (
    <div className="overflow-x-auto mt-6">
      <table className="w-full text-sm border rounded-lg bg-white shadow-sm">
        <thead className="bg-gray-100 text-left text-gray-700 font-medium">
          <tr>
            <th className="px-4 py-2">File</th>
            <th className="px-4 py-2">Category</th>
            <th className="px-4 py-2">Size</th>
            <th className="px-4 py-2">Uploaded</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => (
            <tr key={f.filename} className="border-t text-gray-800">
              <td className="px-4 py-2">{f.filename}</td>
              <td className="px-4 py-2">{f.category}</td>
              <td className="px-4 py-2">{f.size_kb} KB</td>
              <td className="px-4 py-2">{new Date(f.uploaded_at).toLocaleDateString()}</td>
              <td className="px-4 py-2 text-right flex gap-3 justify-end">
                <a
                  href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/project/${projectSlug}/files/${f.filename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View file"
                >
                  <Eye size={16} className="text-gray-600 hover:text-black" />
                </a>
                <button
                  onClick={() => handleDelete(f.filename)}
                  title="Delete file"
                >
                  <Trash2 size={16} className="text-red-500 hover:text-red-700" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
