'use client'

import React, { useEffect, useState } from 'react'

interface StatEntry {
  question: string
  model: string
  source: string
  timestamp: string
}

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5050'

export default function StatsPage() {
  const [stats, setStats] = useState<StatEntry[]>([])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${baseUrl}/list-stats`)
        const data = await res.json()
        const last20 = data.slice(-20).reverse()
        setStats(last20)
      } catch (err) {
        console.error('Error fetching stats:', err)
      }
    }
    fetchStats()
  }, [])

  return (
    <main className="bg-white text-gray-800 font-sans min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Statistics</h1>
        <p className="text-sm text-gray-600 mb-6">Recent questions asked and the model used</p>

        <div className="overflow-x-auto shadow border rounded-lg">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-100 text-xs text-gray-700 uppercase">
              <tr>
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.map((entry, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{entry.question}</td>
                  <td className="px-4 py-3">{entry.model}</td>
                  <td className="px-4 py-3">{entry.source}</td>
                  <td className="px-4 py-3">{entry.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}