import { DocumentationPanel, type DocSection } from "@/components/documentation-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Network, Lock, FileCode, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { DocumentationSection } from "@shared/schema";

export default function Documentation() {
  const { data: allDocs, isLoading } = useQuery<DocumentationSection[]>({
    queryKey: ["/api/docs"],
  });

  const owaspDocs = allDocs?.filter(d => d.category === "owasp") || [];
  const strideDocs = allDocs?.filter(d => d.category === "stride") || [];
  const httpDocs = allDocs?.filter(d => d.category === "http") || [];
  const tlsDocs = allDocs?.filter(d => ["tls", "headers"].includes(d.category)) || [];

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="border-b border-border p-4">
          <div className="max-w-7xl mx-auto space-y-2">
            <Skeleton className="h-8 w-96" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!allDocs || allDocs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>No Documentation Available</CardTitle>
            <CardDescription>Unable to load documentation sections.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b border-border p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Documentation & Resources</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive security concepts and implementation guides
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto p-4">
          <Tabs defaultValue="owasp" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="owasp" className="gap-2" data-testid="tab-owasp">
                <Shield className="w-4 h-4" />
                OWASP Top 10
              </TabsTrigger>
              <TabsTrigger value="stride" className="gap-2" data-testid="tab-stride">
                <Network className="w-4 h-4" />
                STRIDE
              </TabsTrigger>
              <TabsTrigger value="http" className="gap-2" data-testid="tab-http">
                <FileCode className="w-4 h-4" />
                HTTP/S
              </TabsTrigger>
              <TabsTrigger value="tls" className="gap-2" data-testid="tab-tls">
                <Lock className="w-4 h-4" />
                TLS/SSL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="owasp" className="flex-1 min-h-0 m-0">
              <DocumentationPanel sections={owaspDocs} />
            </TabsContent>

            <TabsContent value="stride" className="flex-1 min-h-0 m-0">
              <DocumentationPanel sections={strideDocs} />
            </TabsContent>

            <TabsContent value="http" className="flex-1 min-h-0 m-0">
              <DocumentationPanel sections={httpDocs} />
            </TabsContent>

            <TabsContent value="tls" className="flex-1 min-h-0 m-0">
              <DocumentationPanel sections={tlsDocs} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
