// app/project/[slug]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProjectFileUploadModal from "@/components/ProjectFileUploadModal";

export default function ProjectPage() {
  const { slug } = useParams();
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    document.title = `${slug} - Project`;
  }, [slug]);

  return (
    <main className="p-6 text-gray-800">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">{slug}</h1>
        <p className="text-sm text-gray-500 mb-6">
          Manage instructions, files, and outputs for this project.
        </p>

        {/* Upload Button */}
        <div className="text-right mb-4">
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900"
          >
            + Upload File
          </button>
        </div>

        {/* File Upload Modal */}
        <ProjectFileUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          projectName={slug as string}
          onUploadSuccess={() => {
            // refresh the file list or just close modal
            setShowUploadModal(false)
            // optionally trigger a fetch or re-render here
          }}
        />

        {/* Placeholder for rest of project page (instructions, file table, etc.) */}
        <div className="text-sm text-gray-500 mt-12">
          File table, filters, and instructions will appear here...
        </div>
      </div>
    </main>
  );
}
