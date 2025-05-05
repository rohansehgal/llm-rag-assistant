// components/TextAnalysisPage.tsx

import React from "react";

export default function TextAnalysisPage() {
  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-bold mb-4">Text Analysis</h1>

      {/* Prompt Input */}
      <textarea
        placeholder="Ask a question..."
        className="w-full p-3 border rounded-md mb-4 min-h-[100px]"
      />

      {/* File Upload */}
      <div className="mb-4">
        <label className="block mb-2 font-medium">Attach a file (optional):</label>
        <input type="file" className="block" />
      </div>

      {/* Submit Button */}
      <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded">
        Submit
      </button>

      {/* Placeholder for response */}
      <div className="mt-6 p-4 border rounded-md bg-gray-50">
        <p className="text-sm text-gray-500">Response will appear here...</p>
      </div>
    </main>
  );
}
