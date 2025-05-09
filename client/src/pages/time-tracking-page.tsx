import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarRange, Loader2 } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import TimeTracking from '@/components/TimeTracking';
import { Button } from '@/components/ui/button';
import { MainNav } from '@/components/main-nav';
import { SideNav } from '@/components/side-nav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Project } from '@shared/schema';

export default function TimeTrackingPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ projectId: string }>();
  const projectId = parseInt(params.projectId || '0');

  // Håll reda på vilket projekt vi är i
  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error('Kunde inte ladda projektet');
      return await res.json() as Project;
    },
    enabled: !!projectId && !isNaN(projectId),
  });

  // Använd useEffect för att omdirigera om projektet inte finns eller om vi inte har ett giltigt projektId
  useEffect(() => {
    if (!projectId || isNaN(projectId)) {
      setLocation('/');
    }
  }, [projectId, setLocation]);

  if (projectLoading) {
    return (
      <div className="container flex h-screen items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Laddar projekt...</span>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertTitle>Ett fel uppstod</AlertTitle>
          <AlertDescription>
            Kunde inte ladda projektet. Kontrollera att du har tillgång till detta projekt.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => setLocation('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tillbaka till startsidan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <SideNav projectId={projectId} projectName={project.name} />
        <main className="flex flex-col w-full py-6">
          <PageHeader 
            heading={`Tidsrapportering: ${project.name}`}
            subheading="Hantera din arbetstid och rapportera tid på projektuppgifter"
            icon={<CalendarRange className="h-6 w-6 text-muted-foreground" />}
          >
            <Button variant="outline" asChild>
              <Link href={`/projects/${projectId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tillbaka till projektet
              </Link>
            </Button>
          </PageHeader>

          <div className="mt-8 space-y-8">
            <Tabs defaultValue="my-time" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="my-time">Min tidrapportering</TabsTrigger>
                <TabsTrigger value="project-time">Projektets tidrapportering</TabsTrigger>
              </TabsList>
              <TabsContent value="my-time" className="mt-6">
                <TimeTracking projectId={projectId} />
              </TabsContent>
              <TabsContent value="project-time" className="mt-6">
                <div className="bg-muted p-4 rounded-lg">
                  <Alert>
                    <AlertTitle>Projektöversikt</AlertTitle>
                    <AlertDescription>
                      Här kan du se alla tidsrapporter för hela projektet. Funktionen är under utveckling.
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}