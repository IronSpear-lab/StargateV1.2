import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from 'recharts';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, TrendingUp, TrendingDown, Edit, Settings } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  format, startOfWeek, endOfWeek, subWeeks, addWeeks, 
  startOfMonth, endOfMonth, subMonths, addMonths, 
  eachDayOfInterval
} from "date-fns";
import { sv } from "date-fns/locale";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Dialog imports
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RevenueData {
  day: string;
  current: number;
  previous: number;
  budget?: number;
}

interface ProjectBudgetData {
  totalBudget?: number | null;
  hourlyRate?: number | null;
}

type ViewMode = 'week' | 'month';

export function RevenueOverviewWidget({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const [data, setData] = useState<RevenueData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeekTotal, setCurrentWeekTotal] = useState(0);
  const [previousWeekTotal, setPreviousWeekTotal] = useState(0);
  const [percentChange, setPercentChange] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  
  // Budget settings dialog
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [totalBudget, setTotalBudget] = useState<number | undefined>(undefined);
  const [hourlyRate, setHourlyRate] = useState<number | undefined>(undefined);
  
  // View mode and time period state
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  
  // Fetch budget data from the API
  const { data: budgetData, isLoading: isBudgetLoading } = useQuery<ProjectBudgetData>({
    queryKey: ['/api/projects', projectId, 'budget'],
    enabled: !!projectId,
    onSuccess: (data) => {
      if (data) {
        setTotalBudget(data.totalBudget || undefined);
        setHourlyRate(data.hourlyRate || undefined);
      }
    }
  });
  
  // Update budget and hourly rate
  const updateBudgetMutation = useMutation({
    mutationFn: async (data: ProjectBudgetData) => {
      const response = await fetch(`/api/projects/${projectId}/budget`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update budget settings');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uppdaterat",
        description: "Budget och timpris har uppdaterats",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'budget'] });
      setIsBudgetDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Fel",
        description: `Kunde inte uppdatera budget: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Beräkna tidsintervall baserat på aktuell vy och offset
  const { activeStartDate, activeEndDate } = useMemo(() => {
    const currentDate = new Date();
    let startDate: Date;
    let endDate: Date;
    
    if (viewMode === 'week') {
      const baseStart = startOfWeek(currentDate, { locale: sv });
      const baseEnd = endOfWeek(currentDate, { locale: sv });
      
      if (currentOffset < 0) {
        // Tidigare veckor
        startDate = subWeeks(baseStart, Math.abs(currentOffset));
        endDate = subWeeks(baseEnd, Math.abs(currentOffset));
      } else if (currentOffset > 0) {
        // Kommande veckor
        startDate = addWeeks(baseStart, currentOffset);
        endDate = addWeeks(baseEnd, currentOffset);
      } else {
        // Nuvarande vecka
        startDate = baseStart;
        endDate = baseEnd;
      }
    } else {
      // Månadsvy
      const baseStart = startOfMonth(currentDate);
      const baseEnd = endOfMonth(currentDate);
      
      if (currentOffset < 0) {
        // Tidigare månader
        startDate = subMonths(baseStart, Math.abs(currentOffset));
        endDate = endOfMonth(startDate);
      } else if (currentOffset > 0) {
        // Kommande månader
        startDate = addMonths(baseStart, currentOffset);
        endDate = endOfMonth(startDate);
      } else {
        // Nuvarande månad
        startDate = baseStart;
        endDate = baseEnd;
      }
    }
    
    return { activeStartDate: startDate, activeEndDate: endDate };
  }, [viewMode, currentOffset]);
  
  // Fetch data for estimated hours vs actual hours per day
  const { data: revenueData } = useQuery<RevenueData[]>({
    queryKey: ['/api/projects', projectId, 'revenue', viewMode, currentOffset, hourlyRate],
    enabled: !!projectId && !!hourlyRate,
    placeholderData: [],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(
        `/api/projects/${projectId}/revenue?viewMode=${viewMode}&offset=${currentOffset}&hourlyRate=${hourlyRate || 0}`
      );
      
      if (!response.ok) {
        throw new Error('Kunde inte hämta intäktsdata');
      }
      
      return response.json();
    }
  });
  
  useEffect(() => {
    // If we have real API data, use it, otherwise fallback to mock data
    if (revenueData && revenueData.length > 0) {
      setData(revenueData);
      
      // Calculate totals
      const currentTotal = revenueData.reduce((sum, item) => sum + item.current, 0);
      const previousTotal = revenueData.reduce((sum, item) => sum + (item.previous || 0), 0);
      
      setCurrentWeekTotal(currentTotal);
      setPreviousWeekTotal(previousTotal);
      
      // Calculate percent change
      const change = previousTotal ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
      setPercentChange(change);
      setIsLoading(false);
    } else {
      // Fallback mock data until API is ready
      const mockData: RevenueData[] = [
        { day: 'Mon', current: 9000, previous: 5000 },
        { day: 'Tue', current: 18000, previous: 12000 },
        { day: 'Wed', current: 9000, previous: 16000 },
        { day: 'Thu', current: 27000, previous: 14000 },
        { day: 'Fri', current: 18000, previous: 22000 },
        { day: 'Sat', current: 36000, previous: 28000 },
        { day: 'Sun', current: 27000, previous: 22000 },
      ];

      setData(mockData);
      
      // Calculate totals
      const currentTotal = mockData.reduce((sum, item) => sum + item.current, 0);
      const previousTotal = mockData.reduce((sum, item) => sum + item.previous, 0);
      
      setCurrentWeekTotal(currentTotal);
      setPreviousWeekTotal(previousTotal);
      
      // Calculate percent change
      const change = ((currentTotal - previousTotal) / previousTotal) * 100;
      setPercentChange(change);
      setIsLoading(false);
    }
  }, [revenueData]);
  
  // Handle budget setting submission
  const handleSubmitBudgetSettings = () => {
    updateBudgetMutation.mutate({
      totalBudget,
      hourlyRate
    });
  };
  
  // Navigera mellan tidsperioder
  const navigatePrevious = () => setCurrentOffset(prev => prev - 1);
  const navigateNext = () => setCurrentOffset(prev => prev + 1);
  const navigateToday = () => setCurrentOffset(0);
  
  // Formaterad period
  const formattedPeriod = useMemo(() => {
    if (viewMode === 'week') {
      return `${format(activeStartDate, 'd MMM', { locale: sv })} - ${format(activeEndDate, 'd MMM', { locale: sv })}`;
    } else {
      return format(activeStartDate, 'MMMM yyyy', { locale: sv });
    }
  }, [activeStartDate, activeEndDate, viewMode]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Card className="w-full h-full flex flex-col bg-white dark:bg-background overflow-hidden">
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-xl font-semibold text-foreground dark:text-foreground">Dagens Intäkter: {formatCurrency(2562.30)}</h3>
              <p className="text-sm text-foreground/70 dark:text-foreground/70 mt-1 max-w-[300px]">
                {hourlyRate 
                  ? `Aktuellt timpris: ${formatCurrency(hourlyRate)}/tim`
                  : 'Inget timpris inställt. Klicka på "Inställningar" för att lägga till.'
                }
                {totalBudget 
                  ? ` • Total budget: ${formatCurrency(totalBudget)}`
                  : ''
                }
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs py-1 px-3 h-8 hover:bg-secondary/80"
              onClick={() => setIsBudgetDialogOpen(true)}
            >
              <Settings className="h-3.5 w-3.5 mr-1" /> Inställningar
            </Button>
          </div>
          
          {/* Navigeringskontroller */}
          <div className="space-y-2 mt-3 mb-3">
            <div className="flex items-center justify-between">
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => {
                if (value) {
                  setViewMode(value as ViewMode);
                  setCurrentOffset(0); // Återställ offset när vytyp ändras
                }
              }}>
                <ToggleGroupItem value="week">Vecka</ToggleGroupItem>
                <ToggleGroupItem value="month">Månad</ToggleGroupItem>
              </ToggleGroup>
              
              <div className="flex items-center space-x-1">
                <Button variant="outline" size="icon" onClick={navigatePrevious} title="Föregående period">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={navigateToday}>
                  Idag
                </Button>
                <Button variant="outline" size="icon" onClick={navigateNext} title="Nästa period">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-center text-sm font-medium">{formattedPeriod}</div>
          </div>
          
          <div className="flex items-center justify-between mt-4 mb-2">
            <div className="flex items-center">
              <div className="mr-4">
                <div className="text-sm text-foreground/70 dark:text-foreground/70">Aktuell Period</div>
                <div className="text-lg font-bold text-foreground dark:text-foreground">{formatCurrency(currentWeekTotal)}</div>
              </div>
              <div>
                <div className="text-sm text-foreground/70 dark:text-foreground/70">Föregående Period</div>
                <div className="text-lg font-bold text-foreground dark:text-foreground">{formatCurrency(previousWeekTotal)}</div>
              </div>
            </div>
            <div className={`flex items-center ${percentChange >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-primary dark:text-primary'}`}>
              {percentChange >= 0 ? 
                <TrendingUp className="h-5 w-5 mr-1" /> : 
                <TrendingDown className="h-5 w-5 mr-1" />
              }
              <span className="font-semibold">{percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%</span>
            </div>
          </div>
          
          <div className="w-full h-[180px] mt-2">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={data}
                  margin={{ top: 10, right: 10, left: 5, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value/1000}k`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value as number), '']}
                    labelFormatter={(label) => `${label}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: 'none',
                      borderRadius: '0.375rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    }}
                  />
                  {totalBudget && (
                    <Area 
                      type="monotone" 
                      dataKey="budget" 
                      fill="url(#colorBudget)" 
                      stroke="#8884d8" 
                      strokeWidth={0}
                      activeDot={false}
                    />
                  )}
                  <Area 
                    type="monotone" 
                    dataKey="current" 
                    fill="url(#colorActual)" 
                    stroke="#4ade80" 
                    strokeWidth={0}
                    activeDot={false}
                  />
                  {totalBudget && (
                    <Line
                      type="monotone"
                      dataKey="budget"
                      stroke="#8884d8"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                      name="Budget"
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="current"
                    stroke="#4ade80"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                    name="Faktisk intäkt"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="previous" 
                    name="Föregående period"
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 4, fill: "hsl(var(--chart-1))" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-2 text-xs">
              <div className="h-3 w-3 rounded-full bg-[#4ade80]" />
              <div>Faktisk intäkt</div>
            </div>
            {totalBudget && (
              <div className="flex items-center space-x-2 text-xs">
                <div className="h-3 w-3 rounded-full bg-[#8884d8]" />
                <div>Budget</div>
              </div>
            )}
            <div className="flex items-center space-x-2 text-xs">
              <div className="h-3 w-3 rounded-full border border-[#ff4d4f] bg-transparent" />
              <div>Föregående period</div>
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Budget Settings Dialog */}
      <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Budget & Timpris Inställningar</DialogTitle>
            <DialogDescription>
              Ställ in total budget för projektet och timpriset för att beräkna intäkter.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="totalBudget" className="text-right">
                Total Budget
              </Label>
              <Input
                id="totalBudget"
                type="number"
                min="0"
                className="col-span-3"
                value={totalBudget || ''}
                onChange={(e) => setTotalBudget(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="100000"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hourlyRate" className="text-right">
                Timpris (SEK)
              </Label>
              <Input
                id="hourlyRate"
                type="number"
                min="0"
                className="col-span-3"
                value={hourlyRate || ''}
                onChange={(e) => setHourlyRate(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="1000"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBudgetDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleSubmitBudgetSettings} disabled={updateBudgetMutation.isPending}>
              {updateBudgetMutation.isPending ? "Sparar..." : "Spara"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}