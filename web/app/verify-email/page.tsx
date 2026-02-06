import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/logo";
import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between py-3 px-4">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Logo className="size-8 text-primary" />
            <span className="font-bold text-xl">Higher Keys</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-col items-center space-y-2 text-center">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6 text-primary"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold">
              Verify your email
            </CardTitle>
            <CardDescription>
              We&apos;ve sent a verification link to your email address. Please
              click the link to verify your account and access the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button asChild className="w-full">
              <Link href="/">Return to Home</Link>
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Didn&apos;t receive the email? Check your spam folder or try
              signing in again to resend.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
