"use client";

import { useEffect, useState } from "react";

type StatEntry = {
  question: string;
  timestamp: string;
  model: string;
  answer: string;
  source?: string;
};

export default function StatsPage() {
  const [stats, setStats] = useState<StatEntry[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/stats`)
      .then((res) => res.json())
      .then((data) => {
        const last20 = data.slice(-20).reverse(); // get last 20 entries
        setStats(last20);
      })
      .catch((err) => console.error("Failed to fetch stats", err));
  }, []);

  return (
    <main className="p-6 bg-gray-50 min-h-screen text-gray-800 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Model Activity Stats</h1>
        <p className="text-sm text-gray-500 mb-6">Latest 20 questions asked and their models</p>

        <div className="overflow-x-auto bg-white border rounded-lg shadow-sm">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-100 text-xs text-gray-700 uppercase">
              <tr>
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.map((entry, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 max-w-xs truncate" title={entry.question}>{entry.question}</td>
                  <td className="px-4 py-3">{new Date(entry.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3">{entry.model}</td>
                  <td className="px-4 py-3">{entry.source || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
