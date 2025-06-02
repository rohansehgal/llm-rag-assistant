"use client";

import { useEffect, useState } from "react";

const TEXT_MODEL_OPTIONS = ["llama", "mistral", "phi"];
const IMAGE_MODEL_OPTIONS = ["bakllava", "llava-llama3"];

export default function SettingsPage() {
  const [allowedTextModels, setAllowedTextModels] = useState<string[]>([]);
  const [defaultTextModel, setDefaultTextModel] = useState("");
  const [allowedImageModels, setAllowedImageModels] = useState<string[]>([]);
  const [defaultImageModel, setDefaultImageModel] = useState("");
  const [status, setStatus] = useState("");

  // Fetch settings on load
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setAllowedTextModels(data.allowed_text_models || []);
        setDefaultTextModel(data.default_text_model || "");
        setAllowedImageModels(data.allowed_image_models || []);
        setDefaultImageModel(data.default_image_model || "");
      });
  }, []);

  // Update checkbox arrays
  const toggleModel = (
    model: string,
    currentList: string[],
    setList: (val: string[]) => void
  ) => {
    if (currentList.includes(model)) {
      setList(currentList.filter((m) => m !== model));
    } else {
      setList([...currentList, model]);
    }
  };

  const handleSave = async () => {
    setStatus("Saving...");
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allowed_text_models: allowedTextModels,
        default_text_model: defaultTextModel,
        allowed_image_models: allowedImageModels,
        default_image_model: defaultImageModel,
      }),
    });

    if (res.ok) {
      setStatus("✅ Settings saved.");
    } else {
      setStatus("❌ Error saving settings.");
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
      <h1 className="text-3xl font-bold">Settings</h1>

      {/* Text Model Settings */}
      <section className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Text Model Settings</h2>
        <div className="mb-4 space-y-2">
          <p className="font-medium">Allowed Text Models:</p>
          <div className="space-x-4">
            {TEXT_MODEL_OPTIONS.map((model) => (
              <label key={model} className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={allowedTextModels.includes(model)}
                  onChange={() =>
                    toggleModel(model, allowedTextModels, setAllowedTextModels)
                  }
                />
                {model}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block mb-2 font-medium">Default Text Model:</label>
          <select
            value={defaultTextModel}
            onChange={(e) => setDefaultTextModel(e.target.value)}
            className="border px-3 py-2 rounded w-full max-w-sm"
          >
            {TEXT_MODEL_OPTIONS.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Image Model Settings */}
      <section className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Image Model Settings</h2>
        <div className="mb-4 space-y-2">
          <p className="font-medium">Allowed Image Models:</p>
          <div className="space-x-4">
            {IMAGE_MODEL_OPTIONS.map((model) => (
              <label key={model} className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={allowedImageModels.includes(model)}
                  onChange={() =>
                    toggleModel(model, allowedImageModels, setAllowedImageModels)
                  }
                />
                {model}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block mb-2 font-medium">Default Image Model:</label>
          <select
            value={defaultImageModel}
            onChange={(e) => setDefaultImageModel(e.target.value)}
            className="border px-3 py-2 rounded w-full max-w-sm"
          >
            {IMAGE_MODEL_OPTIONS.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
        >
          Save Settings
        </button>
        <p className="text-sm text-gray-500">{status}</p>
      </div>
    </main>
  );
}
