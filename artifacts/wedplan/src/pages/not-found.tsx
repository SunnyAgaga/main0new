import { Link } from "wouter";
import { HeartCrack } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-md animate-in zoom-in-95 duration-500">
        <HeartCrack className="h-16 w-16 text-muted-foreground mx-auto mb-6 opacity-30" />
        <h1 className="text-4xl font-serif text-primary mb-4">Page Not Found</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          We couldn't find the page you're looking for. It might have been moved or the link is incorrect.
        </p>
        <Link href="/">
          <Button size="lg" className="w-full sm:w-auto h-12 text-base px-8">
            Return to Homepage
          </Button>
        </Link>
      </div>
    </div>
  );
}