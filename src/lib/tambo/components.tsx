import type { TamboComponent } from "@tambo-ai/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { z } from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminStatsSchema, type AdminStats } from "@/lib/tambo/schemas";

const ORDER_STATS_LABELS: Record<string, string> = {
  successfulOrders: "Delivered",
  failedOrders: "Failed",
  pendingOrders: "Pending",
  inDeliveryOrders: "In delivery",
  pausedOrders: "Paused",
  prepaidOrders: "Prepaid",
  unpaidOrders: "Unpaid",
  cardOrders: "Card",
  cashOrders: "Cash",
  dailyCustomers: "Daily clients",
  evenDayCustomers: "Even-day clients",
  oddDayCustomers: "Odd-day clients",
  specialPreferenceCustomers: "Special prefs",
  orders1200: "1200 kcal",
  orders1600: "1600 kcal",
  orders2000: "2000 kcal",
  orders2500: "2500 kcal",
  orders3000: "3000 kcal",
  singleItemOrders: "Single item",
  multiItemOrders: "Multi item",
};

const toneClassName = (tone?: string) => {
  if (tone === "success") return "text-emerald-600";
  if (tone === "warning") return "text-amber-600";
  if (tone === "danger") return "text-rose-600";
  return "text-foreground";
};

function orderStatsEntries(stats?: Partial<AdminStats> | null) {
  const entries: Array<[string, number | undefined]> = [];
  const safeStats = stats ?? {};

  for (const key of Object.keys(ORDER_STATS_LABELS)) {
    entries.push([key, safeStats[key as keyof AdminStats]]);
  }

  return entries;
}

function AdminStatsGrid({
  title,
  stats,
  highlightKeys,
}: {
  title?: string;
  stats?: Partial<AdminStats> | null;
  highlightKeys?: string[];
}) {
  const highlight = new Set(highlightKeys ?? []);
  const entries = orderStatsEntries(stats);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {title ?? "Admin statistics"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="rounded-md border bg-card px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-muted-foreground">
                  {ORDER_STATS_LABELS[key] ?? key}
                </span>
                {highlight.has(key) ? (
                  <Badge variant="secondary" className="shrink-0">
                    key
                  </Badge>
                ) : null}
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums">
                {value === undefined ? "..." : value}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickLinks({
  title,
  links,
}: {
  title?: string;
  links?: Array<{ label: string; href: string; description?: string }>;
}) {
  const safeLinks = links ?? [];

  if (safeLinks.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title ?? "Quick links"}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No links available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title ?? "Quick links"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {safeLinks.map((link) => (
          <Link
            key={`${link.href}:${link.label}`}
            href={link.href}
            className="block rounded-md border bg-card px-3 py-2 hover:bg-accent"
          >
            <div className="font-medium">{link.label}</div>
            {link.description ? (
              <div className="text-xs text-muted-foreground">
                {link.description}
              </div>
            ) : null}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function SiteMetricGrid({
  title,
  subtitle,
  metrics,
}: {
  title?: string;
  subtitle?: string;
  metrics?: Array<{
    label: string;
    value: string;
    delta?: string;
    tone?: "neutral" | "success" | "warning" | "danger";
  }>;
}) {
  const safeMetrics = metrics ?? [];

  if (safeMetrics.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title ?? "Metrics"}</CardTitle>
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No metrics available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title ?? "Metrics"}</CardTitle>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
          {safeMetrics.map((item, index) => (
            <div
              key={`${item.label}:${index}`}
              className="rounded-md border bg-card px-3 py-2"
            >
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`mt-1 text-lg font-semibold ${toneClassName(item.tone)}`}>
                {item.value}
              </p>
              {item.delta ? (
                <p className="text-xs text-muted-foreground">{item.delta}</p>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SiteDataTable({
  title,
  columns,
  rows,
  emptyText,
}: {
  title?: string;
  columns?: Array<{ key: string; label: string }>;
  rows?: Array<{
    id: string;
    cells: Array<{ key: string; value: string; tone?: "neutral" | "success" | "warning" | "danger" }>;
  }>;
  emptyText?: string;
}) {
  const safeColumns =
    columns?.filter(
      (col): col is { key: string; label: string } =>
        Boolean(
          col &&
            typeof col.key === "string" &&
            col.key.length > 0 &&
            typeof col.label === "string"
        )
    ) ?? [];
  const safeRows = useMemo(() => rows ?? [], [rows]);
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return safeRows;
    return safeRows.filter((row) => {
      const rowCells = Array.isArray(row.cells) ? row.cells : [];
      return rowCells.some((cell) => {
        const rawValue =
          cell?.value === undefined || cell?.value === null ? "" : String(cell.value);
        return rawValue.toLowerCase().includes(normalizedQuery);
      });
    });
  }, [query, safeRows]);

  if (safeColumns.length === 0 || safeRows.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title ?? "Data table"}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {emptyText ?? "No data"}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title ?? "Data table"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search rows..."
            className="h-8 w-full rounded-md border bg-background px-2 text-sm"
          />
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {filteredRows.length} rows
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left">
                {safeColumns.map((col) => (
                  <th key={col.key} className="px-2 py-2 font-medium text-muted-foreground">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, rowIndex) => (
                <tr
                  key={typeof row.id === "string" ? row.id : `row-${rowIndex}`}
                  className="border-b last:border-0"
                >
                  {safeColumns.map((col) => {
                    const rowCells = Array.isArray(row.cells) ? row.cells : [];
                    const cell = rowCells.find((value) => value?.key === col.key);
                    const cellValue =
                      typeof cell?.value === "string"
                        ? cell.value
                        : cell?.value === undefined || cell?.value === null
                          ? "-"
                          : String(cell.value);
                    return (
                      <td
                        key={`${typeof row.id === "string" ? row.id : `row-${rowIndex}`}:${col.key}`}
                        className={`px-2 py-2 ${toneClassName(cell?.tone)}`}
                      >
                        {cellValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SiteEntityCards({
  title,
  items,
}: {
  title?: string;
  items?: Array<{
    title: string;
    subtitle?: string;
    meta?: string;
    status?: "active" | "paused" | "pending" | "failed";
    href?: string;
  }>;
}) {
  const safeItems = items ?? [];

  if (safeItems.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title ?? "Entities"}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No entities available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title ?? "Entities"}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {safeItems.map((item, index) => {
          const statusTone =
            item.status === "active"
              ? "success"
              : item.status === "pending"
                ? "warning"
                : item.status === "failed"
                  ? "danger"
                  : "neutral";

          const content = (
            <div className="rounded-md border bg-card px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{item.title}</p>
                {item.status ? (
                  <span className={`text-xs ${toneClassName(statusTone)}`}>
                    {item.status}
                  </span>
                ) : null}
              </div>
              {item.subtitle ? (
                <p className="text-xs text-muted-foreground">{item.subtitle}</p>
              ) : null}
              {item.meta ? <p className="mt-1 text-sm">{item.meta}</p> : null}
            </div>
          );

          if (item.href) {
            return (
              <Link key={`${item.title}:${index}`} href={item.href} className="block">
                {content}
              </Link>
            );
          }

          return <div key={`${item.title}:${index}`}>{content}</div>;
        })}
      </CardContent>
    </Card>
  );
}

function SiteJsonPanel({
  title,
  json,
}: {
  title?: string;
  json?: string;
}) {
  const safeJson = json && json.trim().length > 0 ? json : "{}";

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title ?? "JSON data"}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="max-h-[480px] overflow-auto rounded-md border bg-muted p-3 text-xs leading-relaxed">
          {safeJson}
        </pre>
      </CardContent>
    </Card>
  );
}

function SiteBarChart({
  title,
  subtitle,
  bars,
}: {
  title?: string;
  subtitle?: string;
  bars?: Array<{
    label: string;
    value: number;
    tone?: "neutral" | "success" | "warning" | "danger";
  }>;
}) {
  const safeBars = bars ?? [];
  const maxValue =
    safeBars.length > 0
      ? Math.max(...safeBars.map((item) => Math.max(0, item.value)))
      : 0;

  if (safeBars.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title ?? "Chart"}</CardTitle>
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No chart data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title ?? "Chart"}</CardTitle>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {safeBars.map((bar, index) => {
          const percentage =
            maxValue > 0 ? Math.min(100, Math.round((Math.max(0, bar.value) / maxValue) * 100)) : 0;
          return (
            <div key={`${bar.label}:${index}`} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-muted-foreground">{bar.label}</span>
                <span className={`font-medium ${toneClassName(bar.tone)}`}>{bar.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-muted">
                <div
                  className={`h-full rounded ${bar.tone === "success"
                    ? "bg-emerald-500"
                    : bar.tone === "warning"
                      ? "bg-amber-500"
                      : bar.tone === "danger"
                        ? "bg-rose-500"
                        : "bg-primary"
                    }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

const metricItemSchema = z.object({
  label: z.string(),
  value: z.string(),
  delta: z.string().optional(),
  tone: z.enum(["neutral", "success", "warning", "danger"]).optional(),
});

const chartBarSchema = z.object({
  label: z.string(),
  value: z.number(),
  tone: z.enum(["neutral", "success", "warning", "danger"]).optional(),
});

const tableColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
});

const tableCellSchema = z.object({
  key: z.string(),
  value: z.string(),
  tone: z.enum(["neutral", "success", "warning", "danger"]).optional(),
});

const tableRowSchema = z.object({
  id: z.string(),
  cells: z.array(tableCellSchema),
});

const entityCardSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  meta: z.string().optional(),
  status: z.enum(["active", "paused", "pending", "failed"]).optional(),
  href: z.string().optional(),
});

export const tamboComponents: TamboComponent[] = [
  {
    name: "AdminStatsGrid",
    description:
      "Shows AutoFood order and customer statistics in a compact grid.",
    component: AdminStatsGrid,
    propsSchema: z.object({
      title: z.string().optional(),
      stats: adminStatsSchema.partial().optional().describe("Admin statistics object."),
      highlightKeys: z.array(z.string()).optional(),
    }),
  },
  {
    name: "QuickLinks",
    description:
      "Renders navigation shortcuts for current admin workflows.",
    component: QuickLinks,
    propsSchema: z.object({
      title: z.string().optional(),
      links: z
        .array(
          z.object({
            label: z.string(),
            href: z.string(),
            description: z.string().optional(),
          })
        )
        .optional(),
    }),
  },
  {
    name: "SiteMetricGrid",
    description:
      "Renders KPI cards for dashboard-style metrics like orders, revenue, users.",
    component: SiteMetricGrid,
    propsSchema: z.object({
      title: z.string().optional(),
      subtitle: z.string().optional(),
      metrics: z.array(metricItemSchema).optional(),
    }),
  },
  {
    name: "SiteDataTable",
    description:
      "Renders tabular data (orders, clients, couriers, transactions).",
    component: SiteDataTable,
    propsSchema: z.object({
      title: z.string().optional(),
      columns: z.array(tableColumnSchema).optional(),
      rows: z.array(tableRowSchema).optional(),
      emptyText: z.string().optional(),
    }),
  },
  {
    name: "SiteEntityCards",
    description:
      "Renders entity cards for clients/orders/couriers/sites with optional status and link.",
    component: SiteEntityCards,
    propsSchema: z.object({
      title: z.string().optional(),
      items: z.array(entityCardSchema).optional(),
    }),
  },
  {
    name: "SiteBarChart",
    description:
      "Renders a simple bar chart for comparisons like orders per courier/status/day.",
    component: SiteBarChart,
    propsSchema: z.object({
      title: z.string().optional(),
      subtitle: z.string().optional(),
      bars: z.array(chartBarSchema).optional(),
    }),
  },
  {
    name: "SiteJsonPanel",
    description:
      "Displays pretty JSON text when raw API payload should be shown directly.",
    component: SiteJsonPanel,
    propsSchema: z.object({
      title: z.string().optional(),
      json: z.string().optional(),
    }),
  },
];
