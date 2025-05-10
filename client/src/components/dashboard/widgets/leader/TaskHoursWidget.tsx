import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfWeek, endOfWeek, subWeeks, addWeeks, eachDayOfInterval, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { Widget } from "../../Widget";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskHoursWidgetProps {
  projectId: number;
  onRemove?: () => void;
  canRemove?: boolean;
}

export function TaskHoursWidget({ projectId, onRemove, canRemove = false }: TaskHoursWidgetProps) {
  const [dateRange, setDateRange] = useState<'current' | 'previous'>('current');
  
  // Hämta data för uppskattade timmar vs faktiska timmar per dag
  const { data: taskHoursData, isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'task-hours', dateRange],
    enabled: !!projectId
  });

  // Beräkna tidsintervall baserat på aktuell vecka
  const currentDate = new Date();
  const startDate = startOfWeek(currentDate, { locale: sv });
  const endDate = endOfWeek(currentDate, { locale: sv });
  
  // Beräkna föregående vecka
  const prevStartDate = subWeeks(startDate, 1);
  const prevEndDate = subWeeks(endDate, 1);

  // Välj aktiv datumperiod
  const activeStartDate = dateRange === 'current' ? startDate : prevStartDate;
  const activeEndDate = dateRange === 'current' ? endDate : prevEndDate;

  // Formatera data för grafen
  const days = eachDayOfInterval({ start: activeStartDate, end: activeEndDate });
  
  // Formatera API-data eller skapa tomma data om det saknas
  const chartData = days.map(day => {
    const formattedDay = format(day, 'yyyy-MM-dd');
    const dayData = taskHoursData?.find((d: any) => d.date === formattedDay) || {
      date: formattedDay,
      estimatedHours: 0,
      actualHours: 0
    };
    
    return {
      name: format(day, 'EEE', { locale: sv }),
      estimatedHours: Number(dayData.estimatedHours) || 0,
      actualHours: Number(dayData.actualHours) || 0,
      fullDate: formattedDay
    };
  });

  // Beräkna totala timmar för båda typer
  const totalEstimatedHours = chartData.reduce((acc, curr) => acc + curr.estimatedHours, 0);
  const totalActualHours = chartData.reduce((acc, curr) => acc + curr.actualHours, 0);
  const hoursDiff = totalActualHours - totalEstimatedHours;
  const diffPercentage = totalEstimatedHours ? ((hoursDiff / totalEstimatedHours) * 100).toFixed(1) : "0.0";
  const isOverBudget = hoursDiff > 0;

  return (
    <Widget className="col-span-1 md:col-span-2 xl:col-span-3">
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">TIMFÖRBRUKNING</CardTitle>
            {canRemove && onRemove && (
              <Button 
                variant="ghost" 
                className="h-8 w-8 p-0" 
                onClick={onRemove}
              >
                <CircleHelp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col space-y-3">
              <div className="text-2xl font-bold">
                {isLoading ? "..." : `${totalActualHours.toFixed(1)} tim`}
              </div>
              <p className="text-xs text-muted-foreground">
                Planerat: {totalEstimatedHours.toFixed(1)} tim. Faktisk tid: {totalActualHours.toFixed(1)} tim.
              </p>
              <div className="flex items-baseline space-x-2">
                <div className="flex items-center">
                  <div className={cn(
                    "mr-1 text-sm font-medium",
                    isOverBudget ? "text-destructive" : "text-emerald-500"
                  )}>
                    {isOverBudget ? "+" : ""}{hoursDiff.toFixed(1)} tim
                  </div>
                  <span className={cn(
                    "text-xs",
                    isOverBudget ? "text-destructive" : "text-emerald-500"
                  )}>
                    ({isOverBudget ? "+" : ""}{diffPercentage}%)
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  jämfört med uppskattad tid
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant={dateRange === 'previous' ? 'default' : 'outline'} 
                onClick={() => setDateRange('previous')}
              >
                Föregående vecka
              </Button>
              <Button 
                size="sm" 
                variant={dateRange === 'current' ? 'default' : 'outline'} 
                onClick={() => setDateRange('current')}
              >
                Aktuell vecka
              </Button>
            </div>

            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 5,
                    left: 0,
                    bottom: 5,
                  }}
                >
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="font-medium">Datum:</div>
                              <div>{format(new Date(data.fullDate), 'yyyy-MM-dd')}</div>
                              <div className="font-medium">Planerat:</div>
                              <div>{data.estimatedHours} tim</div>
                              <div className="font-medium">Faktiskt:</div>
                              <div>{data.actualHours} tim</div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="estimatedHours"
                    stroke="#8884d8"
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                    name="Uppskattade timmar"
                  />
                  <Line
                    type="monotone"
                    dataKey="actualHours"
                    stroke="#4ade80"
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                    name="Faktiska timmar"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1 text-xs">
                <div className="h-2 w-2 rounded-full bg-[#8884d8]" />
                <div>Uppskattade timmar</div>
              </div>
              <div className="flex items-center space-x-1 text-xs">
                <div className="h-2 w-2 rounded-full bg-[#4ade80]" />
                <div>Faktiska timmar</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Widget>
  );
}