import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Code, Award, BookOpen } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold" data-testid="text-app-title">SecureCode Lab</h1>
          </div>
          <Button asChild data-testid="button-login">
            <a href="/login">Sign In</a>
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">
              Master Secure Coding for Web Applications
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A comprehensive 6-session training course designed for senior developers
              to build security-first web applications and APIs.
            </p>
            <div className="pt-4">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/login">Get Started</a>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  <CardTitle>Hands-On Labs</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Practice secure coding techniques with real-world scenarios.
                  Configure security headers, implement authentication, and fix vulnerabilities.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <CardTitle>Comprehensive Curriculum</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  6 in-depth sessions covering OWASP Top 10, HTTP security, authentication,
                  authorization, and deployment best practices.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle>Quiz Challenges</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Test your knowledge with interactive quizzes featuring hints and
                  detailed explanations for each question.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  <CardTitle>Track Progress</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Monitor your learning journey, compete on the leaderboard,
                  and earn recognition for your security expertise.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-center">Course Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-primary min-w-[140px]">Session 1:</span>
                  <span>Security Mindset, Web Architecture & HTTP Foundations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-primary min-w-[140px]">Session 2:</span>
                  <span>Input Validation, Output Encoding, and XSS Prevention</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-primary min-w-[140px]">Session 3:</span>
                  <span>Authentication Patterns and Best Practices</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-primary min-w-[140px]">Session 4:</span>
                  <span>Authorization, Access Control, and Session Management</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-primary min-w-[140px]">Session 5:</span>
                  <span>CSRF, Clickjacking, and Advanced Security Headers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-primary min-w-[140px]">Session 6:</span>
                  <span>Deployment Security and Production Hardening</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border bg-muted/30">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Secure Coding Training for Senior Developers</p>
        </div>
      </footer>
    </div>
  );
}
