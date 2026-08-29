import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4 shadow-xl border-none">
        <CardContent className="pt-6 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold font-serif text-foreground">Page Not Found</h1>
          <p className="text-sm text-muted-foreground">
            The page you are looking for does not exist.
          </p>
          <div className="pt-4">
            <Link href="/" className="text-primary hover:underline text-sm font-medium">
              Return to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}