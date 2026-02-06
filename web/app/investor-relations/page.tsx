import Link from "next/link";
import { Tag, Palette, Globe, Zap, Lock, Eye, ArrowLeft } from "lucide-react";

export default function InvestorRelationsPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-200 selection:bg-zinc-800 selection:text-white">
      <div className="max-w-4xl mx-auto py-20 px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center text-zinc-500 hover:text-zinc-300 transition-colors mb-12 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        <header className="mb-20">
          <h1 className="text-5xl font-bold tracking-tight text-white mb-6">
            Investor Relations & Philosophy
          </h1>
          <p className="text-zinc-500 text-lg">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </header>

        <section className="mb-24">
          <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-4">
              Mission Statement
            </h2>
            <p className="text-2xl md:text-3xl font-medium text-white leading-tight italic">
              "To enable all individuals to enjoy effortless hierarchical
              labeling anywhere on Earth while emitting abstract artwork,
              bounded by space and time with defined utilities, creating their
              own encrypted life stories, and accessing the eighth level of
              consciousness."
            </p>
          </div>
        </section>

        <div className="grid gap-16">
          <section className="group">
            <div className="flex items-start gap-6">
              <div className="mt-1 p-3 rounded-xl bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                <Tag className="w-6 h-6 text-zinc-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  1. Effortless Hierarchical Labeling
                </h2>
                <div className="max-w-none text-zinc-400 leading-relaxed space-y-4">
                  <p>
                    Hierarchical labeling is the process of assigning structured
                    tags to content, functioning much like a folder system
                    (e.g.,{" "}
                    <code className="text-zinc-300 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                      #work/project/task
                    </code>
                    ). We call these <strong>Higher Keys</strong>.
                  </p>
                  <p>
                    Unlike traditional hashtags, Higher Keys allow you to
                    organize information on the fly without needing to pre-plan
                    complex structures. You can elegantly place the same piece
                    of content into multiple "folders" simultaneously—a concept
                    inspired by the hierarchical namespaces in tools like
                    Obsidian and Google Storage.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="group">
            <div className="flex items-start gap-6">
              <div className="mt-1 p-3 rounded-xl bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                <Palette className="w-6 h-6 text-zinc-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  2. Emitting Abstract Artwork
                </h2>
                <div className="max-w-none text-zinc-400 leading-relaxed space-y-4">
                  <p>
                    We believe a picture is worth a thousand words. Higher Keys
                    utilizes visual imagery as a mnemonic technique, associating
                    complex concepts with unique thumbnails.
                  </p>
                  <p>
                    When you save content, we help you quickly generate imagery
                    that serves as a beautiful reference. By viewing these at a
                    frequency of your choosing, you can combat the "forgetting
                    curve," increasing the rate of memory retrieval and encoding
                    through an aesthetic, externalized process.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="group">
            <div className="flex items-start gap-6">
              <div className="mt-1 p-3 rounded-xl bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                <Globe className="w-6 h-6 text-zinc-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  3. Bounded by Space and Time
                </h2>
                <div className="max-w-none text-zinc-400 leading-relaxed space-y-4">
                  <p>
                    Higher Keys empowers you to save content anywhere in the
                    world. We provide the option to capture the specific context
                    of that moment—including GPS coordinates, timestamps, and
                    environmental snapshots.
                  </p>
                  <p>
                    This recreation of state supports{" "}
                    <strong>state-dependent learning</strong>, helping you
                    recall the specific feelings and details present when the
                    information was first captured, making the memory more vivid
                    and accessible.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="group">
            <div className="flex items-start gap-6">
              <div className="mt-1 p-3 rounded-xl bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                <Zap className="w-6 h-6 text-zinc-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  4. Defined Utilities
                </h2>
                <div className="max-w-none text-zinc-400 leading-relaxed space-y-4">
                  <p>
                    The goal of storing and transforming memories into artwork
                    is to organize them for a specific purpose.
                  </p>
                  <p>
                    For example, a rock climber might create a visual canvas of
                    tips and tricks to tackle a difficult route, or an investor
                    might build a vision board to rapidly test new ideas against
                    historical data. Higher Keys provides the utility to
                    externalize and compress memory for actionable, real-world
                    results.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="group">
            <div className="flex items-start gap-6">
              <div className="mt-1 p-3 rounded-xl bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                <Lock className="w-6 h-6 text-zinc-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  5. Creating Encrypted Life Stories
                </h2>
                <div className="max-w-none text-zinc-400 leading-relaxed space-y-4">
                  <p>
                    In our philosophy, "encryption" refers to the deeply
                    personal and subjective nature of your vision boards.
                  </p>
                  <p>
                    The images, thoughts, and emotions decoded by your brain are
                    unique to your psyche. A canvas that makes perfect sense to
                    you remains "encrypted" to others, as they lack the internal
                    context required to decode your personal life story. Your
                    data is your story, told in a language only you truly speak.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="group">
            <div className="flex items-start gap-6">
              <div className="mt-1 p-3 rounded-xl bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                <Eye className="w-6 h-6 text-zinc-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  6. Accessing the Eighth Level of Consciousness
                </h2>
                <div className="max-w-none text-zinc-400 leading-relaxed space-y-4">
                  <p>
                    Inspired by Ken Wilber’s map of consciousness, Level Eight
                    represents an awareness of multiple perspectives and the
                    evolution of one's own viewpoint over time.
                  </p>
                  <p>
                    By constantly logging, sorting, and defining information for
                    utility, you actively engage with your own belief structures
                    and personality. This process encourages your perspectives
                    to evolve, moving you toward a higher state of awareness and
                    personal utility.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-32 pt-12 border-t border-zinc-800 text-center">
          <p className="text-zinc-500 mb-8">
            Our goal is to empower every human to store, decorate, and analyze
            their favorite information, condensing it into visual formats that
            are quick to review and impossible to forget.
          </p>
          <div className="flex flex-col items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-zinc-200 transition-colors"
            >
              Get Started
            </Link>
            <p className="text-sm text-zinc-600">
              For investor inquiries:{" "}
              <a
                href="mailto:investors@higherkeys.com"
                className="text-zinc-400 hover:text-white transition-colors"
              >
                investors@higherkeys.com
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
