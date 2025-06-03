"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProjectFileUploadModal from "@/components/ProjectFileUploadModal";
import ProjectFileTable from "@/components/ProjectFileTable";

export default function ProjectPage() {
  const { slug } = useParams();
  const resolvedSlug = Array.isArray(slug) ? slug[0] : slug;

  const [projectName, setProjectName] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    if (resolvedSlug) {
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/project/${resolvedSlug}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && typeof data === "object") {
            setProjectName(data.project_name || resolvedSlug);
            document.title = `${data.project_name || resolvedSlug} - Project`;
          }
        })
        .catch(() => {
          setProjectName(resolvedSlug);
          document.title = `${resolvedSlug} - Project`;
        });
    }
  }, [resolvedSlug]);

  return (
    <main className="p-6 text-gray-800">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-1 capitalize">{projectName || resolvedSlug}</h1>
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
          projectName={resolvedSlug as string}
          onUploadSuccess={() => {
            // no-op: ProjectFileTable fetches on its own
          }}
        />

        <ProjectFileTable slug={resolvedSlug as string} />

        <div className="text-sm text-gray-500 mt-12">
          Instructions and outputs will appear here...
        </div>
      </div>
    </main>
  );
}
