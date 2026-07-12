// EvidenceHub — Demo CTA Page (for video ending shot)

import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "EvidenceHub Sleep — Sleep Evidence, Scored.",
  description: "466+ sleep evidence claims with scientific confidence scores. Human-readable. AI-ready.",
};

export default function DemoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-brand-900 to-slate-800 text-white">
      <div className="max-w-4xl mx-auto px-6 text-center">

        {/* Logo / Brand */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo.jpg"
            alt="EvidenceHub Sleep"
            width={80}
            height={80}
            className="rounded-2xl shadow-2xl object-cover border border-brand-400/30"
            priority
          />
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Sleep Evidence,
          <br />
          <span className="bg-gradient-to-r from-brand-400 to-cyan-400 bg-clip-text text-transparent">
            Scored.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto mb-10">
          466+ claims. Every one backed by RCTs, meta-analyses, and mechanism — with a transparent confidence score.
        </p>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-8 mb-12">
          <div>
            <div className="text-4xl font-bold text-brand-400">466+</div>
            <div className="text-sm text-gray-400 uppercase tracking-wider">Claims</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-brand-400">15+</div>
            <div className="text-sm text-gray-400 uppercase tracking-wider">Studies</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-brand-400">8</div>
            <div className="text-sm text-gray-400 uppercase tracking-wider">Topics</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-brand-400">3</div>
            <div className="text-sm text-gray-400 uppercase tracking-wider">API Endpoints</div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap gap-4 justify-center mb-12">
          <Link
            href="/"
            className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
          >
            Explore Evidence &rarr;
          </Link>
          <Link
            href="/api-docs"
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
          >
            API for AI
          </Link>
        </div>

        {/* Footer tagline */}
        <p className="text-sm text-gray-500">
          Not a content website. An evidence engine.
        </p>

      </div>
    </div>
  );
}
