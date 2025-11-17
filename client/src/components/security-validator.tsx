import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ValidationResult {
  header: string;
  description: string;
  status: "pass" | "fail" | "warning";
  required: boolean;
  actualValue?: string;
  expectedPattern?: string;
  details?: string;
}

interface SecurityValidatorProps {
  results: ValidationResult[];
  curlCommand?: string;
}

export function SecurityValidator({ results, curlCommand }: SecurityValidatorProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const safeResults = results || [];
  const passedCount = safeResults.filter(r => r.status === "pass").length;
  const failedCount = safeResults.filter(r => r.status === "fail").length;
  const warningCount = safeResults.filter(r => r.status === "warning").length;

  const toggleExpanded = (header: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(header)) {
      newExpanded.delete(header);
    } else {
      newExpanded.add(header);
    }
    setExpandedItems(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="w-5 h-5 text-chart-2" />;
      case "fail":
        return <XCircle className="w-5 h-5 text-destructive" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-chart-4" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pass":
        return <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20 border text-xs">Passed</Badge>;
      case "fail":
        return <Badge variant="destructive" className="text-xs">Failed</Badge>;
      case "warning":
        return <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20 border text-xs">Warning</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="gap-4 flex-row items-center justify-between flex-wrap pb-3">
        <div>
          <CardTitle className="text-base">Security Header Validation</CardTitle>
          <CardDescription className="text-xs">Real-time analysis of your configuration</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {passedCount > 0 && (
            <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20 border text-xs gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {passedCount}
            </Badge>
          )}
          {failedCount > 0 && (
            <Badge variant="destructive" className="text-xs gap-1">
              <XCircle className="w-3 h-3" />
              {failedCount}
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20 border text-xs gap-1">
              <AlertCircle className="w-3 h-3" />
              {warningCount}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-3">
            {safeResults.map((result) => (
              <Collapsible
                key={result.header}
                open={expandedItems.has(result.header)}
                onOpenChange={() => toggleExpanded(result.header)}
              >
                <Card className="hover-elevate">
                  <CollapsibleTrigger className="w-full" data-testid={`validator-${result.header.toLowerCase().replace(/\s+/g, '-')}`}>
                    <CardHeader className="gap-4 flex-row items-center justify-between flex-wrap p-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getStatusIcon(result.status)}
                        <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-medium">{result.header}</span>
                            {result.required && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                Required
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground text-left line-clamp-1">
                            {result.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(result.status)}
                        {expandedItems.has(result.header) ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-3 px-3 space-y-3">
                      {result.actualValue && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-muted-foreground">Actual Value:</span>
                          <div className="bg-muted rounded p-2">
                            <code className="text-xs font-mono break-all">{result.actualValue}</code>
                          </div>
                        </div>
                      )}
                      {result.expectedPattern && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-muted-foreground">Expected Pattern:</span>
                          <div className="bg-muted rounded p-2">
                            <code className="text-xs font-mono break-all">{result.expectedPattern}</code>
                          </div>
                        </div>
                      )}
                      {result.details && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-muted-foreground">Details:</span>
                          <p className="text-xs text-muted-foreground">{result.details}</p>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>

        {curlCommand && (
          <div className="space-y-2 pt-3 border-t border-border">
            <span className="text-xs font-medium text-muted-foreground">Test with curl:</span>
            <div className="bg-muted rounded p-3">
              <code className="text-xs font-mono break-all">{curlCommand}</code>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
