"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProjectFileUploadModal from "@/components/ProjectFileUploadModal";
import ProjectFileTable from "@/components/ProjectFileTable";
import StepSection from "@/components/StepSection";

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

        {resolvedSlug && (
          <>
            <div className="border rounded-xl bg-white shadow-sm p-5 mb-8">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
                <span className="text-gray-700">📝 Project Instructions</span>
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Define and run step-by-step tasks for this project.
              </p>

              {/* Step sections */}
              <StepSection slug={resolvedSlug} step="plan" title="Plan Instructions" />
              <StepSection slug={resolvedSlug} step="write" title="Write Draft" />
              <StepSection slug={resolvedSlug} step="check" title="Check Quality" />
            </div>

            {/* Upload Button */}
            <div className="text-right mb-4">
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900"
              >
                + Upload File
              </button>
            </div>

            {/* Upload Modal */}
            <ProjectFileUploadModal
              isOpen={showUploadModal}
              onClose={() => setShowUploadModal(false)}
              projectName={resolvedSlug}
              onUploadSuccess={() => {}}
            />

            {/* File Table */}
            <ProjectFileTable slug={resolvedSlug} />
          </>
        )}
      </div>
    </main>
  );
}
