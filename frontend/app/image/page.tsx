'use client';

import { useEffect, useState, useRef } from 'react';
import PageWrapper from '@/components/PageWrapper';

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5050';

export default function ImagePage() {
  const [model, setModel] = useState('');
  const [allowedModels, setAllowedModels] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load allowed/default models from settings
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setAllowedModels(data.allowed_image_models || []);
        setModel(data.default_image_model || '');
      })
      .catch(err => {
        console.warn('⚠️ Failed to load image model settings:', err);
        setAllowedModels(['bakllava', 'llava-llama3']);
        setModel('bakllava');
      });
  }, []);

  // Handle file selection or drop
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      alert('❌ Please upload a valid image file.');
      return;
    }

    if (selected.size > 25 * 1024 * 1024) {
      alert('❌ File must be ≤ 25MB.');
      return;
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setResponse('');
  };

  // Submit for analysis
  const handleSubmit = async () => {
    if (!file) {
      alert('❌ Please upload an image.');
      return;
    }

    setLoading(true);
    setResponse('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', model);

    try {
      const res = await fetch(`${baseUrl}/analyze-image`, {
        method: 'POST',
        body: formData,
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setResponse((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      console.error('❌ Image analysis failed:', err);
      setResponse('⚠️ Failed to analyze image.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <h1 className="text-2xl font-semibold mb-2">Image Analysis</h1>
      <p className="text-sm text-gray-600 mb-6">
        Upload an image and select a model to receive a streaming response.
      </p>

      <div className="space-y-6">
        {/* Upload Section */}
        <div>
          <label className="text-sm font-medium block mb-2">Upload an Image:</label>
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-500 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="mx-auto max-h-48 rounded-md" />
            ) : (
              <>
                Drag and drop or click to upload
                <p className="text-xs mt-1">Supported formats: JPG, PNG, GIF — up to 25MB</p>
              </>
            )}
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.gif"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Model Selection */}
        <div>
          <label className="text-sm font-medium block mb-2">Select Model:</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allowedModels.map((m) => (
              <label
                key={m}
                className={`border p-4 rounded-lg cursor-pointer ${
                  model === m ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="model"
                  value={m}
                  checked={model === m}
                  onChange={() => setModel(m)}
                  disabled={loading}
                  className="hidden"
                />
                <div className="text-sm font-semibold">{m}</div>
                <div className="text-xs text-gray-500 mt-1">Vision Model</div>
              </label>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Analyze Image'}
          </button>
        </div>

        {/* Streaming Response */}
        {response && (
          <div className="mt-6 border border-gray-300 rounded-lg bg-white">
            <div className="bg-gray-100 border-b border-gray-300 rounded-t-lg px-4 py-2 text-sm text-gray-600 font-medium">
              Response from {model}
            </div>
            <div className="p-4 text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
              {response}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
