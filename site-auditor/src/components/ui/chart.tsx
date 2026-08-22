'use client';

import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import { cn } from '@/lib/dashboard-utils';

export type ChartConfig = Record<
  string,
  { label?: React.ReactNode; icon?: React.ComponentType; color?: string }
>;

type ChartContextProps = { config: ChartConfig };
const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error('useChart must be used within a <ChartContainer />');
  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden flex aspect-video justify-center text-xs",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, cfg]) => cfg.color);
  if (!colorConfig.length) return null;
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[data-chart="${id}"]{${colorConfig.map(([key, cfg]) => `--color-${key}: ${cfg.color};`).join(' ')}}`,
      }}
    />
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  label,
  labelFormatter,
  formatter,
}: {
  active?: boolean;
  payload?: readonly any[];
  className?: string;
  indicator?: 'line' | 'dot' | 'dashed';
  hideLabel?: boolean;
  label?: React.ReactNode;
  labelFormatter?: (label: React.ReactNode, payload: readonly any[]) => React.ReactNode;
  formatter?: (value: any, name: any, item: any, index: number, payload: any) => React.ReactNode;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div className={cn('bg-background grid min-w-[8rem] gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl', className)}>
      {!hideLabel && (
        <div className="font-medium">{labelFormatter ? labelFormatter(label, payload) : label}</div>
      )}
      <div className="grid gap-1.5">
        {payload.map((item: any, i: number) => {
          const key = item.dataKey || item.name;
          const itemConfig = config[key as string];
          const color = item.color || itemConfig?.color;
          return (
            <div key={item.dataKey ?? i} className="flex w-full items-center gap-2">
              {formatter && item.value !== undefined ? (
                formatter(item.value, item.name, item, i, item.payload)
              ) : (
                <>
                  {!hideLabel &&
                    (indicator === 'dot' ? (
                      <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />
                    ) : (
                      <span
                        className={cn('shrink-0 rounded-[2px]', indicator === 'dashed' ? 'w-0 border-[1.5px] border-dashed' : 'h-full w-1')}
                        style={{ borderColor: color, backgroundColor: indicator === 'dashed' ? undefined : color }}
                      />
                    ))}
                  <div className="flex flex-1 justify-between leading-none">
                    <span className="text-muted-foreground">{itemConfig?.label || item.name}</span>
                    <span className="text-foreground font-mono font-medium tabular-nums">{item.value}</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({ payload }: { payload?: readonly any[] }) {
  const { config } = useChart();
  if (!payload?.length) return null;
  return (
    <div className="flex items-center justify-center gap-4 pt-3">
      {payload.map((item) => {
        const key = item.dataKey || item.value;
        const itemConfig = config[key as string];
        return (
          <div key={item.value} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
            {itemConfig?.label || item.value}
          </div>
        );
      })}
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent };
