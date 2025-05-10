import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  format, startOfWeek, endOfWeek, subWeeks, addWeeks, 
  startOfMonth, endOfMonth, subMonths, addMonths, 
  eachDayOfInterval
} from "date-fns";
import { sv } from "date-fns/locale";
import { 
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, 
  CartesianGrid, Area, ComposedChart
} from "recharts";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Widget, WidthType, HeightType } from "../../Widget";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { queryClient } from "@/lib/queryClient";

interface RevenueWidgetProps {
  id?: string;
  projectId: number;
  type?: string;
  title?: string;
  onRemove?: (id: string) => void;
  className?: string;
  width?: WidthType;
  height?: HeightType;
}

interface RevenueData {
  day: string;
  fullDate: string;
  current: number;
  previous: number;
  budget?: number;
}

interface RevenueApiResponse {
  dailyData: RevenueData[];
  todayRevenue: number;
}

interface ProjectBudgetData {
  totalBudget?: number | null;
  hourlyRate?: number | null;
}

// Tidsperiodtyper och navigeringslogik
type ViewMode = 'week' | 'month';

export function RevenueOverviewWidget({ 
  id = 'revenue-overview', 
  projectId, 
  type = 'revenue-overview', 
  title = 'INTÄKTSÖVERSIKT', 
  onRemove,
  className,
  width,
  height
}: RevenueWidgetProps) {
  // Tidsperiod inställningar
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentOffset, setCurrentOffset] = useState(0);
  
  // Budget dialoginställningar
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [hourlyRate, setHourlyRate] = useState<number | undefined>();
  const [totalBudget, setTotalBudget] = useState<number | undefined>();
  
  // Hämta budgetinställningar för projektet
  const { data: budgetData } = useQuery<ProjectBudgetData>({
    queryKey: ['/api/projects', projectId, 'budget']
  });
  
  // Uppdatera state när budgetdata har hämtats
  React.useEffect(() => {
    if (budgetData) {
      setHourlyRate(budgetData.hourlyRate || undefined);
      setTotalBudget(budgetData.totalBudget || undefined);
    }
  }, [budgetData]);
  
  // Uppdatera budgetinställningar
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
        throw new Error('Kunde inte uppdatera budgetinställningar');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Stäng dialogen och uppdatera data
      setIsBudgetDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'budget'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'revenue'] });
    }
  });
  
  // Hantera budget formulär submission
  const handleSubmitBudgetSettings = () => {
    updateBudgetMutation.mutate({
      hourlyRate: hourlyRate ?? null,
      totalBudget: totalBudget ?? null,
    });
  };
  
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
  
  // Fetch data for estimated revenue vs actual revenue per day
  const { data: apiResponse, isLoading } = useQuery<RevenueApiResponse>({
    queryKey: ['/api/projects', projectId, 'revenue', viewMode, currentOffset, hourlyRate],
    enabled: !!projectId
  });
  
  // Navigering mellan tidsperioder
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
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Anpassad tooltip för grafen
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-md text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="font-medium">Datum:</div>
            <div>{format(new Date(data.fullDate), 'yyyy-MM-dd')}</div>
            <div className="font-medium">Dagens intäkt:</div>
            <div>{formatCurrency(data.current)}</div>
            <div className="font-medium">Föregående period:</div>
            <div>{formatCurrency(data.previous)}</div>
            {data.budget !== undefined && (
              <>
                <div className="font-medium">Budget:</div>
                <div>{formatCurrency(data.budget)}</div>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };
  
  // Bearbeta data från API:et
  const data = useMemo(() => {
    if (!apiResponse?.dailyData) return [];
    return apiResponse.dailyData;
  }, [apiResponse]);
  
  // Beräkna viktiga mätvärden
  const todayRevenue = apiResponse?.todayRevenue || 0;
  
  // Beräkna veckototaler och jämförelser
  const { currentWeekTotal, previousWeekTotal, percentChange } = useMemo(() => {
    let currentWeekTotal = 0;
    let previousWeekTotal = 0;
    
    if (data.length > 0) {
      currentWeekTotal = data.reduce((sum, day) => sum + day.current, 0);
      previousWeekTotal = data.reduce((sum, day) => sum + day.previous, 0);
    }
    
    const percentChange = previousWeekTotal > 0
      ? ((currentWeekTotal - previousWeekTotal) / previousWeekTotal) * 100
      : 0;
      
    return { currentWeekTotal, previousWeekTotal, percentChange };
  }, [data]);
  
  // Beräkna max värde för y-axeln för att få bra skalning
  const yAxisMax = useMemo(() => {
    if (data.length === 0) return 1000;
    
    // Hitta högsta värdet i data att visa
    const allValues = data.flatMap((item) => {
      const values = [item.current, item.previous];
      if (item.budget !== undefined) values.push(item.budget);
      return values;
    });
    
    const maxValue = Math.max(...allValues, 100); // Säkerställ minst 100 för att undvika 0
    return Math.ceil(maxValue * 1.2); // Lägg till 20% extra för bättre layout
  }, [data]);
  
  // Huvudsakligt innehåll för widgeten
  const renderContent = () => (
    <div className="space-y-4">
      <div className="flex flex-col space-y-3">
        <div className="text-2xl font-bold">
          {isLoading ? "..." : formatCurrency(currentWeekTotal)}
        </div>
        <p className="text-xs text-muted-foreground">
          {hourlyRate 
            ? `Aktuellt timpris: ${formatCurrency(hourlyRate)}/tim`
            : 'Inget timpris inställt. Klicka på "Inställningar" för att lägga till.'
          }
          {totalBudget 
            ? ` • Total budget: ${formatCurrency(totalBudget)}`
            : ''
          }
        </p>
        <div className="flex items-baseline space-x-2">
          <div className="flex items-center">
            <div className={cn(
              "mr-1 text-sm font-medium",
              percentChange < 0 ? "text-destructive" : "text-emerald-500"
            )}>
              {percentChange >= 0 ? "+" : ""}{formatCurrency(currentWeekTotal - previousWeekTotal)}
            </div>
            <span className={cn(
              "text-xs",
              percentChange < 0 ? "text-destructive" : "text-emerald-500"
            )}>
              ({percentChange >= 0 ? "+" : ""}{percentChange.toFixed(1)}%)
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            jämfört med föregående period
          </div>
        </div>
      </div>

      {/* Navigeringskontroller */}
      <div className="space-y-2">
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

      <div className="h-[200px]">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {data.length > 0 && (
              <ComposedChart
                data={data}
                margin={{
                  top: 10,
                  right: 10,
                  left: 5,
                  bottom: 5,
                }}
              >
                <defs>
                  <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
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
                  tickFormatter={(value) => 
                    value >= 1000 
                      ? `${(value/1000).toFixed(0)}k` 
                      : value.toString()
                  }
                  tick={{ fontSize: 12 }}
                  domain={[0, yAxisMax]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="current" 
                  fill="url(#colorCurrent)" 
                  stroke="#4ade80" 
                  strokeWidth={0}
                  activeDot={false}
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
                <Line
                  type="monotone"
                  dataKey="current"
                  stroke="#4ade80"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                  name="Faktisk intäkt"
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
                  dataKey="previous" 
                  name="Föregående period"
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 4, fill: "hsl(var(--chart-1))" }}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );

  return (
    <Widget 
      id={id}
      title={title}
      type={type}
      onRemove={onRemove} 
      className={className}
      width={width}
      height={height}
      titleButton={
        <Button 
          variant="ghost" 
          size="sm" 
          className="ml-auto h-8 gap-1"
          onClick={() => setIsBudgetDialogOpen(true)}
        >
          <Settings className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Inställningar</span>
        </Button>
      }
    >
      {renderContent()}

      <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Budgetinställningar</DialogTitle>
            <DialogDescription>
              Ange projektets totala budget och timpris för intäktsberäkning.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hourlyRate" className="text-right">
                Timpris
              </Label>
              <Input
                id="hourlyRate"
                type="number"
                min="0"
                value={hourlyRate || ''}
                onChange={(e) => setHourlyRate(e.target.value ? Number(e.target.value) : undefined)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="totalBudget" className="text-right">
                Total budget
              </Label>
              <Input
                id="totalBudget"
                type="number"
                min="0"
                value={totalBudget || ''}
                onChange={(e) => setTotalBudget(e.target.value ? Number(e.target.value) : undefined)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              onClick={handleSubmitBudgetSettings}
              disabled={updateBudgetMutation.isPending}
            >
              {updateBudgetMutation.isPending ? 'Sparar...' : 'Spara ändringar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Widget>
  );
}