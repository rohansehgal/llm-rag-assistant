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

export default function ProjectFileTable({ slug }: Props) {
  const [files, setFiles] = useState<FileEntry[]>([]);

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

  return (
    <div className="max-w-6xl mx-auto overflow-x-auto border border-gray-200 rounded-xl bg-white p-4 text-sm shadow">
      <h2 className="text-base font-semibold text-gray-800 mb-3">Uploaded Files</h2>

      {files.length === 0 ? (
        <p className="text-gray-500">No files uploaded yet.</p>
      ) : (
        <table className="w-full table-auto text-left">
          <thead className="border-b border-gray-200 text-gray-600">
            <tr>
              <th className="py-1 pr-2">File Name</th>
              <th className="py-1 pr-2">Category</th>
              <th className="py-1 pr-2">Size</th>
              <th className="py-1 pr-2">Uploaded</th>
              <th className="py-1 pr-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.filename} className="border-b border-gray-200 last:border-none">
                <td className="py-1 pr-2">{file.filename}</td>
                <td className="py-1 pr-2">{file.category}</td>
                <td className="py-1 pr-2">{file.size_kb} KB</td>
                <td className="py-1 pr-2">{file.uploaded_at}</td>
                <td className="py-1 pr-2 flex gap-3">
                  <a
                    href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/project/${slug}/files/${file.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-gray-700"
                    title="View file"
                  >
                    <Eye size={16} />
                  </a>
                  <button
                    onClick={() => handleDelete(file.filename)}
                    className="text-gray-500 hover:text-gray-700"
                    title="Delete file"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
