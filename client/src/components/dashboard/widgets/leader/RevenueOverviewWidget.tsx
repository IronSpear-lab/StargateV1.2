import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  format, startOfWeek, endOfWeek, subWeeks, addWeeks, 
  startOfMonth, endOfMonth, subMonths, addMonths, parseISO
} from "date-fns";
import { sv } from "date-fns/locale";
import { 
  Line, ResponsiveContainer, Tooltip, XAxis, YAxis, 
  CartesianGrid, Area, ComposedChart
} from "recharts";
import { ChevronLeft, ChevronRight, Settings, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { WidthType, HeightType } from "../../Widget";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { queryClient } from "@/lib/queryClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

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
  project?: {
    totalBudget: number;
    startDate: string | null;
    endDate: string | null;
  };
}

interface ProjectBudgetData {
  totalBudget?: number | null;
  hourlyRate?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}

type ViewMode = 'week' | 'month';

export function RevenueOverviewWidget({ 
  projectId
}: RevenueWidgetProps) {
  // Tidsperiod inställningar
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentOffset, setCurrentOffset] = useState(0);
  
  // Budget dialoginställningar
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [hourlyRate, setHourlyRate] = useState<number | undefined>();
  const [totalBudget, setTotalBudget] = useState<number | undefined>();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  
  // Hämta budgetinställningar för projektet
  const { data: budgetData } = useQuery<ProjectBudgetData>({
    queryKey: ['/api/projects', projectId, 'budget']
  });
  
  // Uppdatera state när budgetdata har hämtats
  React.useEffect(() => {
    if (budgetData) {
      setHourlyRate(budgetData.hourlyRate || undefined);
      setTotalBudget(budgetData.totalBudget || undefined);
      setStartDate(budgetData.startDate ? new Date(budgetData.startDate) : undefined);
      setEndDate(budgetData.endDate ? new Date(budgetData.endDate) : undefined);
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
  
  // Formatera datum för API-anrop
  const formatDateForAPI = (date?: Date): string | null => {
    if (!date) return null;
    return date.toISOString().split('T')[0];
  };
  
  // Hantera budget formulär submission
  const handleSubmitBudgetSettings = () => {
    updateBudgetMutation.mutate({
      hourlyRate: hourlyRate ?? null,
      totalBudget: totalBudget ?? null,
      startDate: formatDateForAPI(startDate),
      endDate: formatDateForAPI(endDate)
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
    queryKey: ['/api/projects', projectId, 'revenue', viewMode, currentOffset],
    enabled: !!projectId,
    queryFn: () => fetch(
      `/api/projects/${projectId}/revenue?viewMode=${viewMode}&offset=${currentOffset}`
    ).then(res => res.json())
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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-2xl font-bold">
          {isLoading ? "..." : formatCurrency(currentWeekTotal)}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="ml-auto h-8 gap-1"
          onClick={() => setIsBudgetDialogOpen(true)}
        >
          <Settings className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Inställningar</span>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-2">
        {hourlyRate 
          ? `Aktuellt timpris: ${formatCurrency(hourlyRate)}/tim`
          : 'Inget timpris inställt. Klicka på "Inställningar" för att lägga till.'
        }
        {totalBudget 
          ? ` • Total budget: ${formatCurrency(totalBudget)}`
          : ''
        }
      </p>
      
      <div className="flex items-baseline space-x-2 mb-4">
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

      {/* Navigeringskontroller */}
      <div className="space-y-2 mb-4">
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
            
            {/* Startdatum */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Startdatum</Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'yyyy-MM-dd') : "Välj startdatum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {/* Slutdatum */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Slutdatum</Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'yyyy-MM-dd') : "Välj slutdatum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      disabled={(date) => startDate ? date < startDate : false}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {startDate && endDate && (
              <div className="text-xs text-muted-foreground text-center">
                <p>Projektperiod: {format(startDate, 'yyyy-MM-dd')} — {format(endDate, 'yyyy-MM-dd')}</p>
                <p>Antal dagar: {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1}</p>
                {totalBudget && (
                  <p>
                    Daglig budget: {formatCurrency(totalBudget / (Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1))}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSubmitBudgetSettings} disabled={updateBudgetMutation.isPending}>
              {updateBudgetMutation.isPending ? 'Sparar...' : 'Spara ändringar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}