import { Link } from "wouter";
import { Code2, Zap, Shield, Globe, Terminal, Sparkles, ChevronRight, MessageSquare, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: Code2,
    title: "Complete Working App",
    description: "Get a fully functional app — pages, server, and database — ready to use. No assembly required.",
  },
  {
    icon: Zap,
    title: "See It Running Instantly",
    description: "Your app starts working right away in the browser. Make changes and see them update in real time.",
  },
  {
    icon: Shield,
    title: "Built-In Security Checks",
    description: "Your app is automatically scanned for security issues. Get a safety score and suggestions to fix problems.",
  },
  {
    icon: Globe,
    title: "Take It Anywhere",
    description: "Download your project or push it to GitHub. It's your code — deploy it wherever you like.",
  },
  {
    icon: MessageSquare,
    title: "Just Describe What You Want",
    description: "Tell AutoCoder your idea in everyday language. It figures out the details and builds your app.",
  },
  {
    icon: Wrench,
    title: "Edit and Fine-Tune",
    description: "Use the built-in code editor to tweak anything. Syntax highlighting, auto-fix, and a terminal are all included.",
  },
];

const codeExample = `> "Build a task management app with
   drag-and-drop, user auth, and dark mode"

// AutoCoder generates your entire project:
src/
  App.tsx          // Main app with routing
  components/
    TaskBoard.tsx  // Drag & drop board
    AuthForm.tsx   // Login / register
    ThemeToggle.tsx // Dark mode switch
  hooks/
    useTasks.ts    // Task CRUD logic
  api/
    server.ts      // Express backend
    db.ts          // Database setup
  styles/
    globals.css    // Tailwind config`;

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2" data-testid="logo-header">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Terminal className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">AutoCoder</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/chat">
              <Button data-testid="button-start-coding-header">
                Start Building
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden py-20 lg:py-32" data-testid="section-hero">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="container mx-auto px-4 relative">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium" data-testid="badge-free">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI-Powered App Builder
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold leading-tight" data-testid="text-hero-title">
                  Describe Your Idea, <span className="text-primary">Get a Working App</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-lg" data-testid="text-hero-subtitle">
                  Go from an idea to a fully working app in minutes. Just describe what you need — AutoCoder handles the rest. No coding experience required.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href="/chat">
                    <Button size="lg" className="gap-2" data-testid="button-start-coding-hero">
                      <Terminal className="h-4 w-4" />
                      Start Building
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-2" data-testid="text-no-setup">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Ready in minutes
                  </div>
                  <div className="flex items-center gap-2" data-testid="text-no-api">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Preview in your browser
                  </div>
                  <div className="flex items-center gap-2" data-testid="text-instant">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Download or deploy
                  </div>
                </div>
              </div>
              <div className="relative" data-testid="code-preview">
                <Card className="p-0 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-card-border bg-muted/30">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono ml-2">AutoCoder</span>
                  </div>
                  <pre className="p-4 overflow-x-auto text-sm">
                    <code className="font-mono">{codeExample}</code>
                  </pre>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30" data-testid="section-features">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4" data-testid="text-features-title">Everything You Need</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-features-subtitle">
                From idea to working app — AutoCoder takes care of the hard parts so you can focus on what matters.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={feature.title} className="p-6" data-testid={`card-feature-${index}`}>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20" data-testid="section-how-it-works">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4" data-testid="text-how-it-works-title">How It Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Three simple steps to your new app.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center" data-testid="step-1">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-lg font-bold flex items-center justify-center mx-auto mb-4">
                  1
                </div>
                <h3 className="font-semibold mb-2">Tell Us Your Idea</h3>
                <p className="text-sm text-muted-foreground">
                  Describe what you want to build in your own words — no technical knowledge needed.
                </p>
              </div>
              <div className="text-center" data-testid="step-2">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-lg font-bold flex items-center justify-center mx-auto mb-4">
                  2
                </div>
                <h3 className="font-semibold mb-2">Watch It Come to Life</h3>
                <p className="text-sm text-muted-foreground">
                  AutoCoder builds your entire app — you can see it working right in your browser.
                </p>
              </div>
              <div className="text-center" data-testid="step-3">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-lg font-bold flex items-center justify-center mx-auto mb-4">
                  3
                </div>
                <h3 className="font-semibold mb-2">Make It Yours</h3>
                <p className="text-sm text-muted-foreground">
                  Fine-tune anything you like, then download your project or deploy it online.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-primary/5" data-testid="section-cta">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4" data-testid="text-cta-title">Ready to Build Something?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto" data-testid="text-cta-subtitle">
              Describe your next idea and have a working app in minutes. It's that simple.
            </p>
            <Link href="/chat">
              <Button size="lg" className="gap-2" data-testid="button-start-coding-cta">
                <Terminal className="h-4 w-4" />
                Start Building
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8" data-testid="footer">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2" data-testid="logo-footer">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Terminal className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="font-medium">AutoCoder</span>
            </div>
            <p className="text-sm text-muted-foreground" data-testid="text-footer">
              Turn your ideas into working apps with AI.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
