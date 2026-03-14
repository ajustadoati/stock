import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { AppSidebar } from "@/components/app-sidebar";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import Categories from "@/pages/categories";
import Movements from "@/pages/movements";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/categories" component={Categories} />
      <Route path="/movements" component={Movements} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full bg-background overflow-hidden">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="flex h-[60px] items-center px-4 border-b border-sidebar-border/30 bg-card/50 backdrop-blur-sm md:hidden">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <span className="font-display font-bold text-lg ml-4">AlmacénPro</span>
                </header>
                <main className="flex-1 overflow-auto bg-background/50">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
