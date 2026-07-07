"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GraphView from "@/components/graph/GraphView";
import type { GraphResponse } from "@/lib/types";

const QUICK_TOPICS = [
  "sleep",
  "nutrition",
  "heart",
  "longevity",
  "sports",
  "mental",
  "metabolic",
];

export default function GraphPage() {
  const [entity, setEntity] = useState("sleep");
  const [depth, setDepth] = useState(2);
  const [data, setData] = useState<GraphResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/graph/${encodeURIComponent(entity)}?depth=${depth}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) {
          setError(json.message || json.error);
          setData(null);
        } else {
          setData(json);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entity, depth]);

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col">
      {/* Header / controls */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-bold text-gray-900">Evidence Graph</h1>
        <span className="text-sm text-gray-400">
          Explore how claims, topics &amp; studies connect
        </span>

        <div className="flex-1" />

        <label className="text-sm text-gray-500">Center:</label>
        <input
          type="text"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") fetch;
          }}
          placeholder="sleep, glycine, melatonin…"
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm w-52 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        <div className="flex gap-1">
          {QUICK_TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => setEntity(t)}
              className={`px-2.5 py-1 text-xs rounded-md border ${
                entity === t
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-brand-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="text-sm text-gray-500">Depth:</label>
        <select
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
          className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </div>

      {/* Graph canvas */}
      <div className="flex-1 p-4">
        {loading && (
          <div className="h-full flex items-center justify-center text-gray-400">
            Loading graph…
          </div>
        )}
        {error && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <p className="text-gray-500 mb-2">{error}</p>
            <p className="text-sm text-gray-400">
              Try a topic slug like <code>sleep</code> or a claim slug.
            </p>
          </div>
        )}
        {data && !loading && !error && <GraphView data={data} />}
      </div>
    </div>
  );
}
