import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { isWebContainerSupported, preWarmWebContainer } from "@/lib/code-runner/webcontainer";
import Landing from "@/pages/landing";
import Chat from "@/pages/chat";
import VaptDashboard from "@/pages/vapt-dashboard";
import SLMSettings from "@/pages/slm-settings";
import NotFound from "@/pages/not-found";

if (isWebContainerSupported()) {
  preWarmWebContainer().catch(() => {});
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/chat" component={Chat} />
      <Route path="/vapt" component={VaptDashboard} />
      <Route path="/slm" component={SLMSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="codeai-theme">
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Toaster />
            <Router />
          </WouterRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
