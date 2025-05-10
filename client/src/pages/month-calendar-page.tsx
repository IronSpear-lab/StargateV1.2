import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, PlusCircle, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { MonthCalendarGrid } from "@/components/MonthCalendarGrid";
import { format, addMonths, subMonths } from "date-fns";
import { sv } from "date-fns/locale";

export default function MonthCalendarPage() {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Månadskalender" onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">Månadskalender</h1>
              <p className="text-neutral-500">Se din tidsrapportering i månadsvy</p>
            </div>
            <div className="flex items-center space-x-2 mt-4 md:mt-0">
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={prevMonth}>
                  Föregående
                </Button>
                <div className="px-2">
                  {format(currentMonth, "MMMM yyyy", { locale: sv })}
                </div>
                <Button variant="outline" onClick={nextMonth}>
                  Nästa
                </Button>
              </div>
              <Button>
                <BarChart2 className="mr-2 h-4 w-4" />
                Rapport
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <MonthCalendarGrid />
            
            <Card className="border border-neutral-200">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Projektsammanfattning</CardTitle>
                <CardDescription>Tidrapportering per projekt denna månad</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="bg-neutral-50 border-neutral-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm text-neutral-500">ValvXlstart Development</div>
                          <div className="text-2xl font-semibold">42.5h</div>
                        </div>
                        <div className="p-2 bg-primary-100 rounded-full">
                          <Calendar className="h-4 w-4 text-primary-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-neutral-50 border-neutral-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm text-neutral-500">Mobile App Integration</div>
                          <div className="text-2xl font-semibold">12.5h</div>
                        </div>
                        <div className="p-2 bg-primary-100 rounded-full">
                          <Calendar className="h-4 w-4 text-primary-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-neutral-50 border-neutral-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm text-neutral-500">Design System</div>
                          <div className="text-2xl font-semibold">28.0h</div>
                        </div>
                        <div className="p-2 bg-primary-100 rounded-full">
                          <Calendar className="h-4 w-4 text-primary-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex justify-end mt-6">
                  <Button variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Lägg till tid
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}