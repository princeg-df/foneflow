import Dashboard from "@/components/dashboard";
import { Smartphone } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Smartphone className="h-6 w-6 mr-2 text-primary"/>
          <h1 className="text-2xl font-bold font-headline text-primary">
            FoneFlow
          </h1>
        </div>
      </header>
      <main className="container py-8">
        <Dashboard />
      </main>
      <footer className="container py-4 text-center text-sm text-muted-foreground">
        <p>Built for mobile resellers. FoneFlow 2024.</p>
      </footer>
    </div>
  );
}
