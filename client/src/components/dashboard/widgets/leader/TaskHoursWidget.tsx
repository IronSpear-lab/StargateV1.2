import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { 
  format, startOfWeek, endOfWeek, subWeeks, addWeeks, 
  startOfMonth, endOfMonth, subMonths, addMonths, 
  eachDayOfInterval, isSameDay
} from "date-fns";
import { sv } from "date-fns/locale";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronLeft, ChevronRight, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Widget, WidthType, HeightType } from "../../Widget";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface TaskHoursWidgetProps {
  id?: string;
  projectId: number;
  type?: string;
  title?: string;
  onRemove?: (id: string) => void;
  className?: string;
  width?: WidthType;
  height?: HeightType;
}

interface TaskHoursDataPoint {
  date: string;
  estimatedHours: number;
  actualHours: number;
}

// Tidsperiodtyper och navigeringslogik
type ViewMode = 'week' | 'month';

export function TaskHoursWidget({ 
  id = 'task-hours', 
  projectId, 
  type = 'task-hours', 
  title = 'TIMFÖRBRUKNING', 
  onRemove,
  className,
  width,
  height
}: TaskHoursWidgetProps) {
  // Tidsperiod inställningar
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  
  // Hämta data för uppskattade timmar vs faktiska timmar per dag
  const { data: taskHoursData, isLoading } = useQuery<TaskHoursDataPoint[]>({
    queryKey: ['/api/projects', projectId, 'task-hours', viewMode, currentOffset],
    enabled: !!projectId
  });

  // Beräkna tidsintervall baserat på aktuell vy och offset
  const currentDate = new Date();
  
  // Beräkna datumintervall baserat på vald vy
  let activeStartDate: Date;
  let activeEndDate: Date;
  
  if (viewMode === 'week') {
    const baseStart = startOfWeek(currentDate, { locale: sv });
    const baseEnd = endOfWeek(currentDate, { locale: sv });
    
    if (currentOffset < 0) {
      // Tidigare veckor
      activeStartDate = subWeeks(baseStart, Math.abs(currentOffset));
      activeEndDate = subWeeks(baseEnd, Math.abs(currentOffset));
    } else if (currentOffset > 0) {
      // Kommande veckor
      activeStartDate = addWeeks(baseStart, currentOffset);
      activeEndDate = addWeeks(baseEnd, currentOffset);
    } else {
      // Nuvarande vecka
      activeStartDate = baseStart;
      activeEndDate = baseEnd;
    }
  } else {
    // Månadsvy
    const baseStart = startOfMonth(currentDate);
    const baseEnd = endOfMonth(currentDate);
    
    if (currentOffset < 0) {
      // Tidigare månader
      activeStartDate = subMonths(baseStart, Math.abs(currentOffset));
      activeEndDate = endOfMonth(subMonths(baseEnd, Math.abs(currentOffset)));
    } else if (currentOffset > 0) {
      // Kommande månader
      activeStartDate = addMonths(baseStart, currentOffset);
      activeEndDate = endOfMonth(addMonths(baseEnd, currentOffset));
    } else {
      // Nuvarande månad
      activeStartDate = baseStart;
      activeEndDate = baseEnd;
    }
  }

  // Formatera data för grafen
  const days = eachDayOfInterval({ start: activeStartDate, end: activeEndDate });
  
  // Formatera API-data eller skapa tomma data om det saknas
  const chartData = days.map(day => {
    const formattedDay = format(day, 'yyyy-MM-dd');
    const dayData = taskHoursData?.find((d) => d.date === formattedDay) || {
      date: formattedDay,
      estimatedHours: 0,
      actualHours: 0
    };
    
    return {
      name: viewMode === 'week' ? format(day, 'EEE', { locale: sv }) : format(day, 'd', { locale: sv }),
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

  // Formatera perioden för visning i UI
  const getFormattedPeriod = () => {
    if (viewMode === 'week') {
      return `${format(activeStartDate, 'd MMM', { locale: sv })} - ${format(activeEndDate, 'd MMM', { locale: sv })}`;
    } else {
      return format(activeStartDate, 'MMMM yyyy', { locale: sv });
    }
  };

  // Navigera mellan tidsperioder
  const navigatePrevious = () => setCurrentOffset(currentOffset - 1);
  const navigateNext = () => setCurrentOffset(currentOffset + 1);
  const navigateToday = () => setCurrentOffset(0);

  // Navigeringskontroller
  const renderControls = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as ViewMode)}>
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
      <div className="text-center text-sm font-medium">{getFormattedPeriod()}</div>
    </div>
  );

  // Huvudsakligt innehåll för widgeten
  const renderContent = () => (
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

      {renderControls()}

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
  );

  // I projektledardashboarden ska inte Widget-komponenten användas här,
  // eftersom den redan wrappar denna komponent i renderWidget-funktionen
  if (width && height) {
    // Innehåll för widgeten när den används i dashboarden  
    return renderContent();
  } else {
    // Om komponenten används fristående utan width och height, returnera
    // Widget-komponenten för att ge korrekt styling och layout
    return (
      <Widget 
        id={id}
        title={title}
        type={type}
        onRemove={onRemove || (() => {})}
        className={className}
        width="half"
        height="medium"
      >
        {renderContent()}
      </Widget>
    );
  }
}