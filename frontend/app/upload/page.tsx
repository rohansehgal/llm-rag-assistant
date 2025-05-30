"use client"

import React, { useRef, useState, useEffect } from 'react'
const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5050"

interface UploadedFile {
  name: string
  size: string
  type: string
  source: string
  folder: string
  upload_date?: string
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      const res = await fetch(baseUrl + "/list-files");
      const data = await res.json();
      console.log("Fetched raw response:", data);

      if (Array.isArray(data)) {
        setFiles(data);
      } else {
        console.error("Expected array but got:", typeof data);
      }
    } catch (err) {
      console.error("Failed to fetch files", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    const valid = selected.filter(
      (file) =>
        file.size <= 25 * 1024 * 1024 &&
        ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
         "text/plain", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
         "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
         "image/jpeg", "image/png", "image/gif"].includes(file.type)
    )

    if (valid.length !== selected.length) {
      setError("❌ Some files were invalid or too large (max 25MB).")
    } else {
      setError('')
    }

    setSelectedFiles(valid)
  }

  const handleUpload = async () => {
    if (!selectedFiles.length) return;
    setUploading(true);
    setError('');

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('files', file));

    try {
      const res = await fetch(baseUrl + '/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      setSelectedFiles([]);
      await fetchFiles();
    } catch {
      setError('❌ Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="bg-white text-gray-800 font-sans min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Upload Manager</h1>

        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            ➕ Add File
          </button>
          <button
            onClick={async () => {
              try {
                const res = await fetch(baseUrl + "/rebuild-index", { method: "POST" });
                if (res.ok) {
                  alert("✅ Index rebuilt successfully.");
                } else {
                  alert("⚠️ Failed to rebuild index.");
                }
              } catch {
                alert("❌ Error occurred while rebuilding index.");
              }
            }}
            className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900"
          >
            Generate Index
          </button>
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>

        {selectedFiles.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Ready to upload:</p>
            <ul className="list-disc ml-6 text-sm">
              {selectedFiles.map((file, idx) => (
                <li key={idx}>{file.name}</li>
              ))}
            </ul>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        )}

        {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

        <table className="w-full text-sm mt-6 bg-white shadow-sm border rounded-lg divide-y">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">File Name</th>
              <th className="p-2 text-left">Upload Source</th>
              <th className="p-2 text-left">File Type</th>
              <th className="p-2 text-left">File Size</th>
              <th className="p-2 text-left">Upload Date</th>
              <th className="p-2 text-left">View</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(files) && files.length > 0 ? (
              files.map((file, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2 font-medium flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    {file.name}
                  </td>
                  <td className="p-2">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                      file.source === 'Manual Upload' ? 'bg-gray-800 text-white' :
                      file.source === 'PDF Analysis' ? 'bg-gray-200 text-gray-700' :
                      file.source === 'Image Analysis' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {file.source}
                    </span>
                  </td>
                  <td className="p-2">{file.type}</td>
                  <td className="p-2">{file.size}</td>
                  <td className="p-2">{file.upload_date || '-'}</td>
                  <td className="p-2 flex gap-3 items-center">
                    <a
                      href={`${baseUrl}/uploads/${file.folder}/${file.name}`}
                      target="_blank"
                      className="text-gray-500 hover:text-gray-700"
                      title="View"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </a>
                    <button
                      onClick={async () => {
                        const confirmed = confirm(`Are you sure you want to delete "${file.name}"?`)
                        if (!confirmed) return
                        try {
                          const res = await fetch(`${baseUrl}/delete-file`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ filename: file.name, folder: file.folder })
                          })
                          if (!res.ok) throw new Error()
                          await fetchFiles()
                        } catch {
                          alert('Error deleting file.')
                        }
                      }}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 0V4a2 2 0 012-2h2a2 2 0 012 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-2 text-center text-gray-500">No files uploaded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}