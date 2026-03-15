import { Link } from "wouter";
import { Code2, Zap, Shield, Globe, Terminal, Sparkles, ChevronRight, MessageSquare, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: Code2,
    title: "Full-Stack Generation",
    description: "Generate complete React + Vite projects with 15-20 files. Frontend, backend, and configuration - all production-ready.",
  },
  {
    icon: Zap,
    title: "Live Preview",
    description: "See your generated app running instantly in the browser. Edit code and watch changes in real-time.",
  },
  {
    icon: Shield,
    title: "Security Analysis",
    description: "Built-in VAPT dashboard scans your code for vulnerabilities. Get security scores and fix suggestions automatically.",
  },
  {
    icon: Globe,
    title: "Deploy Anywhere",
    description: "Download as ZIP or push directly to GitHub. Your generated projects are ready for production deployment.",
  },
  {
    icon: MessageSquare,
    title: "AI Chat Interface",
    description: "Describe your app in plain English. The AI reasons through your requirements and generates domain-specific code.",
  },
  {
    icon: Wrench,
    title: "Built-in IDE & Debugger",
    description: "Full VSCode-style editor with syntax highlighting, auto-fix engine, and integrated terminal.",
  },
];

const codeExample = `> "Build a task management app with
   drag-and-drop, user auth, and dark mode"

// AutoCoder generates 15-20 files:
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
                Start Coding
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
                  AI-Powered Full-Stack Generator
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold leading-tight" data-testid="text-hero-title">
                  Describe Your App, <span className="text-primary">Get Production Code</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-lg" data-testid="text-hero-subtitle">
                  Transform natural language into complete, multi-file React + Vite applications. Live preview, built-in IDE, security scanning, and one-click deployment.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href="/chat">
                    <Button size="lg" className="gap-2" data-testid="button-start-coding-hero">
                      <Terminal className="h-4 w-4" />
                      Start Coding Now
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-2" data-testid="text-no-setup">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    15-20 files per project
                  </div>
                  <div className="flex items-center gap-2" data-testid="text-no-api">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Browser-based preview
                  </div>
                  <div className="flex items-center gap-2" data-testid="text-instant">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    One-click deploy
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
              <h2 className="text-3xl font-bold mb-4" data-testid="text-features-title">Everything You Need to Ship</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-features-subtitle">
                From idea to deployable app. AutoCoder handles the entire development pipeline.
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
                Start coding with AI in seconds.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center" data-testid="step-1">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-lg font-bold flex items-center justify-center mx-auto mb-4">
                  1
                </div>
                <h3 className="font-semibold mb-2">Describe Your App</h3>
                <p className="text-sm text-muted-foreground">
                  Tell AutoCoder what you want to build in plain English.
                </p>
              </div>
              <div className="text-center" data-testid="step-2">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-lg font-bold flex items-center justify-center mx-auto mb-4">
                  2
                </div>
                <h3 className="font-semibold mb-2">AI Generates Your Project</h3>
                <p className="text-sm text-muted-foreground">
                  Watch as AutoCoder creates a complete multi-file application with live preview.
                </p>
              </div>
              <div className="text-center" data-testid="step-3">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-lg font-bold flex items-center justify-center mx-auto mb-4">
                  3
                </div>
                <h3 className="font-semibold mb-2">Edit, Test & Deploy</h3>
                <p className="text-sm text-muted-foreground">
                  Use the built-in IDE to refine your code, then download or push to GitHub.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-primary/5" data-testid="section-cta">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4" data-testid="text-cta-title">Ready to Build?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto" data-testid="text-cta-subtitle">
              Describe your next project and get a complete, deployable application in minutes.
            </p>
            <Link href="/chat">
              <Button size="lg" className="gap-2" data-testid="button-start-coding-cta">
                <Terminal className="h-4 w-4" />
                Start Coding Now
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
              AI-powered full-stack code generation platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}