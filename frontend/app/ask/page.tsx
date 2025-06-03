'use client'

import React, { useState, useEffect, useRef } from 'react'

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5050';

export default function AskPage() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('')
  const [allowedModels, setAllowedModels] = useState<string[]>([])
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch settings on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setAllowedModels(data.allowed_text_models || ['llama3.2', 'mistral', 'phi3'])
        setModel(data.default_text_model || 'llama3.2')
      })
      .catch(err => {
        console.warn("⚠️ Failed to load settings, using defaults.")
        setAllowedModels(['llama3.2', 'mistral', 'phi3'])
        setModel('llama3.2')
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResponse('')

    const formData = new FormData()
    formData.append('prompt', prompt)
    formData.append('models', model)
    if (file) formData.append('file', file)

    try {
      const res = await fetch(`${baseUrl}/ask`, {
        method: 'POST',
        body: formData,
      })

      if (!res.body) throw new Error('No response body')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setResponse((prev) => prev + decoder.decode(value, { stream: true }))
      }
    } catch (err) {
      console.error('❌ Backend error:', err)
      setResponse('⚠️ Failed to fetch from backend.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected && selected.size <= 25 * 1024 * 1024) {
      setFile(selected)
    } else {
      alert('❌ File must be ≤ 25MB')
      e.target.value = ''
    }
  }

  return (
    <main className="bg-white text-gray-800 font-sans min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Text Analysis</h1>
        <p className="text-sm text-gray-600 mb-6">
          Enter your query, upload a file (optional), and select a model to receive a streaming response.
        </p>

        <form onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium block mb-1">Enter your question:</label>
            <textarea
              rows={4}
              className="w-full border border-gray-300 p-3 rounded-lg text-sm"
              placeholder="Ask me anything..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mt-6 mb-2">Attach a PDF for RAG (optional):</label>
            <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-500">
              <input
                type="file"
                accept=".pdf,.docx,.txt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
                id="uploadFileInput"
              />
              <label htmlFor="uploadFileInput" className="cursor-pointer">
                Drag and drop a PDF, or click to browse
                <p className="text-xs mt-1">Supports .PDF files up to 25MB</p>
              </label>
            </div>
            {file && <p className="text-sm text-gray-600 mt-2">📎 {file.name}</p>}
          </div>

          <div>
            <label className="text-sm font-medium block mt-6 mb-2">Select Model:</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div className="text-sm font-semibold">{m === 'llama3.2' ? 'LLaMA 3' : m.charAt(0).toUpperCase() + m.slice(1)}</div>
                  <div className="text-xs text-gray-500 mt-1">Ollama Text Model</div>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900 disabled:opacity-50"
            >
              {loading ? 'Asking...' : 'Ask'}
            </button>
          </div>
        </form>

        <div className="mt-6">
          {loading && (
            <div className="text-sm text-gray-500 mb-2">⏳ In progress...</div>
          )}
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
      </div>
    </main>
  )
}
