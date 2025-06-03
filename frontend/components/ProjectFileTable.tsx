// components/ProjectFileTable.tsx
"use client";

import { useEffect, useState, useCallback } from "react";

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

  // ✅ Memoized function to fetch files
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
  }, [fetchFiles]); // ✅ Warning resolved: all deps included

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
    <div className="overflow-x-auto border rounded-xl bg-white p-4 text-sm shadow">
      <h2 className="text-base font-semibold text-gray-800 mb-3">Uploaded Files</h2>

      {files.length === 0 ? (
        <p className="text-gray-500">No files uploaded yet.</p>
      ) : (
        <table className="w-full table-auto text-left">
          <thead className="border-b text-gray-600">
            <tr>
              <th className="py-1 pr-2">File Name</th>
              <th className="py-1 pr-2">Category</th>
              <th className="py-1 pr-2">Size</th>
              <th className="py-1 pr-2">Uploaded</th>
              <th className="py-1 pr-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.filename} className="border-b last:border-none">
                <td className="py-1 pr-2">{file.filename}</td>
                <td className="py-1 pr-2">{file.category}</td>
                <td className="py-1 pr-2">{file.size_kb} KB</td>
                <td className="py-1 pr-2">{file.uploaded_at}</td>
                <td className="py-1 pr-2">
                  <button
                    onClick={() => handleDelete(file.filename)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
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
