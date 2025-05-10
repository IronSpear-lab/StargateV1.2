import React, { useState, useMemo, useCallback } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Area, ComposedChart 
} from 'recharts';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ExternalLink, TrendingUp, TrendingDown, ChevronLeft, 
  ChevronRight, Settings, DollarSign, Clock 
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  format, startOfWeek, endOfWeek, subWeeks, addWeeks, 
  startOfMonth, endOfMonth, subMonths, addMonths, 
  eachDayOfInterval
} from "date-fns";
import { sv } from "date-fns/locale";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

interface RevenueOverviewWidgetProps {
  id?: string;
  projectId: number;
  type?: string;
  title?: string;
  onRemove?: (id: string) => void;
  className?: string;
}

interface RevenueDataPoint {
  date: string;
  actualCost: number;
  estimatedCost: number;
  fullDate: string;
}

type ViewMode = 'week' | 'month';

// Valideringsschema för budget och timpris formulär
const budgetFormSchema = z.object({
  totalBudget: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Budget måste vara ett giltigt nummer större än eller lika med 0",
  }),
  hourlyRate: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Timpris måste vara ett giltigt nummer större än eller lika med 0",
  }),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

export function RevenueOverviewWidget({ 
  id = 'revenue-overview', 
  projectId, 
  type = 'revenue-overview', 
  title = 'INTÄKTSÖVERSIKT',
  onRemove,
  className
}: RevenueOverviewWidgetProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  const [previewHourlyRate, setPreviewHourlyRate] = useState<number | null>(null);
  
  // Hämta budget, timpris och intäktsdata
  const { 
    data: revenueData, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['/api/projects', projectId, 'revenue', viewMode, currentOffset],
    enabled: !!projectId,
    
    // Inga placeholderData, vi vill att laddningsstatus visas korrekt
    
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`/api/projects/${projectId}/revenue?viewMode=${viewMode}&offset=${currentOffset}`);
      
      if (!response.ok) {
        try {
          // Användaren behöver logga in manuellt
          console.error('Användaren är inte inloggad eller saknar behörighet');
        } catch (err) {
          console.error("Login retry failed:", err);
        }
        
        // Returner placeholder om API inte fungerar
        throw new Error("Failed to fetch revenue data");
      }
      
      return await response.json();
    }
  });
  
  // Mutation för att uppdatera budget och timpris
  const updateBudgetMutation = useMutation({
    mutationFn: async (data: BudgetFormValues) => {
      const response = await apiRequest(
        'PATCH',
        `/api/projects/${projectId}/budget`,
        {
          totalBudget: parseInt(data.totalBudget),
          hourlyRate: parseInt(data.hourlyRate)
        }
      );
      return await response.json();
    },
    onSuccess: () => {
      // Uppdatera cachen efter lyckad mutation
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', projectId, 'revenue']
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
  
  // Formatera data för grafen
  const chartData = useMemo(() => {
    if (!revenueData?.revenueData) return [];
    
    const days = eachDayOfInterval({ start: activeStartDate, end: activeEndDate });
    
    // Använd antingen det temporära timpriset eller det faktiska från API
    const effectiveHourlyRate = previewHourlyRate !== null 
      ? previewHourlyRate 
      : (revenueData.hourlyRate || 0);
    
    return days.map(day => {
      const formattedDay = format(day, 'yyyy-MM-dd');
      const dayData = revenueData.revenueData.find((d: RevenueDataPoint) => d.date === formattedDay) || {
        date: formattedDay,
        estimatedCost: 0,
        actualCost: 0
      };
      
      // Om vi använder preview-timpris, beräkna om kostnaderna baserat på timfaktor
      let estCost = Number(dayData.estimatedCost);
      let actCost = Number(dayData.actualCost);
      
      // Om det finns ett preview-timpris, skala om kostnaderna
      if (previewHourlyRate !== null && revenueData.hourlyRate && revenueData.hourlyRate > 0) {
        const scaleFactor = previewHourlyRate / revenueData.hourlyRate;
        estCost = estCost * scaleFactor;
        actCost = actCost * scaleFactor;
      }
      
      return {
        name: viewMode === 'week' ? format(day, 'EEE', { locale: sv }) : format(day, 'd', { locale: sv }),
        fullDate: formattedDay,
        estimatedCost: estCost.toFixed(0),
        actualCost: actCost.toFixed(0),
        hourlyRate: effectiveHourlyRate
      };
    });
  }, [activeStartDate, activeEndDate, revenueData, viewMode, previewHourlyRate]);
  
  // Formatera kostnad i kronor
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0
    }).format(value);
  }, []);
  
  // Beräkna totaler och procent
  const { 
    totalEstimatedCost, 
    totalActualCost, 
    costDiff, 
    diffPercentage, 
    isOverBudget,
    budgetUsagePercent 
  } = useMemo(() => {
    const totalEstimated = chartData.reduce((acc, curr) => acc + parseFloat(curr.estimatedCost), 0);
    const totalActual = chartData.reduce((acc, curr) => acc + parseFloat(curr.actualCost), 0);
    const diff = totalEstimated - totalActual;
    const percentage = totalEstimated ? ((diff / totalEstimated) * 100).toFixed(1) : "0.0";
    const totalBudget = revenueData?.totalBudget || 0;
    const budgetPercentage = totalBudget ? ((totalActual / totalBudget) * 100).toFixed(1) : "0.0";
    
    return {
      totalEstimatedCost: totalEstimated,
      totalActualCost: totalActual,
      costDiff: diff,
      diffPercentage: percentage,
      isOverBudget: diff < 0,
      budgetUsagePercent: parseFloat(budgetPercentage)
    };
  }, [chartData, revenueData]);
  
  // Formatera perioden för visning i UI
  const formattedPeriod = useMemo(() => {
    if (viewMode === 'week') {
      return `${format(activeStartDate, 'd MMM', { locale: sv })} - ${format(activeEndDate, 'd MMM', { locale: sv })}`;
    } else {
      return format(activeStartDate, 'MMMM yyyy', { locale: sv });
    }
  }, [activeStartDate, activeEndDate, viewMode]);
  
  // Navigera mellan tidsperioder
  const navigatePrevious = () => setCurrentOffset(prev => prev - 1);
  const navigateNext = () => setCurrentOffset(prev => prev + 1);
  const navigateToday = () => setCurrentOffset(0);
  
  // Formulärhantering för budget och timpris
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      totalBudget: "0",
      hourlyRate: "0"
    }
  });
  
  // Uppdatera formulärvärden när data laddas
  React.useEffect(() => {
    if (revenueData) {
      form.setValue("totalBudget", revenueData.totalBudget?.toString() || "0");
      form.setValue("hourlyRate", revenueData.hourlyRate?.toString() || "0");
      // Återställ preview-värdet när faktisk data laddas
      setPreviewHourlyRate(null);
    }
  }, [revenueData, form]);
  
  // Hantera formulärinsändning
  const onSubmit = (data: BudgetFormValues) => {
    updateBudgetMutation.mutate(data);
  };
  
  // Tooltip för grafen
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-md text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="font-medium">Datum:</div>
            <div>{format(new Date(data.fullDate), 'yyyy-MM-dd')}</div>
            <div className="font-medium">Budget:</div>
            <div>{formatCurrency(parseFloat(data.estimatedCost))}</div>
            <div className="font-medium">Faktiskt:</div>
            <div>{formatCurrency(parseFloat(data.actualCost))}</div>
          </div>
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card className="w-full h-full flex flex-col bg-white dark:bg-background overflow-hidden">
      <CardContent className="p-4 flex flex-col h-full">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xl font-semibold text-foreground dark:text-foreground">
                  Budget vs Kostnad
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formattedPeriod}
                </p>
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Projektinställningar</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="totalBudget"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Budget (SEK)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  type="number" 
                                  placeholder="0" 
                                  className="pl-8" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hourlyRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timpris (SEK)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  type="number" 
                                  placeholder="0" 
                                  className="pl-8" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end">
                        <Button 
                          type="submit" 
                          disabled={updateBudgetMutation.isPending}
                        >
                          {updateBudgetMutation.isPending ? 'Sparar...' : 'Spara'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="border rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Total Budget</div>
                <div className="text-lg font-bold">{formatCurrency(revenueData?.totalBudget || 0)}</div>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="text-xs text-muted-foreground">Timpris:</div>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={previewHourlyRate !== null ? previewHourlyRate : revenueData?.hourlyRate || 0}
                      min={0}
                      className="w-full h-6 px-2 text-xs border rounded-md"
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value)) {
                          setPreviewHourlyRate(value);
                        } else {
                          setPreviewHourlyRate(null);
                        }
                      }}
                      onBlur={() => {
                        if (previewHourlyRate !== null) {
                          form.setValue("hourlyRate", previewHourlyRate.toString());
                          updateBudgetMutation.mutate({ 
                            totalBudget: form.getValues("totalBudget"), 
                            hourlyRate: previewHourlyRate.toString() 
                          });
                        }
                      }}
                    />
                    <span className="absolute right-2 top-1 text-xs">kr</span>
                  </div>
                </div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Kostnad denna period</div>
                <div className="text-lg font-bold">{formatCurrency(totalActualCost)}</div>
                <div className="text-xs text-muted-foreground">
                  {budgetUsagePercent > 0 ? `${budgetUsagePercent}% av total budget` : 'Ingen budget använd'}
                </div>
              </div>
            </div>
            
            {/* Period navigation */}
            <div className="flex items-center justify-between mt-4">
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => {
                if (value) {
                  setViewMode(value as ViewMode);
                  setCurrentOffset(0);
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
            
            {/* Chart */}
            <div className="h-[180px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 5, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorEstimated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                  <XAxis
                    dataKey="name"
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
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="estimatedCost" 
                    fill="url(#colorEstimated)" 
                    stroke="#8884d8" 
                    strokeWidth={0}
                    activeDot={false}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="actualCost" 
                    fill="url(#colorActual)" 
                    stroke="#f43f5e" 
                    strokeWidth={0}
                    activeDot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="estimatedCost"
                    stroke="#8884d8"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                    name="Budget"
                  />
                  <Line
                    type="monotone"
                    dataKey="actualCost"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                    name="Faktisk Kostnad"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2 text-xs">
                <div className="h-3 w-3 rounded-full bg-[#8884d8]" />
                <div>Budget</div>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <div className="h-3 w-3 rounded-full bg-[#f43f5e]" />
                <div>Faktisk Kostnad</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}