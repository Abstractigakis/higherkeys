import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      {/* Hero Section */}
      <section className="container mx-auto flex flex-col items-center justify-center space-y-6 py-12 text-center md:py-24 px-4">
        <Logo className="size-16 md:size-24 text-primary" />
        <Badge variant="secondary" className="px-4 py-1">
          Introducing Higher Keys
        </Badge>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          Organize with <span className="text-primary">Higher Keys</span>
        </h1>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto py-8 px-4">
        <div className="rounded-3xl bg-muted/50 py-10 px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm md:text-base">
            Join Higher Keys today and start organizing your thoughts with
            hierarchical labels.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Button size="lg" asChild>
                <Link
                  href={
                    user.email_confirmed_at ? "/dashboard" : "/verify-email"
                  }
                >
                  {user.email_confirmed_at ? "Go to Dashboard" : "Verify Email"}
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="ml-2 size-4"
                  />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild>
                  <Link href="/signup">Create Account</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
