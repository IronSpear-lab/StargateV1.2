import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { useQuery } from "@tanstack/react-query";
import { useProject } from "@/contexts/ProjectContext";
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { CalendarIcon, LineChart, BarChart, ArrowUp, ArrowDown, DollarSign, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function RevenueTimePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { currentProject } = useProject();
  const [selectedView, setSelectedView] = useState<'week' | 'month'>('week');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(
    new Date(new Date().setDate(new Date().getDate() + 7))
  );
  const [hourlyRate, setHourlyRate] = useState<number>(2000);
  
  // Hämta timetracking data
  const { data: timeTrackingData, isLoading: isTimeLoading } = useQuery({
    queryKey: ['/api/time-entries', currentProject?.id],
    enabled: !!currentProject?.id
  });
  
  // Hämta budget data
  const { data: budgetData, isLoading: isBudgetLoading } = useQuery({
    queryKey: ['/api/projects/budget', currentProject?.id],
    enabled: !!currentProject?.id
  });

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Beräkna intäkter baserat på data
  const calculateRevenue = () => {
    if (!timeTrackingData || timeTrackingData.length === 0) {
      return {
        totalHours: 0,
        totalRevenue: 0,
        previousPeriodHours: 0,
        previousPeriodRevenue: 0,
        changePercentage: 0,
        isPositive: false
      };
    }

    // Här kan vi beräkna faktiska intäkter från timeTrackingData
    // Detta är en förenklad implementation
    const totalHours = timeTrackingData.reduce((acc: number, entry: any) => 
      acc + (entry.hours || 0), 0);
    
    const totalRevenue = totalHours * hourlyRate;
    
    // För demonstrationssyfte, simulera en förändring från föregående period
    const previousPeriodHours = totalHours * 0.9;
    const previousPeriodRevenue = previousPeriodHours * hourlyRate;
    const changePercentage = Math.abs(((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100);
    
    return {
      totalHours,
      totalRevenue,
      previousPeriodHours,
      previousPeriodRevenue,
      changePercentage: Math.round(changePercentage),
      isPositive: totalRevenue > previousPeriodRevenue
    };
  };

  const revenueData = calculateRevenue();

  // Generera testdata för grafen
  const generateTimeData = () => {
    const days = ['mån', 'tis', 'ons', 'tors', 'fre', 'lör', 'sön'];
    const data = days.map(day => ({
      day,
      planned: Math.floor(Math.random() * 5) + 1,
      actual: Math.floor(Math.random() * 4)
    }));
    return data;
  };

  const timeData = generateTimeData();

  // Hantera formulärsändringar för intäkter
  const handleHourlyRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setHourlyRate(value);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Ekonomi & Tidrapportering" onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto p-6 bg-gray-100 dark:bg-gray-900">
          {!currentProject ? (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-lg text-muted-foreground mb-4">
                Välj ett projekt för att visa ekonomi- och tidrapportering
              </p>
              <p className="text-sm text-muted-foreground">
                Inget projekt är valt. Välj ett projekt i rullgardinsmenyn i sidhuvudet.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
                {/* Intäktsöversikt widget */}
                <Card className="col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-gray-500" />
                      Intäktsöversikt
                    </CardTitle>
                    <CardDescription>Intäkt baserat på timtaxa × arbetade timmar</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col">
                      <div className="text-3xl font-bold">
                        {revenueData.totalRevenue.toLocaleString()} kr
                      </div>
                      <div className="flex items-center mt-2 text-sm">
                        <div className={`flex items-center ${revenueData.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                          {revenueData.isPositive ? (
                            <ArrowUp className="w-4 h-4 mr-1" />
                          ) : (
                            <ArrowDown className="w-4 h-4 mr-1" />
                          )}
                          {revenueData.changePercentage}%
                        </div>
                        <span className="text-gray-500 ml-2">jämfört med föregående period</span>
                      </div>
                      <div className="mt-4 text-sm text-gray-500">
                        Aktuell timtaxa: {hourlyRate.toLocaleString()} kr/tim • Totalt antal timmar: {revenueData.totalHours}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timförbrukning widget */}
                <Card className="col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center">
                      <Clock className="w-5 h-5 mr-2 text-gray-500" />
                      Timförbrukning
                    </CardTitle>
                    <CardDescription>Planerade timmar vs faktiska timmar</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col">
                      <div className="text-3xl font-bold">
                        {revenueData.totalHours.toFixed(1)} tim
                      </div>
                      <div className="flex items-center mt-2 text-sm">
                        <span className="text-gray-500">Planerat: {(revenueData.totalHours * 1.5).toFixed(1)} tim</span>
                      </div>
                      <div className="mt-4 text-sm text-gray-500">
                        <span className="inline-flex items-center mr-4">
                          <span className="w-3 h-3 rounded-full bg-purple-500 mr-1"></span>
                          Uppskattade timmar
                        </span>
                        <span className="inline-flex items-center">
                          <span className="w-3 h-3 rounded-full bg-green-500 mr-1"></span>
                          Faktiska timmar
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Datumväljare och inställningar */}
                <Card className="col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-gray-500" />
                      Datumintervall
                    </CardTitle>
                    <CardDescription>Välj tidsperiod för rapporten</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="start-date">Startdatum</Label>
                          <DatePicker 
                            date={startDate} 
                            setDate={setStartDate} 
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="end-date">Slutdatum</Label>
                          <DatePicker 
                            date={endDate} 
                            setDate={setEndDate} 
                            className="w-full"
                          />
                        </div>
                      </div>
                      <Tabs defaultValue="week" onValueChange={(v) => setSelectedView(v as 'week' | 'month')}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="week">Vecka</TabsTrigger>
                          <TabsTrigger value="month">Månad</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detaljerad vy */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Intäktsöversikt detaljer */}
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium">Intäktsöversikt (Utökad)</CardTitle>
                    <CardDescription>
                      Detaljerad analys av projektintäkter per {selectedView === 'week' ? 'vecka' : 'månad'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <div className="space-y-6">
                      {/* Intäktsgraf */}
                      <div className="h-60 w-full border-b border-gray-200 dark:border-gray-800 flex items-end justify-around pt-6">
                        {timeData.map((day, i) => (
                          <div key={i} className="flex flex-col items-center">
                            <div className="w-12 bg-green-200 dark:bg-green-900 rounded-t-sm" 
                              style={{height: `${day.actual * 25}px`}}></div>
                            <div className="mt-2 text-xs text-gray-500">{day.day}</div>
                          </div>
                        ))}
                      </div>

                      {/* Intäktsstatistik */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-500">Totalt intäkt</div>
                          <div className="text-xl font-semibold">{(revenueData.totalRevenue).toLocaleString()} kr</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm text-gray-500">Prognos (30 dagar)</div>
                          <div className="text-xl font-semibold">{(revenueData.totalRevenue * 4).toLocaleString()} kr</div>
                        </div>
                      </div>

                      {/* Inställningar för intäktsberäkning */}
                      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                        <div className="space-y-2">
                          <Label htmlFor="hourly-rate" className="flex justify-between">
                            <span>Timtaxa (kr/tim)</span>
                            <span className="text-gray-500">{hourlyRate.toLocaleString()} kr</span>
                          </Label>
                          <div className="flex space-x-2">
                            <Input 
                              id="hourly-rate"
                              type="number" 
                              value={hourlyRate}
                              onChange={handleHourlyRateChange}
                              min={1}
                              className="w-full"
                            />
                            <Button variant="outline" onClick={() => setHourlyRate(2000)}>Återställ</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timförbrukning detaljer */}
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium">Timförbrukning (Utökad)</CardTitle>
                    <CardDescription>
                      Detaljerad analys av planerad vs faktisk tid per {selectedView === 'week' ? 'vecka' : 'månad'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <div className="space-y-6">
                      {/* Timförbrukningsgraf */}
                      <div className="h-60 w-full border-b border-gray-200 dark:border-gray-800 flex items-end justify-around pt-6">
                        {timeData.map((day, i) => (
                          <div key={i} className="flex flex-col items-center">
                            <div className="relative w-12">
                              <div className="absolute bottom-0 w-full bg-purple-200 dark:bg-purple-900/50 rounded-t-sm" 
                                style={{height: `${day.planned * 15}px`}}></div>
                              <div className="absolute bottom-0 w-full bg-green-400 dark:bg-green-600 rounded-t-sm" 
                                style={{height: `${day.actual * 15}px`}}></div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">{day.day}</div>
                          </div>
                        ))}
                      </div>

                      {/* Tidstatistik */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-500">Planerat</div>
                          <div className="text-xl font-semibold">{(revenueData.totalHours * 1.5).toFixed(1)} tim</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm text-gray-500">Faktisk tid</div>
                          <div className="text-xl font-semibold">{revenueData.totalHours.toFixed(1)} tim</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm text-gray-500">Avvikelse</div>
                          <div className="text-xl font-semibold text-red-500">-{(revenueData.totalHours * 0.5).toFixed(1)} tim</div>
                        </div>
                      </div>

                      {/* Förklaringar */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                        <div className="space-y-2">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Uppföljning per uppgift</div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Projektplanering</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">2.5 / 3.0 tim</span>
                                <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                                  <div className="h-2 bg-green-500 rounded-full" style={{width: '83%'}}></div>
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Design</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">4.0 / 6.0 tim</span>
                                <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                                  <div className="h-2 bg-green-500 rounded-full" style={{width: '66%'}}></div>
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Implementation</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">3.5 / 3.0 tim</span>
                                <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                                  <div className="h-2 bg-red-500 rounded-full" style={{width: '116%'}}></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}