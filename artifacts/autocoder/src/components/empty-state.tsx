import { Sparkles, Terminal, Code2, ShoppingCart, CalendarDays, CookingPot, ListTodo, BookOpen } from "lucide-react";

const suggestions = [
  { text: "Build me a personal portfolio website", icon: Code2, hint: "Show off your work beautifully" },
  { text: "Create an online store for my products", icon: ShoppingCart, hint: "Sell things online with ease" },
  { text: "Make a booking system for appointments", icon: CalendarDays, hint: "Let people schedule meetings" },
  { text: "Build a recipe collection app", icon: CookingPot, hint: "Save and organize recipes" },
  { text: "Create a task manager to stay organized", icon: ListTodo, hint: "Track your to-dos" },
  { text: "Design a blog where I can share stories", icon: BookOpen, hint: "Write and publish articles" },
];

interface EmptyStateProps {
  onSuggestionClick: (suggestion: string) => void;
}

export function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full p-8 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.03)_0%,_transparent_70%)] pointer-events-none" />

      <div className="max-w-lg w-full text-center space-y-8 relative z-10">
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <Terminal className="h-8 w-8 text-primary" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            What would you like to build?
          </h1>

          <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
            Describe your app in plain English. AutoCoder will generate the full project for you.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Try one of these ideas</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick(suggestion.text)}
                className="px-4 py-3.5 text-left rounded-xl border border-border/60 bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-sm transition-all duration-200 group"
                data-testid={`button-suggestion-${index}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/12 transition-colors">
                    <suggestion.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium group-hover:text-primary transition-colors leading-snug">{suggestion.text}</div>
                    <div className="text-xs text-muted-foreground mt-1">{suggestion.hint}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}