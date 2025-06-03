// components/StepSection.tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader } from "lucide-react";

interface StepSectionProps {
  step: "plan" | "write" | "check";
  title: string;
  slug: string;
}

export default function StepSection({ step, title, slug }: StepSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [saved, setSaved] = useState(false);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setEditMode(false);
    // Save to backend (optional in future)
  };

  const handleCancel = () => {
    setSystemPrompt("");
    setUserPrompt("");
    setEditMode(false);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setOutput("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/project/${slug}/run-step/${step}`, {
        method: "POST",
      });

      if (!res.ok) {
        setOutput("❌ Failed to trigger generation.");
        return;
      }

      const stream = res.body;
      if (!stream) return;

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setOutput((prev) => prev + decoder.decode(value));
      }
    } catch (err) {
      setOutput("❌ Error while streaming response.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="border rounded-xl bg-white p-4 mb-6 shadow">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        </div>
        {saved && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Completed</span>}
      </div>

      {/* Content */}
      {expanded && (
        <div className="mt-4">
          {!saved && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              + Add Instructions
            </button>
          )}

          {(editMode || !saved) && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">System Prompt</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full border rounded p-2 text-sm"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">User Prompt</label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  className="w-full border rounded p-2 text-sm"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 text-sm">
                <button
                  onClick={handleCancel}
                  className="px-4 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-1.5 rounded bg-gray-800 text-white hover:bg-gray-900"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {saved && !editMode && (
            <div className="text-sm space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">System Prompt</div>
                <div className="bg-gray-50 p-3 rounded border whitespace-pre-wrap text-gray-800">
                  {systemPrompt || "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">User Prompt</div>
                <div className="bg-gray-50 p-3 rounded border whitespace-pre-wrap text-gray-800">
                  {userPrompt || "—"}
                </div>
              </div>
              <div className="flex justify-end text-sm">
                <button
                  onClick={() => setEditMode(true)}
                  className="text-blue-600 hover:underline"
                >
                  Edit Instructions
                </button>
              </div>
            </div>
          )}

          {/* Generate Button */}
          {saved && (
            <div className="mt-6">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900 disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader className="animate-spin" size={16} />
                    Generating...
                  </span>
                ) : (
                  `Generate ${title}`
                )}
              </button>
            </div>
          )}

          {/* Output */}
          {output && (
            <div className="mt-6 border rounded p-4 bg-gray-50 text-sm whitespace-pre-wrap text-gray-800 font-mono">
              {output}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
