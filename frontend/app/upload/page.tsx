"use client"

import React, { useRef, useState, useEffect } from 'react'

interface UploadedFile {
  name: string
  size: number
  type: string
  source: string
  upload_date: string
  url: string
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
      const res = await fetch("/files")
      const data = await res.json()
      setFiles(data.files || [])
    } catch {
      console.error("Failed to fetch files");
    }
  }

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
      const res = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      setSelectedFiles([]);
      await fetchFiles();
    } catch (err) {
      setError('❌ Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="bg-white text-gray-800 font-sans min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Upload Manager</h1>

        <div className="mb-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            ➕ Add File
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

        <table className="w-full border text-sm mt-6">
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
            {files.map((file, idx) => (
              <tr key={idx} className="border-t">
                <td className="p-2">{file.name}</td>
                <td className="p-2">{file.source}</td>
                <td className="p-2">{file.type}</td>
                <td className="p-2">{(file.size / 1024).toFixed(1)} KB</td>
                <td className="p-2">{file.upload_date}</td>
                <td className="p-2">
                  <a href={file.url} className="text-blue-600 hover:underline" target="_blank">View</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}