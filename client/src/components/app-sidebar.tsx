import { Shield, Presentation, HelpCircle, Code, Trophy, User, LayoutDashboard, Award } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import type { QuizAttempt, LabProgress } from "@shared/schema";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isAdmin, isAuthenticated } = useAuth();

  const { data: labProgress = [] } = useQuery<LabProgress[]>({
    queryKey: ["/api/progress/labs"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: quizAttempts = [] } = useQuery<QuizAttempt[]>({
    queryKey: ["/api/progress/quizzes"],
    enabled: isAuthenticated,
    retry: false,
  });

  const navigationItems = [
    {
      title: "Leaderboard",
      url: "/leaderboard",
      icon: Trophy,
    },
    {
      title: "Profile",
      url: "/profile",
      icon: User,
    },
  ];

  if (isAdmin) {
    navigationItems.push({
      title: "Admin",
      url: "/admin",
      icon: LayoutDashboard,
    });
  }

  const completedLabs = labProgress.filter(p => p.completed).length;
  const totalQuizzes = quizAttempts.length;
  const totalScore = labProgress
    .filter(p => p.completed)
    .reduce((sum, p) => sum + (p.score || 0), 0);

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-md">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">SecureCode Lab</span>
              <span className="text-xs text-muted-foreground">Secure Coding Training</span>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Learning Environment</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/presentations" || location === "/" || location.startsWith("/presentations/")}
                  data-testid="link-presentations"
                >
                  <Link href="/presentations">
                    <Presentation className="w-4 h-4" />
                    <span>Presentations</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/quizzes" || location.startsWith("/quizzes/")}
                  data-testid="link-quizzes"
                >
                  <Link href="/quizzes">
                    <HelpCircle className="w-4 h-4" />
                    <span>Quizzes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/labs" || location.startsWith("/labs/")}
                  data-testid="link-labs"
                >
                  <Link href="/labs">
                    <Code className="w-4 h-4" />
                    <span>Labs</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url || location.startsWith(item.url + "/")}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {item.title === "Admin" && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Admin
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && (
          <SidebarGroup>
            <SidebarGroupLabel>Quick Stats</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-3 py-2 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Labs Completed</span>
                  <Badge variant="secondary">{completedLabs}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quiz Attempts</span>
                  <Badge variant="secondary">{totalQuizzes}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Score</span>
                  <Badge variant="default" className="flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    {totalScore}
                  </Badge>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Course Progress</span>
            <span className="font-medium">{completedLabs} / 6 sessions</span>
          </div>
          <Progress value={(completedLabs / 6) * 100} className="h-1.5" data-testid="progress-overall" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
