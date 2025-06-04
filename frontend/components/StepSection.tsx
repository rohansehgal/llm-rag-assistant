// components/StepSection.tsx
"use client";

import { useState } from "react";

interface StepSectionProps {
  step: "plan" | "write" | "check";
  slug: string;
  title: string; // ✅ add this line

}

export default function StepSection({ step, slug, title }: StepSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [saved, setSaved] = useState(false);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);



  const toggleExpanded = () => setExpanded((prev) => !prev);

  const handleSave = () => {
    setSaved(true);
    setEditing(false);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setOutput("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/project/${slug}/run-step/${step}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          user: userPrompt,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setOutput("[Error: No response reader]");
        return;
      }


      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setOutput((prev) => prev + chunk);
      }

    } catch {
      console.error("❌ Streaming error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-10 border rounded-xl p-4 bg-white shadow-sm">
<h2 className="text-lg font-semibold mb-2 cursor-pointer" onClick={toggleExpanded}>
  {title}
</h2>

      {expanded && (
        <>
          {!saved && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-blue-600 underline mb-3"
            >
              Add Instructions
            </button>
          )}

          {editing && (
            <div className="mb-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">System Prompt</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full border rounded p-2 text-sm"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">User Prompt</label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  className="w-full border rounded p-2 text-sm"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="text-sm px-4 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="text-sm px-4 py-1.5 rounded bg-gray-800 text-white hover:bg-gray-900"
                >
                  Save Instructions
                </button>
              </div>
            </div>
          )}

          {saved && !editing && (
            <>
              <div className="mb-3 text-sm text-gray-700 whitespace-pre-wrap">
                <strong>System:</strong> {systemPrompt || "[empty]"}
                <br />
                <strong>User:</strong> {userPrompt || "[empty]"}
              </div>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm px-4 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Edit Instructions
                </button>
                <button
                  onClick={handleGenerate}
                  className="text-sm px-4 py-1.5 rounded bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Generating..." : "Generate Step"}
                </button>
              </div>
            </>
          )}

          {output && (
            <div className="border rounded p-3 text-sm bg-gray-50 text-gray-700 whitespace-pre-wrap">
              {output}
            </div>
          )}
        </>
      )}
    </section>
  );
}
