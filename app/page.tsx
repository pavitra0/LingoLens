"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Globe, Layout, Sparkles, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <div className="min-h-screen flex flex-col items-center justify-center text-foreground relative overflow-hidden bg-background bg-[url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center before:absolute before:inset-0 before:bg-background/80 dark:before:bg-background/80">

      {/* Header */}
      <header className="absolute top-0 w-full p-6 flex justify-end z-20">
        <Button variant="outline" className="bg-background/50 backdrop-blur-md hover:bg-background/80 shadow-sm border-white/20" onClick={() => router.push('/vocabulary')}>
          <BookOpen className="w-4 h-4 mr-2 text-primary" />
          Vocabulary
        </Button>
      </header>

      <main className="w-full max-w-5xl px-6 flex flex-col items-center text-center z-10 space-y-12 mt-12">
        {/* Hero Section */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 backdrop-blur-md border border-border/50 text-xs font-medium text-secondary-foreground mb-8 shadow-sm ring-1 ring-white/20">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>AI-Powered Website Translation</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground text-balance drop-shadow-sm">
            The Web, in <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-purple-600">
              Your Language.
            </span>
          </h1>
          <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            LingoLens actively preserves the original design and layout of any website while instantly translating the content.
          </p>
        </div>

        {/* Input Section */}
        <div className="w-full max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          <form onSubmit={handleTranslate} className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
            <div className="relative flex items-center bg-background/80 backdrop-blur-xl rounded-xl p-2 shadow-2xl border border-white/10">
              <div className="pl-4 text-muted-foreground">
                <Globe className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Paste any URL (e.g. paulgraham.com)"
                className="flex-1 bg-transparent border-none px-4 py-4 text-base focus:outline-none placeholder:text-muted-foreground/70 text-foreground"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
              />
              <Button
                size="lg"
                type="submit"
                disabled={!url}
                className="rounded-lg px-8 h-12 font-medium shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Translate
              </Button>
            </div>
          </form>

          {/* Features Grid */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Layout className="w-5 h-5" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-foreground mb-1">Layout Preserved</h3>
                <p className="text-muted-foreground">No broken styles or overlapping text.</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Globe className="w-5 h-5" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-foreground mb-1">Global Context</h3>
                <p className="text-muted-foreground">Translate entire pages instantly.</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-foreground mb-1">Smart AI</h3>
                <p className="text-muted-foreground">Detects content, ignores code.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="absolute bottom-6 w-full text-center text-sm text-muted-foreground/60">
        <p>&copy; {new Date().getFullYear()} LingoLens. Preserving the web's beauty.</p>
      </footer>
    </div>
  );
}
