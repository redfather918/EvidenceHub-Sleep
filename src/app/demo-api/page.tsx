// EvidenceHub — Demo API Viewer (beautiful JSON display for video)

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ClaimData {
  slug: string;
  text: string;
  confidence: number;
  confidenceLevel: string;
  rcts: number;
  meta: number;
  dose: string;
  population: string[];
  evidenceScore: number;
  lastUpdated: string;
  _links?: Record<string, string>;
}

export default function DemoApiPage() {
  const [data, setData] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/claim/glycine-sleep-latency")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header bar */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-sm text-gray-400 ml-2">EvidenceHub API</span>
        </div>
        <Link href="/demo" className="text-sm text-gray-500 hover:text-white">
          ← Back to Demo
        </Link>
      </div>

      {/* URL bar */}
      <div className="px-6 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2 font-mono text-sm">
          <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold text-xs">GET</span>
          <span className="text-gray-300">http://localhost:3000</span>
          <span className="text-cyan-400">/api/claim/glycine-sleep-latency</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-3xl mx-auto">

          {/* Response status */}
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-bold">
              200 OK
            </span>
            <span className="text-gray-500 text-sm">application/json</span>
          </div>

          {/* JSON display */}
          {loading ? (
            <div className="text-gray-500 font-mono">Loading...</div>
          ) : data ? (
            <pre className="bg-gray-900 rounded-lg p-6 font-mono text-sm leading-relaxed border border-gray-800 overflow-x-auto">
<span className="text-gray-500">{"{"}</span>
{"  "}
<span className="text-cyan-400">"slug"</span><span className="text-gray-500">: </span><span className="text-green-400">"{data.slug}"</span><span className="text-gray-500">,</span>
{"  "}
<span className="text-cyan-400">"text"</span><span className="text-gray-500">: </span><span className="text-green-400">"{data.text}"</span><span className="text-gray-500">,</span>
{"  "}
<span className="text-cyan-400">"confidence"</span><span className="text-gray-500">: </span><span className="text-amber-400">{data.confidence}</span><span className="text-gray-500">,</span>
{"  "}
<span className="text-cyan-400">"confidenceLevel"</span><span className="text-gray-500">: </span><span className="text-green-400">"{data.confidenceLevel}"</span><span className="text-gray-500">,</span>
{"  "}
<span className="text-cyan-400">"rcts"</span><span className="text-gray-500">: </span><span className="text-amber-400">{data.rcts}</span><span className="text-gray-500">,</span>
{"  "}
<span className="text-cyan-400">"meta"</span><span className="text-gray-500">: </span><span className="text-amber-400">{data.meta}</span><span className="text-gray-500">,</span>
{"  "}
<span className="text-cyan-400">"dose"</span><span className="text-gray-500">: </span><span className="text-green-400">"{data.dose}"</span><span className="text-gray-500">,</span>
{"  "}
<span className="text-cyan-400">"population"</span><span className="text-gray-500">: [</span>
{data.population.map((p, i) => (
  <span key={i}>
    {"    "}<span className="text-green-400">"{p}"</span>{i < data.population.length - 1 ? <span className="text-gray-500">,</span> : ""}
    {i < data.population.length - 1 ? "\n" : ""}
  </span>
))}
{"  "}<span className="text-gray-500">],</span>
{"  "}
<span className="text-cyan-400">"evidenceScore"</span><span className="text-gray-500">: </span><span className="text-amber-400">{data.evidenceScore}</span><span className="text-gray-500">,</span>
{"  "}
<span className="text-cyan-400">"lastUpdated"</span><span className="text-gray-500">: </span><span className="text-green-400">"{data.lastUpdated}"</span>
<span className="text-gray-500">{"}"}</span>
            </pre>
          ) : (
            <div className="text-red-400 font-mono">Failed to load</div>
          )}

          {/* Field explanations */}
          {data && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { field: "confidence", value: data.confidence, label: "Evidence Score (0-100)", color: "text-amber-400" },
                { field: "confidenceLevel", value: data.confidenceLevel, label: "Confidence Tier", color: "text-green-400" },
                { field: "rcts", value: data.rcts, label: "Human RCTs", color: "text-cyan-400" },
                { field: "dose", value: data.dose, label: "Recommended Dose", color: "text-purple-400" },
              ].map((item) => (
                <div key={item.field} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                  <div className={`text-2xl font-bold ${item.color}`}>{String(item.value)}</div>
                  <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Call to action */}
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm mb-4">
              This is what AI agents see. Structured, computable, ready to use.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/api-docs"
                className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Full API Docs →
              </Link>
              <Link
                href="/demo"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Demo CTA
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
