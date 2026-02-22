"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Globe, Layout, Sparkles, BookOpen, PanelsTopLeft, MousePointerSquareDashed, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Squares from "@/components/react-bits/Squares";

export default function Home() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  const handleTranslate = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) {
      let targetUrl = url;
      if (!targetUrl.startsWith("http")) {
        targetUrl = "https://" + targetUrl;
      }
      router.push(`/read/${encodeURIComponent(targetUrl)}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-foreground relative overflow-x-hidden bg-[#0A0A0A]">

      {/* Animated Background Mesh & Grid (React Bits) */}
      <div className="absolute inset-0 z-0">
        <Squares
          speed={0.5}
          squareSize={40}
          direction="diagonal"
          borderColor="rgba(255,255,255,0.03)"
          hoverFillColor="rgba(255,255,255,0.06)"
        />
        <div className="absolute top-0 left-0 right-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
      </div>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 flex flex-col items-center justify-center text-center z-10 space-y-16 py-20 pb-24">
        {/* Hero Section */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold uppercase tracking-widest text-primary mb-8 shadow-[0_0_20px_rgba(var(--primary),0.2)]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Developer Tools for Global Apps</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-white drop-shadow-2xl">
            The IDE for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-primary to-purple-500 blur-0">
              i18n.
            </span>
          </h1>
          <p className="mt-8 text-lg md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light">
            Instantly translate, inspect, and extract UI components in any language without leaving the browser.
          </p>
        </div>

        {/* Input Section */}
        <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
          <form onSubmit={handleTranslate} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-primary to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
            <div className="relative flex items-center bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl p-2 shadow-2xl border border-white/10">
              <div className="pl-5 text-muted-foreground group-focus-within:text-primary transition-colors">
                <Globe className="w-6 h-6" />
              </div>
              <input
                type="text"
                placeholder="Paste any URL (e.g. paulgraham.com)"
                className="flex-1 bg-transparent border-none px-5 py-5 text-lg focus:outline-none placeholder:text-muted-foreground/50 text-white"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
              />
              <Button
                size="lg"
                type="submit"
                disabled={!url}
                className="rounded-xl px-10 h-14 font-semibold text-base shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:hover:scale-100"
              >
                Translate <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </form>

          {/* Features Grid */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-2xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 shadow-xl">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 ring-1 ring-cyan-500/30">
                <PanelsTopLeft className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-white/90 mb-1 text-base">Matrix View</h3>
                <p className="text-muted-foreground leading-relaxed text-xs">Test 4 languages on your UI simultaneously.</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-2xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 shadow-xl">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400 ring-1 ring-purple-500/30">
                <MousePointerSquareDashed className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-white/90 mb-1 text-base">Area Translate</h3>
                <p className="text-muted-foreground leading-relaxed text-xs">Drag a marquee over specific components.</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-2xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 shadow-xl">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 ring-1 ring-amber-500/30">
                <Layout className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-white/90 mb-1 text-base">Layout Inspector</h3>
                <p className="text-muted-foreground leading-relaxed text-xs">Auto-detect broken CSS overflow & wrapping.</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-2xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 shadow-xl">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-400 ring-1 ring-green-500/30">
                <Download className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-white/90 mb-1 text-base">Locale Exporter</h3>
                <p className="text-muted-foreground leading-relaxed text-xs">Extract fixed translations directly to JSON.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="absolute bottom-6 w-full text-center text-sm font-medium text-muted-foreground/40">
        <p>&copy; {new Date().getFullYear()} LingoLens. Preserving the web's beauty.</p>
      </footer>
    </div>
  );
}
