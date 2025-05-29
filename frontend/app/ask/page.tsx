'use client'

import React, { useState } from 'react'
// test
export default function AskPage() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('llama3')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResponse('')

    const formData = new FormData()
    formData.append('prompt', prompt)
    formData.append('models', model)

    try {
      const res = await fetch('http://127.0.0.1:5050/ask', {
        method: 'POST',
        body: formData,
      })

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let result = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        result += decoder.decode(value, { stream: true })
        setResponse((prev) => prev + decoder.decode(value, { stream: true }))
      }

      setResponse(result)
    } catch (err) {
      console.error('❌ Failed to fetch from backend:', err)
      setResponse('⚠️ Error reaching backend.')
    } finally {
      setLoading(false)
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
                  />{' '}
                  {m}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            {loading ? 'Asking...' : 'Ask'}
          </button>
        </form>

        {response && (
          <div className="mt-6 p-4 border bg-white rounded shadow">
            <h3 className="font-semibold mb-2">Response:</h3>
            <pre className="whitespace-pre-wrap">{response}</pre>
          </div>
        )}
      </div>
    </main>
  )
}