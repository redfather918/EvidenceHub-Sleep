"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GraphNode, GraphEdge, GraphResponse, GraphNodeType, GraphRelation } from "@/lib/types";

// ---- Visual config ----
const NODE_COLORS: Record<GraphNodeType, string> = {
  topic: "#6366f1", // indigo
  claim: "#0ea5e9", // sky
  study: "#f59e0b", // amber
  outcome: "#10b981", // emerald
  intervention: "#ec4899", // pink
};

const RELATION_COLORS: Record<GraphRelation, string> = {
  belongs_to: "#cbd5e1",
  related_to: "#93c5fd",
  studied_by: "#fcd34d",
  supports: "#86efac",
  contradicts: "#fca5a5",
};

const RELATION_LABELS: Record<GraphRelation, string> = {
  belongs_to: "belongs to",
  related_to: "related to",
  studied_by: "studied by",
  supports: "supports",
  contradicts: "contradicts",
};

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
  r: number;
  type: GraphNodeType;
  label: string;
  url: string;
  weight: number;
  metadata?: Record<string, unknown>;
}

interface SimEdge {
  from: string;
  to: string;
  relation: GraphRelation;
  weight: number;
}

function nodeRadius(weight: number, type: GraphNodeType): number {
  if (type === "topic") return 14 + Math.min(weight, 30) * 0.4;
  if (type === "study") return 6;
  // claim: scale by evidence score
  return 7 + Math.min(weight, 100) * 0.12;
}

export default function GraphView({ data }: { data: GraphResponse }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<{ nodes: SimNode[]; edges: SimEdge[] }>({ nodes: [], edges: [] });
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<{ id: string | null; moved: boolean }>({ id: null, moved: false });

  const [selected, setSelected] = useState<SimNode | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState({ x: -400, y: -300, w: 800, h: 600 });
  const [tick, setTick] = useState(0); // forces re-render after sim settles/drag

  // Build simulation nodes/edges from props
  const sim = useMemo(() => {
    const nodes: SimNode[] = data.nodes.map((n: GraphNode, i: number) => {
      const angle = (i / Math.max(1, data.nodes.length)) * Math.PI * 2;
      const radius = 200 + (i % 5) * 30;
      return {
        id: n.id,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
        r: nodeRadius(n.weight, n.type),
        type: n.type,
        label: n.label,
        url: n.url,
        weight: n.weight,
        metadata: n.metadata,
      };
    });
    const edges: SimEdge[] = data.edges.map((e: GraphEdge) => ({
      from: e.from,
      to: e.to,
      relation: e.relation,
      weight: e.weight,
    }));
    return { nodes, edges };
  }, [data]);

  // Run force simulation
  const runSimulation = useCallback(() => {
    const { nodes, edges } = simRef.current;
    if (nodes.length === 0) return;

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const iterations = 320;
    const kRepulse = 5200;
    const kSpring = 0.035;
    const restLength = 90;
    const centerPull = 0.012;
    const damping = 0.86;

    for (let iter = 0; iter < iterations; iter++) {
      // Repulsion (O(n^2), fine for <=250 nodes)
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let distSq = dx * dx + dy * dy;
          if (distSq < 1) {
            dx = (Math.random() - 0.5) * 2;
            dy = (Math.random() - 0.5) * 2;
            distSq = dx * dx + dy * dy + 0.01;
          }
          const dist = Math.sqrt(distSq);
          const force = kRepulse / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // Spring on edges
      for (const e of edges) {
        const a = nodeMap.get(e.from);
        const b = nodeMap.get(e.to);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = kSpring * (dist - restLength);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // Centering + integrate
      for (const n of nodes) {
        n.vx += -n.x * centerPull;
        n.vy += -n.y * centerPull;
        if (n.fx != null) {
          n.x = n.fx;
          n.vx = 0;
        } else {
          n.x += n.vx;
          n.vx *= damping;
        }
        if (n.fy != null) {
          n.y = n.fy;
          n.vy = 0;
        } else {
          n.y += n.vy;
          n.vy *= damping;
        }
      }
    }

    // Compute bounding box to fit viewBox
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x - n.r);
      minY = Math.min(minY, n.y - n.r);
      maxX = Math.max(maxX, n.x + n.r);
      maxY = Math.max(maxY, n.y + n.r);
    }
    const pad = 60;
    const w = Math.max(400, maxX - minX + pad * 2);
    const h = Math.max(300, maxY - minY + pad * 2);
    setViewBox({ x: minX - pad, y: minY - pad, w, h });
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    simRef.current = sim;
    runSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim]);

  // ---- Interaction helpers ----
  const getSvgPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const vb = viewBox;
    const x = vb.x + ((clientX - rect.left) / rect.width) * vb.w;
    const y = vb.y + ((clientY - rect.top) / rect.height) * vb.h;
    return { x, y };
  };

  const onNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    dragRef.current = { id, moved: false };
    const svg = svgRef.current;
    if (svg) svg.style.cursor = "grabbing";
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const dragId = dragRef.current.id;
    if (!dragId) return;
    const p = getSvgPoint(e.clientX, e.clientY);
    const node = simRef.current.nodes.find((n) => n.id === dragId);
    if (node) {
      node.fx = p.x;
      node.fy = p.y;
      dragRef.current.moved = true;
      setSelected(node);
      setTick((t) => t + 1);
    }
  };

  const onMouseUp = () => {
    const dragId = dragRef.current.id;
    if (dragId) {
      const node = simRef.current.nodes.find((n) => n.id === dragId);
      if (node && !dragRef.current.moved) {
        setSelected(node);
      }
      if (node) {
        node.fx = null;
        node.fy = null;
      }
    }
    dragRef.current = { id: null, moved: false };
    if (svgRef.current) svgRef.current.style.cursor = "default";
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox((vb) => {
      const cx = vb.x + vb.w / 2;
      const cy = vb.y + vb.h / 2;
      const nw = vb.w * scale;
      const nh = vb.h * scale;
      return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
    });
  };

  // Pan with background drag
  const panRef = useRef<{ x: number; y: number; vbx: number; vby: number } | null>(null);
  const onBgMouseDown = (e: React.MouseEvent) => {
    if (dragRef.current.id) return;
    panRef.current = { x: e.clientX, y: e.clientY, vbx: viewBox.x, vby: viewBox.y };
  };
  const onBgMouseMove = (e: React.MouseEvent) => {
    if (!panRef.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((e.clientX - panRef.current.x) / rect.width) * viewBox.w;
    const dy = ((e.clientY - panRef.current.y) / rect.height) * viewBox.h;
    setViewBox((vb) => ({ ...vb, x: panRef.current!.vbx - dx, y: panRef.current!.vby - dy }));
  };
  const onBgMouseUp = () => {
    panRef.current = null;
  };

  // Hover adjacency
  const adjacency = useMemo(() => {
    const adj = new Map<string, Set<string>>();
    for (const e of sim.edges) {
      if (!adj.has(e.from)) adj.set(e.from, new Set());
      if (!adj.has(e.to)) adj.set(e.to, new Set());
      adj.get(e.from)!.add(e.to);
      adj.get(e.to)!.add(e.from);
    }
    return adj;
  }, [sim]);

  const isDimmed = (id: string) => {
    if (!hovered) return false;
    if (id === hovered) return false;
    return !(adjacency.get(hovered)?.has(id) ?? false);
  };
  const edgeDimmed = (e: SimEdge) => {
    if (!hovered) return false;
    return !(e.from === hovered || e.to === hovered);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onMouseMove={(e) => {
          onMouseMove(e);
          onBgMouseMove(e);
        }}
        onMouseUp={() => {
          onMouseUp();
          onBgMouseUp();
        }}
        onMouseLeave={() => {
          onMouseUp();
          onBgMouseUp();
        }}
        onWheel={onWheel}
        onMouseDown={onBgMouseDown}
      >
        {/* Edges */}
        {sim.edges.map((e, i) => {
          const a = sim.nodes.find((n) => n.id === e.from);
          const b = sim.nodes.find((n) => n.id === e.to);
          if (!a || !b) return null;
          const dim = edgeDimmed(e);
          return (
            <line
              key={`e-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={RELATION_COLORS[e.relation]}
              strokeWidth={e.relation === "studied_by" ? 1.2 : 1.5}
              strokeOpacity={dim ? 0.06 : 0.5}
              strokeDasharray={e.relation === "related_to" ? "4 3" : undefined}
            />
          );
        })}

        {/* Nodes */}
        {sim.nodes.map((n) => {
          const dim = isDimmed(n.id);
          const isSelected = selected?.id === n.id;
          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              style={{ cursor: "pointer", opacity: dim ? 0.25 : 1 }}
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
              onMouseDown={(e) => onNodeMouseDown(e, n.id)}
            >
              <circle
                r={n.r}
                fill={NODE_COLORS[n.type]}
                stroke={isSelected ? "#1e293b" : "#fff"}
                strokeWidth={isSelected ? 3 : 1.5}
              />
              {(n.type === "topic" || n.type === "claim") && (
                <text
                  y={n.r + 12}
                  textAnchor="middle"
                  className="pointer-events-none"
                  fontSize={n.type === "topic" ? 12 : 10}
                  fill="#334155"
                  fontWeight={n.type === "topic" ? 700 : 500}
                >
                  {n.label.length > 28 ? n.label.slice(0, 26) + "…" : n.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute top-3 left-3 bg-white/90 rounded-lg px-3 py-2 text-xs shadow-sm border border-slate-200">
        <div className="font-semibold text-gray-700 mb-1">Node types</div>
        {(Object.keys(NODE_COLORS) as GraphNodeType[]).map((t) => (
          <div key={t} className="flex items-center gap-1.5 mb-0.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: NODE_COLORS[t] }} />
            <span className="capitalize text-gray-600">{t}</span>
          </div>
        ))}
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-3 left-3 text-xs text-gray-400 bg-white/80 rounded px-2 py-1">
        Scroll = zoom · Drag bg = pan · Drag node = move · Click = details
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="absolute top-3 right-3 w-72 bg-white rounded-lg shadow-lg border border-slate-200 p-4 max-h-[90%] overflow-auto">
          <button
            onClick={() => setSelected(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
          <div className="flex items-center gap-2 mb-2 pr-6">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ background: NODE_COLORS[selected.type] }}
            />
            <span className="text-xs uppercase tracking-wide text-gray-400">{selected.type}</span>
          </div>
          <h3 className="font-bold text-gray-900 text-sm leading-snug mb-2">{selected.label}</h3>

          {selected.type === "claim" && selected.metadata && (
            <div className="space-y-1 text-xs text-gray-600 mb-3">
              {selected.metadata.score != null && (
                <div>Evidence Score: <span className="font-semibold">{String(selected.metadata.score)}</span></div>
              )}
              {selected.metadata.confidence != null && (
                <div>Confidence: <span className="font-semibold capitalize">{String(selected.metadata.confidence)}</span></div>
              )}
              {selected.metadata.rcts != null && (
                <div>Human RCTs: <span className="font-semibold">{String(selected.metadata.rcts)}</span></div>
              )}
            </div>
          )}

          {selected.type === "study" && selected.metadata && (
            <div className="space-y-1 text-xs text-gray-600 mb-3">
              {selected.metadata.journal != null && <div>{String(selected.metadata.journal)}</div>}
              {selected.metadata.year != null && <div>Year: {String(selected.metadata.year)}</div>}
              {selected.metadata.studyType != null && (
                <div className="uppercase font-semibold text-brand-600">{String(selected.metadata.studyType)}</div>
              )}
            </div>
          )}

          <a
            href={selected.url}
            target={selected.url.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="inline-block bg-brand-600 text-white text-xs font-medium px-3 py-1.5 rounded hover:bg-brand-700"
          >
            {selected.url.startsWith("http") ? "Open source ↗" : "Open page →"}
          </a>
        </div>
      )}
    </div>
  );
}
