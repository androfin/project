import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import type { User } from "@shared/schema";

interface LeaderboardEntry {
  userId: string;
  user: User;
  totalScore: number;
  labsCompleted: number;
  quizzesCompleted: number;
}

export default function Leaderboard() {
  const { data: leaderboard, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-700" />;
    return <Award className="w-5 h-5 text-muted-foreground" />;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
    if (rank === 2) return "bg-gray-400/20 text-gray-700 dark:text-gray-400";
    if (rank === 3) return "bg-amber-700/20 text-amber-800 dark:text-amber-500";
    return "bg-muted text-muted-foreground";
  };

  const getInitials = (user: User) => {
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  return (
    <div className="h-full overflow-auto">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              Leaderboard
            </h1>
          </div>
          <p className="text-muted-foreground">
            Top students ranked by total score across all labs and quizzes
          </p>
        </div>

        {leaderboard && leaderboard.length > 0 ? (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => {
              const rank = index + 1;
              const isTopThree = rank <= 3;

              return (
                <Card
                  key={entry.userId}
                  className={`hover-elevate ${isTopThree ? 'border-primary/30' : ''}`}
                  data-testid={`card-rank-${rank}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-full ${getRankBadge(rank)}`}>
                        {getRankIcon(rank)}
                      </div>

                      <Avatar className="w-12 h-12">
                        <AvatarImage src={entry.user.profileImageUrl || undefined} />
                        <AvatarFallback>{getInitials(entry.user)}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate" data-testid={`text-user-name-${rank}`}>
                            {entry.user.firstName && entry.user.lastName
                              ? `${entry.user.firstName} ${entry.user.lastName}`
                              : entry.user.email}
                          </h3>
                          {isTopThree && (
                            <Badge variant="secondary" className={getRankBadge(rank)}>
                              #{rank}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span data-testid={`text-labs-completed-${rank}`}>
                            {entry.labsCompleted} labs
                          </span>
                          <span>•</span>
                          <span data-testid={`text-quizzes-completed-${rank}`}>
                            {entry.quizzesCompleted} quizzes
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          <span className="text-2xl font-bold" data-testid={`text-total-score-${rank}`}>
                            {entry.totalScore}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">points</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No Rankings Yet</CardTitle>
              <CardDescription>
                Complete labs and quizzes to appear on the leaderboard!
              </CardDescription>
            </CardHeader>
            <CardContent className="py-12 text-center">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Be the first to complete a session and claim the top spot!
              </p>
            </CardContent>
          </Card>
        )}

        {leaderboard && leaderboard.length > 0 && leaderboard.length < 10 && (
          <Card className="mt-6 bg-muted/30">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Showing top {leaderboard.length} student{leaderboard.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
