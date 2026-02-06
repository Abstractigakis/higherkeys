import {
  ManifestoHeading,
  ManifestoSection,
  ManifestoText,
} from "@/components/manifesto/manifesto-section";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";

export default function ManifestoPage() {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] mix-blend-screen opacity-30" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-[100px] mix-blend-screen opacity-20" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-24 md:py-32 flex flex-col gap-32 md:gap-48">
        {/* Intro */}
        <section className="min-h-[60vh] flex flex-col justify-center">
          <ManifestoSection>
            <Link href="/" className="mb-12 block w-fit">
              <Logo className="h-16 w-auto text-primary" />
            </Link>
            <ManifestoHeading className="bg-gradient-to-r from-foreground via-foreground to-foreground/50 bg-clip-text text-transparent">
              Knowledge from Knowledge.
            </ManifestoHeading>
            <ManifestoText className="max-w-xl">
              A cathedral for thought in the age of infinite noise.
              <br />
              Extract, Abstarct, Internalize.
            </ManifestoText>
          </ManifestoSection>
        </section>

        {/* The Problem */}
        <section>
          <ManifestoSection>
            <span className="text-secondary font-mono text-sm tracking-widest uppercase mb-4 block">
              01 — The Flood
            </span>
            <ManifestoHeading className="text-muted-foreground/20">
              Drowning
            </ManifestoHeading>
            <div className="grid md:grid-cols-2 gap-12">
              <ManifestoText>
                We consume more information in a day than our ancestors did in a
                lifetime. Yet, we retain less.
              </ManifestoText>
              <ManifestoText highlight>
                The stream washes over us, leaving no trace. We are becoming
                pass-through entities for data, not architects of wisdom.
              </ManifestoText>
            </div>
          </ManifestoSection>
        </section>

        {/* The Solution: Abstraction */}
        <section>
          <ManifestoSection>
            <span className="text-secondary font-mono text-sm tracking-widest uppercase mb-4 block">
              02 — The Spark
            </span>
            <ManifestoHeading className="text-primary/90 glow-text">
              Abstract
            </ManifestoHeading>
            <div className="grid md:grid-cols-2 gap-12">
              <ManifestoText>
                To learn is to destroy. To cut away the noise and reveal the
                structure underneath.
              </ManifestoText>
              <div>
                <ManifestoText highlight className="mb-6">
                  Higher Keys allows you to carve signals from the noise. To
                  create "Highlights" that are not just bookmarks, but bricks.
                </ManifestoText>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <div className="flex items-center gap-3 text-primary font-mono text-sm">
                    <Sparkles className="size-4" />
                    <span>Highlight created</span>
                  </div>
                </div>
              </div>
            </div>
          </ManifestoSection>
        </section>

        {/* The Goal: Internalization */}
        <section>
          <ManifestoSection>
            <span className="text-secondary font-mono text-sm tracking-widest uppercase mb-4 block">
              03 — The Structure
            </span>
            <ManifestoHeading>Internalize</ManifestoHeading>
            <ManifestoText className="max-w-2xl mb-12">
              Connect your abstractions. Build a hierarchy of meaning. Turn
              fleeting content into your own personal library of higher forms.
            </ManifestoText>

            <div className="relative aspect-[16/9] rounded-3xl overflow-hidden bg-gradient-to-br from-card to-card/50 border border-white/5 p-8 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-black text-white/5 select-none font-mono">
                  HIERARCHY
                </div>
              </div>
            </div>
          </ManifestoSection>
        </section>

        {/* Call to Action */}
        <section className="min-h-[40vh] flex flex-col justify-center items-center text-center">
          <ManifestoSection delay={200}>
            <ManifestoHeading className="text-4xl md:text-5xl mb-6">
              Build your mind.
            </ManifestoHeading>
            <Link
              href="/?sourceId=demo"
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground text-lg font-bold uppercase tracking-widest rounded-full hover:bg-primary/90 hover:scale-105 transition-all duration-300 shadow-[0_0_40px_-10px_var(--primary)] text-center"
            >
              Enter the Void
              <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </ManifestoSection>
        </section>

        <footer className="text-center text-white/20 text-sm font-mono pb-12">
          <p>HKS — HIGHER KEYS SYSTEM v0.1</p>
        </footer>
      </div>
    </main>
  );
}
