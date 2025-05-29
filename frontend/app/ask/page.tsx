'use client'

import React, { useState, useRef } from 'react'

export default function AskPage() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('llama3.2')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResponse('')

    const formData = new FormData()
    formData.append('prompt', prompt)
    formData.append('models', model)
    if (file) formData.append('file', file)

    try {
      const res = await fetch('http://34.44.66.122:5050/ask', {
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
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🧠 Ask the Assistant</h1>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block font-medium mb-1">Your Question</label>
            <textarea
              rows={4}
              className="w-full border border-gray-300 p-3 rounded"
              placeholder="Ask me anything..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Upload File (Optional)</label>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {file && <p className="text-sm text-gray-600 mt-1">📎 {file.name}</p>}
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Choose a Model</label>
            <div className="flex gap-4">
              {['llama3.2', 'mistral', 'phi3'].map((m) => (
                <label key={m}>
                  <input
                    type="radio"
                    name="model"
                    value={m}
                    checked={model === m}
                    onChange={() => setModel(m)}
                    disabled={loading}
                    className="mr-1"
                  />
                  {m}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Asking...' : 'Ask'}
          </button>
        </form>

        <div className="mt-6">
          {loading && (
            <div className="text-sm text-gray-500 mb-2">⏳ In progress...</div>
          )}
          {response && (
            <div className="p-4 border bg-white rounded shadow">
              <h3 className="font-semibold mb-2">Response:</h3>
              <pre className="whitespace-pre-wrap">{response}</pre>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}