"use client";

import { useEffect, useState } from "react";
import PageWrapper from '@/components/PageWrapper'


type StatEntry = {
  question: string;
  timestamp: string;
  model: string;
  source: string;
};

export default function StatsPage() {
  const [stats, setStats] = useState<StatEntry[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/list-stats`)
      .then((res) => res.json())
      .then((data) => {
        const last20 = data.slice(-20).reverse();
        setStats(last20);
      })
      .catch((err) => console.error("Failed to fetch stats", err));
  }, []);

  return (
<PageWrapper>

        <h1 className="text-2xl font-bold mb-2">Statistics</h1>
        <p className="text-sm text-gray-500 mb-6">
          Latest 20 questions asked and their associated models
        </p>

        <div className="overflow-x-auto bg-white border rounded-2xl shadow">
          <table className="min-w-full table-auto text-left text-sm">
            <thead className="bg-gray-100 border-b text-gray-700 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Question</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Model</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.map((entry, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-2 max-w-xs truncate" title={entry.question}>
                    {entry.question}
                  </td>
                  <td className="px-4 py-2">{entry.source}</td>
                  <td className="px-4 py-2">{new Date(entry.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-2">{entry.model}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </PageWrapper>
  );
}
