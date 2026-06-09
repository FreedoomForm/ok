import { z } from "zod";
import { adminStatsSchema } from "@/lib/tambo/schemas";
import { registerTamboTool } from "@/lib/tambo/tool-guard";
import { SITE_ENDPOINT_CATALOG as GENERATED_SITE_ENDPOINT_CATALOG } from "@/lib/tambo/api-catalog.generated";

function getOptionalBearerToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

const queryParamSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

const apiMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);

const fileFormatSchema = z.enum(["csv", "json", "txt", "html", "pdf", "xlsx", "xml", "md"]);
const websiteEditModeSchema = z.enum(["full_rebuild", "merge_existing", "section_patch"]);
const websiteSectionSchema = z.enum(["hero", "features", "pricing", "about"]);
const uiLayoutSchema = z.enum([
  "auto",
  "table_first",
  "overview",
  "cards_first",
  "chart_focus",
]);
const uiComponentNameSchema = z.enum([
  "AdminStatsGrid",
  "SiteMetricGrid",
  "SiteDataTable",
  "SiteEntityCards",
  "SiteBarChart",
  "QuickLinks",
  "SiteJsonPanel",
]);

const siteApiResponseSchema = z.object({
  ok: z.boolean(),
  method: apiMethodSchema,
  path: z.string(),
  status: z.number(),
  contentType: z.string().optional(),
  json: z.unknown().optional(),
  body: z.string().optional(),
  error: z.string().optional(),
});

const siteApiRequestInputSchema = z
  .object({
    method: apiMethodSchema.optional(),
    path: z.string().optional(),
    queryParams: z.array(queryParamSchema).max(50).optional(),
    jsonBody: z.string().optional(),
  })
  .strict();

const fileExportInputSchema = z
  .object({
    fileName: z.string().min(1).max(100),
    format: fileFormatSchema,
    sourcePath: z.string().optional(),
    inlineDataJson: z.string().max(300000).optional(),
    method: apiMethodSchema.optional(),
    queryParams: z.array(queryParamSchema).max(50).optional(),
    jsonBody: z.string().optional(),
    flattenNested: z.boolean().optional(),
    rowLimit: z.number().int().min(1).max(20000).optional(),
    instructions: z.string().max(4000).optional(),
  })
  .strict();

const fileExportOutputSchema = z.object({
  ok: z.boolean(),
  fileName: z.string(),
  format: fileFormatSchema,
  downloadUrl: z.string().optional(),
  sizeBytes: z.number().optional(),
  note: z.string().optional(),
  error: z.string().optional(),
});

const websiteEditInputSchema = z
  .object({
    prompt: z.string().min(10).max(4000).optional(),
    apply: z.boolean().optional(),
    mode: websiteEditModeSchema.optional(),
    sections: z.array(websiteSectionSchema).max(4).optional(),
    siteName: z.string().min(2).max(80).optional(),
    styleVariant: z.string().min(2).max(60).optional(),
    subdomain: z.string().min(3).max(40).optional(),
    autoResolveSubdomain: z.boolean().optional(),
    dryRun: z.boolean().optional(),
    includeContentPreview: z.boolean().optional(),
    targetAdminId: z.string().optional(),
    // Explicitly allow known execution metadata keys.
    status: z.string().optional(),
    completion: z.union([z.string(), z.number(), z.boolean()]).optional(),
  })
  .strip();

const websiteEditOutputSchema = z.object({
  ok: z.boolean(),
  applied: z.boolean(),
  mode: websiteEditModeSchema.optional(),
  updatedSections: z.array(websiteSectionSchema).optional(),
  requestedSubdomain: z.string().optional(),
  subdomainAdjusted: z.boolean().optional(),
  subdomain: z.string().optional(),
  pathUrl: z.string().optional(),
  hostUrl: z.string().optional(),
  renderPages: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
      })
    )
    .optional(),
  message: z.string(),
  error: z.string().optional(),
});

const interactiveUiInputSchema = z
  .object({
    goal: z.string().min(10).max(4000),
    sourcePath: z.string().optional(),
    method: apiMethodSchema.optional(),
    queryParams: z.array(queryParamSchema).max(50).optional(),
    jsonBody: z.string().optional(),
    preferredComponents: z.array(uiComponentNameSchema).max(7).optional(),
    maxRows: z.number().int().min(5).max(200).optional(),
    maxComponents: z.number().int().min(1).max(7).optional(),
    includeRawJson: z.boolean().optional(),
    layout: uiLayoutSchema.optional(),
    title: z.string().min(2).max(120).optional(),
  })
  .strict();

const interactiveUiOutputSchema = z.object({
  ok: z.boolean(),
  title: z.string(),
  summary: z.string(),
  strategy: z.string().optional(),
  sourcePath: z.string().optional(),
  components: z.array(
    z.object({
      name: uiComponentNameSchema,
      reason: z.string(),
      props: z.record(z.string(), z.unknown()),
    })
  ),
  dataSample: z.string().optional(),
  error: z.string().optional(),
});

const siteApiCatalogSchema = z.object({
  title: z.string(),
  endpoints: z.array(
    z.object({
      path: z.string(),
      methods: z.array(apiMethodSchema),
      description: z.string(),
    })
  ),
});

const siteUiCatalogSchema = z.object({
  title: z.string(),
  notes: z.array(z.string()).optional(),
  components: z.array(
    z.object({
      name: z.string(),
      purpose: z.string(),
    })
  ),
});

const SITE_ENDPOINT_CATALOG: Array<{
  path: string;
  methods: Array<z.infer<typeof apiMethodSchema>>;
  description: string;
}> = GENERATED_SITE_ENDPOINT_CATALOG.map((endpoint) => ({
  path: endpoint.path,
  methods: [...endpoint.methods] as Array<z.infer<typeof apiMethodSchema>>,
  description: endpoint.description,
}));

function buildRelativeApiUrl(
  path: string,
  queryParams?: Array<z.infer<typeof queryParamSchema>>
) {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/api/")) {
    throw new Error("Path must start with /api/.");
  }
  if (trimmed.includes("://") || trimmed.startsWith("//") || trimmed.includes("..")) {
    throw new Error("Only safe relative API paths are allowed.");
  }
  const url = new URL(trimmed, window.location.origin);
  for (const param of queryParams ?? []) {
    url.searchParams.append(param.key, param.value);
  }
  return `${url.pathname}${url.search}`;
}

function truncateForModel(text: string, max = 12000) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n...[truncated]`;
}

function normalizeFileName(name: string, extension: string) {
  const clean = name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);

  const base = clean.length > 0 ? clean : `export-${Date.now()}`;
  if (base.toLowerCase().endsWith(`.${extension.toLowerCase()}`)) {
    return base;
  }
  return `${base}.${extension}`;
}

function csvEscape(value: unknown): string {
  const raw = value == null ? "" : String(value);
  if (!/[",\n]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

function valueForStructuredExport(value: unknown): string | number | boolean {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function flattenRecord(
  input: Record<string, unknown>,
  options?: { maxDepth?: number }
): Record<string, unknown> {
  const maxDepth = options?.maxDepth ?? 4;
  const output: Record<string, unknown> = {};

  const visit = (value: unknown, keyPath: string, depth: number) => {
    if (!keyPath) return;

    if (value == null) {
      output[keyPath] = "";
      return;
    }

    if (depth >= maxDepth) {
      output[keyPath] = valueForStructuredExport(value);
      return;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        output[keyPath] = "";
        return;
      }

      const allPrimitive = value.every(
        (item) =>
          item == null ||
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean"
      );

      if (allPrimitive) {
        output[keyPath] = value.map((item) => valueForStructuredExport(item)).join(" | ");
        return;
      }

      value.forEach((item, index) => {
        visit(item, `${keyPath}[${index}]`, depth + 1);
      });
      return;
    }

    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) {
        output[keyPath] = "";
        return;
      }

      entries.forEach(([childKey, childValue]) => {
        visit(childValue, `${keyPath}.${childKey}`, depth + 1);
      });
      return;
    }

    output[keyPath] = valueForStructuredExport(value);
  };

  Object.entries(input).forEach(([key, value]) => {
    visit(value, key, 0);
  });

  return output;
}

function applyExportRowLimit(payload: unknown, rowLimit?: number): unknown {
  if (!rowLimit || rowLimit < 1) return payload;

  if (Array.isArray(payload)) {
    return payload.slice(0, rowLimit);
  }

  if (!isRecord(payload)) return payload;

  const next: Record<string, unknown> = { ...payload };
  const listKeys = ["items", "rows", "data", "results", "orders", "customers", "couriers", "list"];
  for (const key of listKeys) {
    const value = next[key];
    if (Array.isArray(value)) {
      next[key] = value.slice(0, rowLimit);
      break;
    }
  }
  return next;
}

function applyExportFlattening(payload: unknown, flattenNested?: boolean): unknown {
  if (!flattenNested) return payload;

  if (Array.isArray(payload)) {
    const rows = payload.filter((item) => isRecord(item)) as Array<Record<string, unknown>>;
    if (rows.length === payload.length) {
      return rows.map((row) => flattenRecord(row));
    }
    return payload.map((item) => valueForStructuredExport(item));
  }

  if (!isRecord(payload)) return payload;

  const primaryArray = getNestedByKey(payload, [
    "items",
    "rows",
    "data",
    "results",
    "orders",
    "customers",
    "couriers",
    "records",
    "list",
  ]);

  if (Array.isArray(primaryArray)) {
    const rows = primaryArray.filter((item) => isRecord(item)) as Array<Record<string, unknown>>;
    if (rows.length === primaryArray.length && rows.length > 0) {
      return rows.map((row) => flattenRecord(row));
    }
  }

  return flattenRecord(payload);
}

function jsonToCsv(
  data: unknown,
  options?: {
    flattenNested?: boolean;
    rowLimit?: number;
  }
): string {
  const prepared = applyExportFlattening(applyExportRowLimit(data, options?.rowLimit), options?.flattenNested);

  if (!Array.isArray(prepared)) {
    if (prepared && typeof prepared === "object") {
      return "key,value\n" + Object.entries(prepared as Record<string, unknown>)
        .map(([key, value]) => `${csvEscape(key)},${csvEscape(valueForStructuredExport(value))}`)
        .join("\n");
    }
    return `value\n${csvEscape(valueForStructuredExport(prepared))}`;
  }

  if (prepared.length === 0) return "empty\n";

  const objectRows = prepared.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as Array<Record<string, unknown>>;
  if (objectRows.length !== prepared.length) {
    return "value\n" + prepared.map((item) => csvEscape(valueForStructuredExport(item))).join("\n");
  }

  const headerSet = new Set<string>();
  objectRows.forEach((row) => {
    Object.keys(row).forEach((key) => headerSet.add(key));
  });
  const headers = Array.from(headerSet);

  const lines = [headers.map((header) => csvEscape(header)).join(",")];
  objectRows.forEach((row) => {
    lines.push(headers.map((header) => csvEscape(valueForStructuredExport(row[header]))).join(","));
  });

  return lines.join("\n");
}

function toTextSnapshot(payload: unknown, instructions?: string): string {
  const blocks: string[] = [];

  if (instructions && instructions.trim().length > 0) {
    blocks.push(`Instructions: ${instructions.trim()}`);
    blocks.push("");
  }

  if (typeof payload === "string") {
    blocks.push(payload);
  } else {
    blocks.push(JSON.stringify(payload ?? {}, null, 2));
  }

  return blocks.join("\n");
}

type UiComponentName = z.infer<typeof uiComponentNameSchema>;
type UiLayout = z.infer<typeof uiLayoutSchema>;
type UiTone = "neutral" | "success" | "warning" | "danger";
type UiEntityStatus = "active" | "paused" | "pending" | "failed";
type InteractiveComponent = z.infer<typeof interactiveUiOutputSchema>["components"][number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toDisplayString(value: unknown, max = 180): string {
  if (value == null) return "-";
  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized.length <= max) return normalized;
    return `${normalized.slice(0, max)}...`;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  try {
    const text = JSON.stringify(value);
    if (!text) return "-";
    if (text.length <= max) return text;
    return `${text.slice(0, max)}...`;
  } catch {
    return String(value);
  }
}

function toLabelFromKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function toneFromText(input: unknown): UiTone | undefined {
  if (typeof input !== "string") return undefined;
  const value = input.toLowerCase();
  if (/(delivered|success|active|paid|confirmed|done|online)/.test(value)) return "success";
  if (/(pending|cooking|processing|on[_\s-]?way|queued|draft)/.test(value)) return "warning";
  if (/(failed|cancelled|canceled|error|blocked|rejected|offline|unpaid)/.test(value)) return "danger";
  return undefined;
}

function entityStatusFromText(input: unknown): UiEntityStatus | undefined {
  if (typeof input !== "string") return undefined;
  const value = input.toLowerCase();
  if (/(active|available|delivered|success|online)/.test(value)) return "active";
  if (/(pending|cooking|processing|on[_\s-]?way|queued)/.test(value)) return "pending";
  if (/(paused|hold|inactive)/.test(value)) return "paused";
  if (/(failed|cancelled|canceled|error|offline|rejected)/.test(value)) return "failed";
  return undefined;
}

function inferUiLayout(goal: string, explicit?: UiLayout): UiLayout {
  if (explicit && explicit !== "auto") return explicit;
  const normalized = goal.toLowerCase();
  if (/(chart|compare|distribution|trend|analytics|graph)/.test(normalized)) {
    return "chart_focus";
  }
  if (/(table|list|rows|records|audit|logs|export)/.test(normalized)) {
    return "table_first";
  }
  if (/(card|tile|profile|catalog|directory)/.test(normalized)) {
    return "cards_first";
  }
  return "overview";
}

function componentPriorityFromLayout(layout: UiLayout): UiComponentName[] {
  if (layout === "table_first") {
    return [
      "SiteDataTable",
      "SiteMetricGrid",
      "SiteBarChart",
      "SiteEntityCards",
      "QuickLinks",
      "SiteJsonPanel",
    ];
  }
  if (layout === "cards_first") {
    return [
      "SiteEntityCards",
      "SiteMetricGrid",
      "SiteDataTable",
      "SiteBarChart",
      "QuickLinks",
      "SiteJsonPanel",
    ];
  }
  if (layout === "chart_focus") {
    return [
      "SiteBarChart",
      "SiteMetricGrid",
      "SiteDataTable",
      "SiteEntityCards",
      "QuickLinks",
      "SiteJsonPanel",
    ];
  }
  return [
    "SiteMetricGrid",
    "SiteDataTable",
    "SiteEntityCards",
    "SiteBarChart",
    "QuickLinks",
    "SiteJsonPanel",
  ];
}

function componentHintsFromGoal(goal: string): UiComponentName[] {
  const normalized = goal.toLowerCase();
  const hints = new Set<UiComponentName>();
  if (/(stat|kpi|summary|performance|total)/.test(normalized)) hints.add("SiteMetricGrid");
  if (/(table|rows|record|list|filter|search|audit|history)/.test(normalized)) {
    hints.add("SiteDataTable");
  }
  if (/(card|entity|profile|directory|client list|customer list)/.test(normalized)) {
    hints.add("SiteEntityCards");
  }
  if (/(chart|graph|compare|distribution|trend)/.test(normalized)) {
    hints.add("SiteBarChart");
  }
  if (/(debug|raw|json|payload|inspect)/.test(normalized)) {
    hints.add("SiteJsonPanel");
  }
  return Array.from(hints);
}

function stringifyJson(value: unknown, max = 10000): string {
  try {
    return truncateForModel(JSON.stringify(value ?? {}, null, 2), max);
  } catch {
    return truncateForModel(String(value ?? ""), max);
  }
}

function getNestedByKey(payload: unknown, keys: string[]): unknown {
  if (!isRecord(payload)) return undefined;
  for (const key of keys) {
    if (key in payload) return payload[key];
  }
  return undefined;
}

function pickPrimaryCollection(payload: unknown): Array<Record<string, unknown>> | null {
  const findRecordArrayDeep = (
    value: unknown,
    depth = 0
  ): Array<Record<string, unknown>> | null => {
    if (depth > 4 || value == null) return null;
    if (Array.isArray(value)) {
      const rows = value.filter((item) => isRecord(item)) as Array<Record<string, unknown>>;
      if (rows.length > 0) return rows;
      for (const item of value) {
        const nested = findRecordArrayDeep(item, depth + 1);
        if (nested) return nested;
      }
      return null;
    }

    if (!isRecord(value)) return null;
    for (const nestedValue of Object.values(value)) {
      const nested = findRecordArrayDeep(nestedValue, depth + 1);
      if (nested) return nested;
    }
    return null;
  };

  if (Array.isArray(payload)) {
    const rows = payload.filter((item) => isRecord(item)) as Array<Record<string, unknown>>;
    if (rows.length > 0) return rows;
    return findRecordArrayDeep(payload, 1);
  }

  if (!isRecord(payload)) return null;

  const preferredCollection = getNestedByKey(payload, [
    "items",
    "rows",
    "data",
    "results",
    "orders",
    "customers",
    "admins",
    "couriers",
    "records",
    "list",
  ]);

  if (Array.isArray(preferredCollection)) {
    const rows = preferredCollection.filter((item) => isRecord(item)) as Array<Record<string, unknown>>;
    if (rows.length > 0) return rows;
  }

  if (Array.isArray(payload["tables"])) {
    const tableRows: Array<Record<string, unknown>> = [];
    for (const table of payload["tables"]) {
      if (!isRecord(table)) continue;
      const title = typeof table.title === "string" ? table.title : typeof table.id === "string" ? table.id : "Sheet";
      const rowCount = typeof table.rowCount === "number" ? table.rowCount : Array.isArray(table.rows) ? table.rows.length : 0;
      const columnCount =
        typeof table.columnCount === "number" ? table.columnCount : Array.isArray(table.columns) ? table.columns.length : 0;
      tableRows.push({ title, rowCount, columnCount });
    }
    if (tableRows.length > 0) return tableRows;
  }

  return findRecordArrayDeep(payload, 1);
}

function extractNumericMetrics(payload: unknown): Array<{ key: string; value: number }> {
  const entries: Array<{ key: string; value: number }> = [];
  if (!isRecord(payload)) return entries;

  const statsCandidate = getNestedByKey(payload, ["stats", "statistics", "summary", "metrics", "totals"]);
  const record = isRecord(statsCandidate) ? statsCandidate : payload;

  for (const [key, raw] of Object.entries(record)) {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      entries.push({ key, value: raw });
    }
  }

  return entries;
}

function buildAdminStatsComponent(
  payload: unknown,
  title: string
): InteractiveComponent | null {
  if (!isRecord(payload)) return null;
  const candidate = isRecord(payload["stats"]) ? payload["stats"] : payload;
  const parsed = adminStatsSchema.partial().safeParse(candidate);
  if (!parsed.success) return null;

  const hasValue = Object.values(parsed.data).some((value) => typeof value === "number");
  if (!hasValue) return null;

  return {
    name: "AdminStatsGrid",
    reason: "Payload includes admin order/customer statistics.",
    props: {
      title,
      stats: parsed.data,
    },
  };
}

function buildMetricGridComponent(
  payload: unknown,
  title: string
): InteractiveComponent | null {
  const metrics = extractNumericMetrics(payload)
    .slice(0, 12)
    .map((item) => ({
      label: toLabelFromKey(item.key),
      value: String(item.value),
      tone: toneFromText(item.key) ?? "neutral",
    }));

  if (metrics.length === 0) return null;

  return {
    name: "SiteMetricGrid",
    reason: "Numeric fields were converted into KPI cards.",
    props: {
      title,
      metrics,
    },
  };
}

function buildTableComponent(
  rows: Array<Record<string, unknown>>,
  title: string,
  maxRows: number
): InteractiveComponent | null {
  if (rows.length === 0) return null;

  const sample = rows.slice(0, maxRows);
  const keySet = new Set<string>();
  for (const row of sample) {
    Object.keys(row).forEach((key) => keySet.add(key));
  }
  const keys = Array.from(keySet).slice(0, 12);
  if (keys.length === 0) return null;

  const columns = keys.map((key) => ({
    key,
    label: toLabelFromKey(key),
  }));

  const tableRows = sample.map((row, index) => {
    const rowIdRaw = row.id;
    const rowId =
      typeof rowIdRaw === "string" && rowIdRaw.trim().length > 0
        ? rowIdRaw
        : `row-${index + 1}`;

    return {
      id: rowId,
      cells: keys.map((key) => {
        const value = row[key];
        const tone = /status|state|result|payment/i.test(key)
          ? toneFromText(value)
          : undefined;
        return {
          key,
          value: toDisplayString(value),
          ...(tone ? { tone } : {}),
        };
      }),
    };
  });

  return {
    name: "SiteDataTable",
    reason: "Primary collection was mapped to searchable table rows.",
    props: {
      title,
      columns,
      rows: tableRows,
      emptyText: "No data available.",
    },
  };
}

function buildEntityCardsComponent(
  rows: Array<Record<string, unknown>>,
  title: string,
  maxRows: number
): InteractiveComponent | null {
  if (rows.length === 0) return null;

  const items = rows.slice(0, Math.min(maxRows, 24)).map((row, index) => {
    const titleValue =
      row.name ??
      row.title ??
      row.fullName ??
      row.phone ??
      row.email ??
      row.id ??
      `Entity ${index + 1}`;
    const subtitleValue = row.subtitle ?? row.description ?? row.address ?? row.phone ?? row.email;
    const metaParts = [
      row.status ? `status: ${toDisplayString(row.status, 60)}` : "",
      row.createdAt ? `created: ${toDisplayString(row.createdAt, 60)}` : "",
      row.updatedAt ? `updated: ${toDisplayString(row.updatedAt, 60)}` : "",
    ].filter(Boolean);

    const status = entityStatusFromText(row.status ?? row.orderStatus ?? row.state);
    return {
      title: toDisplayString(titleValue, 100),
      ...(subtitleValue ? { subtitle: toDisplayString(subtitleValue, 100) } : {}),
      ...(metaParts.length > 0 ? { meta: metaParts.join(" | ") } : {}),
      ...(status ? { status } : {}),
    };
  });

  return {
    name: "SiteEntityCards",
    reason: "Collection items were condensed into card-friendly entities.",
    props: {
      title,
      items,
    },
  };
}

function buildStatusBarsFromRows(rows: Array<Record<string, unknown>>) {
  const statusBuckets = new Map<string, number>();
  for (const row of rows) {
    const raw = row.status ?? row.orderStatus ?? row.state;
    if (raw == null) continue;
    const label = toDisplayString(raw, 40);
    if (!label || label === "-") continue;
    statusBuckets.set(label, (statusBuckets.get(label) ?? 0) + 1);
  }

  return Array.from(statusBuckets.entries())
    .slice(0, 10)
    .map(([label, value]) => ({
      label,
      value,
      tone: toneFromText(label) ?? "neutral",
    }));
}

function normalizeDateBucket(value: unknown): string | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const input = value instanceof Date ? value.toISOString() : value;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    const shortMatch = String(input).match(/\b\d{4}-\d{2}-\d{2}\b/);
    return shortMatch ? shortMatch[0] : null;
  }
  return date.toISOString().slice(0, 10);
}

function buildDateBarsFromRows(rows: Array<Record<string, unknown>>) {
  const candidateDateKeys = [
    "createdAt",
    "updatedAt",
    "deliveryDate",
    "deliveryTime",
    "date",
    "day",
  ];
  const buckets = new Map<string, number>();

  for (const row of rows) {
    let bucket: string | null = null;
    for (const key of candidateDateKeys) {
      bucket = normalizeDateBucket(row[key]);
      if (bucket) break;
    }
    if (!bucket) continue;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-10)
    .map(([label, value]) => ({
      label,
      value,
      tone: "neutral" as const,
    }));
}

function buildNumericBarsFromRows(rows: Array<Record<string, unknown>>) {
  const totals = new Map<string, number>();

  for (const row of rows) {
    for (const [key, rawValue] of Object.entries(row)) {
      if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) continue;
      if (/(id|phone|zip|postal)/i.test(key)) continue;
      totals.set(key, (totals.get(key) ?? 0) + rawValue);
    }
  }

  return Array.from(totals.entries())
    .slice(0, 10)
    .map(([key, value]) => ({
      label: toLabelFromKey(key),
      value: Number(value.toFixed(2)),
      tone: toneFromText(key) ?? "neutral",
    }));
}

function buildChartComponent(
  payload: unknown,
  rows: Array<Record<string, unknown>> | null,
  title: string
): InteractiveComponent | null {
  const barsFromRows = rows ? buildStatusBarsFromRows(rows) : [];
  if (barsFromRows.length > 0) {
    return {
      name: "SiteBarChart",
      reason: "Status distribution from the primary collection.",
      props: {
        title,
        subtitle: "Grouped by status",
        bars: barsFromRows,
      },
    };
  }

  const dateBars = rows ? buildDateBarsFromRows(rows) : [];
  if (dateBars.length > 0) {
    return {
      name: "SiteBarChart",
      reason: "Rows were grouped by date to show volume trend.",
      props: {
        title,
        subtitle: "Grouped by day",
        bars: dateBars,
      },
    };
  }

  const numericRowBars = rows ? buildNumericBarsFromRows(rows) : [];
  if (numericRowBars.length > 0) {
    return {
      name: "SiteBarChart",
      reason: "Numeric fields from rows were aggregated for comparison.",
      props: {
        title,
        subtitle: "Aggregated numeric totals",
        bars: numericRowBars,
      },
    };
  }

  const numericBars = extractNumericMetrics(payload)
    .slice(0, 10)
    .map((item) => ({
      label: toLabelFromKey(item.key),
      value: item.value,
      tone: toneFromText(item.key) ?? "neutral",
    }));

  if (numericBars.length === 0) return null;

  return {
    name: "SiteBarChart",
    reason: "Numeric payload fields were visualized as bars.",
    props: {
      title,
      bars: numericBars,
    },
  };
}

function buildQuickLinksComponent(sourcePath: string): InteractiveComponent {
  return {
    name: "QuickLinks",
    reason: "Provides fast navigation back to relevant admin areas.",
    props: {
      title: "Quick links",
      links: [
        {
          label: "Database",
          href: "/middle-admin/database",
          description: "Open full database tables and exports.",
        },
        {
          label: "API source",
          href: sourcePath,
          description: "Inspect the data endpoint used for this view.",
        },
      ],
    },
  };
}

function buildMarkdownReport(
  title: string,
  payload: unknown,
  instructions?: string,
  options?: { flattenNested?: boolean; rowLimit?: number }
): string {
  const lines: string[] = [`# ${title}`];

  if (instructions && instructions.trim().length > 0) {
    lines.push("", "## Instructions", "", instructions.trim());
  }

  const prepared = applyExportFlattening(
    applyExportRowLimit(payload, options?.rowLimit),
    options?.flattenNested
  );

  if (Array.isArray(prepared)) {
    const objectRows = prepared.filter((item) => isRecord(item)) as Array<Record<string, unknown>>;
    if (objectRows.length === prepared.length && objectRows.length > 0) {
      const headers = Array.from(
        objectRows.reduce((set, row) => {
          Object.keys(row).forEach((key) => set.add(key));
          return set;
        }, new Set<string>())
      );
      lines.push("", "## Data");
      lines.push("", `| ${headers.join(" | ")} |`);
      lines.push(`| ${headers.map(() => "---").join(" | ")} |`);
      objectRows.forEach((row) => {
        const values = headers.map((header) =>
          String(valueForStructuredExport(row[header])).replace(/\|/g, "\\|").replace(/\n/g, " ")
        );
        lines.push(`| ${values.join(" | ")} |`);
      });
      return lines.join("\n");
    }

    lines.push("", "## Data", "", "```json", truncateForModel(JSON.stringify(prepared, null, 2), 20000), "```");
    return lines.join("\n");
  }

  if (isRecord(prepared)) {
    lines.push("", "## Data", "", "```json", truncateForModel(JSON.stringify(prepared, null, 2), 20000), "```");
    return lines.join("\n");
  }

  lines.push("", "## Data", "", String(valueForStructuredExport(prepared)));
  return lines.join("\n");
}

function buildHtmlReport(title: string, textContent: string): string {
  const escaped = textContent
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 24px; color: #111827; }
  h1 { font-size: 20px; margin: 0 0 12px; }
  pre { white-space: pre-wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; line-height: 1.45; }
</style>
</head>
<body>
  <h1>${title}</h1>
  <pre>${escaped}</pre>
</body>
</html>`;
}

function pdfEscapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function createSimplePdfBytes(text: string): ArrayBuffer {
  const encoder = new TextEncoder();
  const lines = text
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .split(/\r?\n/)
    .map((line) => line.slice(0, 110))
    .slice(0, 120);

  const streamParts = ["BT", "/F1 10 Tf", "14 TL", "72 800 Td"];
  lines.forEach((line, index) => {
    if (index > 0) streamParts.push("T*");
    streamParts.push(`(${pdfEscapeText(line)}) Tj`);
  });
  streamParts.push("ET");
  const stream = streamParts.join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${encoder.encode(stream).length} >> stream\n${stream}\nendstream endobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const objectText of objects) {
    offsets.push(pdf.length);
    pdf += `${objectText}\n`;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return encoder.encode(pdf).buffer as ArrayBuffer;
}

function escapeSpreadsheetXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function detectSpreadsheetCellType(value: string) {
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return "Number";
  return "String";
}

function buildSpreadsheetXml(
  title: string,
  data: unknown,
  options?: { flattenNested?: boolean; rowLimit?: number }
): string {
  const prepared = applyExportFlattening(
    applyExportRowLimit(data, options?.rowLimit),
    options?.flattenNested
  );
  const safeTitle = title.replace(/[\\/:?*\[\]]/g, " ").trim().slice(0, 31) || "Sheet1";

  const rows: string[][] = [];
  if (Array.isArray(prepared)) {
    const objectRows = prepared.filter(
      (item) => item && typeof item === "object" && !Array.isArray(item)
    ) as Array<Record<string, unknown>>;

    if (objectRows.length === prepared.length && objectRows.length > 0) {
      const headers = Array.from(
        objectRows.reduce((set, row) => {
          Object.keys(row).forEach((key) => set.add(key));
          return set;
        }, new Set<string>())
      );
      rows.push(headers);
      objectRows.forEach((row) => {
        rows.push(headers.map((header) => String(valueForStructuredExport(row[header]))));
      });
    } else {
      rows.push(["value"]);
      prepared.forEach((item) => rows.push([String(valueForStructuredExport(item))]));
    }
  } else if (prepared && typeof prepared === "object") {
    rows.push(["key", "value"]);
    Object.entries(prepared as Record<string, unknown>).forEach(([key, value]) => {
      rows.push([key, String(valueForStructuredExport(value))]);
    });
  } else {
    rows.push(["value"], [String(valueForStructuredExport(prepared))]);
  }

  const rowsXml = rows
    .map((row) => {
      const cellsXml = row
        .map((cell) => {
          const value = String(cell ?? "");
          return `<Cell><Data ss:Type="${detectSpreadsheetCellType(value)}">${escapeSpreadsheetXml(value)}</Data></Cell>`;
        })
        .join("");
      return `<Row>${cellsXml}</Row>`;
    })
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Worksheet ss:Name="${escapeSpreadsheetXml(safeTitle)}">
    <Table>
      ${rowsXml}
    </Table>
  </Worksheet>
</Workbook>`;
}

function sanitizeXlsxSheetName(name: string, usedNames: Set<string>) {
  const cleaned = name.replace(/[\\/:?*\[\]]/g, " ").trim() || "Sheet";
  const base = cleaned.slice(0, 31);
  let candidate = base;
  let counter = 2;

  while (usedNames.has(candidate)) {
    const suffix = ` ${counter}`;
    candidate = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
    counter += 1;
  }

  usedNames.add(candidate);
  return candidate;
}

const EXCEL_CELL_TEXT_LIMIT = 32767;

type XlsxOverflowCell = {
  sheet: string;
  row: number;
  column: string;
  part: number;
  value: string;
};

function splitExcelText(value: string, chunkSize = EXCEL_CELL_TEXT_LIMIT): string[] {
  if (value.length <= chunkSize) return [value];
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += chunkSize) {
    chunks.push(value.slice(index, index + chunkSize));
  }
  return chunks;
}

function normalizeXlsxCell(
  value: unknown,
  options?: {
    sheet: string;
    row: number;
    column: string;
    overflowRows: XlsxOverflowCell[];
  }
): string | number | boolean {
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") return value;

  let text: string;
  if (typeof value === "string") {
    text = value;
  } else if (value instanceof Date) {
    text = value.toISOString();
  } else {
    text = JSON.stringify(value);
  }

  if (text.length <= EXCEL_CELL_TEXT_LIMIT) return text;

  const chunks = splitExcelText(text, EXCEL_CELL_TEXT_LIMIT);
  if (options) {
    chunks.forEach((chunk, idx) => {
      options.overflowRows.push({
        sheet: options.sheet,
        row: options.row,
        column: options.column,
        part: idx + 1,
        value: chunk,
      });
    });
  }

  const marker = " ...[FULL_VALUE_IN_OVERFLOW_SHEET]";
  const previewLimit = Math.max(0, Math.min(1200, EXCEL_CELL_TEXT_LIMIT - marker.length));
  return `${text.slice(0, previewLimit)}${marker}`;
}

function buildXlsxWorkbookFromPayload(
  XLSX: typeof import("xlsx"),
  title: string,
  payload: unknown,
  options?: { flattenNested?: boolean; rowLimit?: number }
) {
  const preparedPayload = applyExportFlattening(
    applyExportRowLimit(payload, options?.rowLimit),
    options?.flattenNested
  );
  const workbook = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();
  const overflowRows: XlsxOverflowCell[] = [];
  const baseSheetName = title.trim().length > 0 ? title : "Data";
  const appendSheetFromAoa = (name: string, rows: Array<Array<string | number | boolean>>) => {
    const safeName = sanitizeXlsxSheetName(name, usedSheetNames);
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
  };
  const appendOverflowSheetIfNeeded = () => {
    if (overflowRows.length === 0) return;
    appendSheetFromAoa("Overflow", [
      ["Sheet", "Row", "Column", "Part", "Value"],
      ...overflowRows.map((entry) => [entry.sheet, entry.row, entry.column, entry.part, entry.value]),
    ]);
  };

  const snapshotLike =
    preparedPayload &&
    typeof preparedPayload === "object" &&
    Array.isArray((preparedPayload as { tables?: unknown[] }).tables);

  if (snapshotLike) {
    const snapshot = preparedPayload as {
      scope?: unknown;
      generatedAt?: unknown;
      summary?: unknown[];
      tables: unknown[];
    };

    const summaryRows: Array<Array<string | number | boolean>> = [
      ["Scope", normalizeXlsxCell(snapshot.scope)],
      ["Generated At", normalizeXlsxCell(snapshot.generatedAt)],
      [],
      ["Sheet", "Rows", "Columns", "Description"],
    ];

    for (const item of Array.isArray(snapshot.summary) ? snapshot.summary : []) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      summaryRows.push([
        normalizeXlsxCell(row.title),
        normalizeXlsxCell(row.rowCount),
        normalizeXlsxCell(row.columnCount),
        normalizeXlsxCell(row.description),
      ]);
    }

    for (const tableRaw of snapshot.tables) {
      if (!tableRaw || typeof tableRaw !== "object") continue;
      const table = tableRaw as {
        title?: unknown;
        id?: unknown;
        columns?: unknown[];
        rows?: unknown[];
      };
      const columns = Array.isArray(table.columns) ? table.columns.map((column) => String(column)) : [];
      const dataRows: Array<Array<string | number | boolean>> = Array.isArray(table.rows)
        ? table.rows.map((entry, entryIndex) => {
            if (columns.length === 0) return [normalizeXlsxCell(entry)];
            const record = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
            return columns.map((column) =>
              normalizeXlsxCell(record[column], {
                sheet: String(table.title ?? table.id ?? "Sheet"),
                row: entryIndex + 2,
                column,
                overflowRows,
              })
            );
          })
        : [];

      const tableRows = columns.length > 0 ? [columns, ...dataRows] : dataRows.length > 0 ? dataRows : [[""]];
      appendSheetFromAoa(String(table.title ?? table.id ?? "Sheet"), tableRows);
    }

    appendSheetFromAoa("Summary", summaryRows);

    appendOverflowSheetIfNeeded();
    return workbook;
  }

  if (Array.isArray(preparedPayload)) {
    const objectRows = preparedPayload.filter(
      (item) => item && typeof item === "object" && !Array.isArray(item)
    ) as Array<Record<string, unknown>>;

    if (objectRows.length === preparedPayload.length && objectRows.length > 0) {
      const headers = Array.from(
        objectRows.reduce((set, row) => {
          Object.keys(row).forEach((key) => set.add(key));
          return set;
        }, new Set<string>())
      );
      const rows: Array<Array<string | number | boolean>> = [
        headers,
        ...objectRows.map((row, rowIndex) =>
          headers.map((header) =>
            normalizeXlsxCell(row[header], {
              sheet: baseSheetName,
              row: rowIndex + 2,
              column: header,
              overflowRows,
            })
          )
        ),
      ];
      appendSheetFromAoa(baseSheetName, rows);
      appendOverflowSheetIfNeeded();
      return workbook;
    }

    appendSheetFromAoa(
      baseSheetName,
      [
        ["value"],
        ...preparedPayload.map((item, rowIndex) => [
          normalizeXlsxCell(item, {
            sheet: baseSheetName,
            row: rowIndex + 2,
            column: "value",
            overflowRows,
          }),
        ]),
      ]
    );
    appendOverflowSheetIfNeeded();
    return workbook;
  }

  if (preparedPayload && typeof preparedPayload === "object") {
    const entries = Object.entries(preparedPayload as Record<string, unknown>).map(([key, value]) => [
      key,
      normalizeXlsxCell(value, {
        sheet: baseSheetName,
        row: 2,
        column: key,
        overflowRows,
      }),
    ]);
    appendSheetFromAoa(baseSheetName, [["key", "value"], ...entries]);
    appendOverflowSheetIfNeeded();
    return workbook;
  }

  appendSheetFromAoa(
    baseSheetName,
    [[
      "value",
    ], [
      normalizeXlsxCell(preparedPayload, {
        sheet: baseSheetName,
        row: 2,
        column: "value",
        overflowRows,
      }),
    ]]
  );
  appendOverflowSheetIfNeeded();
  return workbook;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to encode file for download."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read generated file."));
    reader.readAsDataURL(blob);
  });
}

async function fetchApiPayload(options: {
  path: string;
  method: z.infer<typeof apiMethodSchema>;
  queryParams?: Array<z.infer<typeof queryParamSchema>>;
  jsonBody?: string;
}): Promise<unknown> {
  const requestPath = buildRelativeApiUrl(options.path, options.queryParams);
  const token = getOptionalBearerToken();

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let body: string | undefined;
  if (options.jsonBody && options.method !== "GET") {
    JSON.parse(options.jsonBody);
    headers["Content-Type"] = "application/json";
    body = options.jsonBody;
  }

  const response = await fetch(requestPath, {
    method: options.method,
    credentials: "include",
    headers,
    ...(body ? { body } : {}),
  });

  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text().catch(() => "");
  if (!response.ok) {
    throw new Error(`API source request failed (${response.status}) ${raw}`.trim());
  }

  if (contentType.includes("application/json")) {
    return raw ? JSON.parse(raw) : {};
  }

  return raw;
}

function parseUnknownJson(raw: string, label: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `${label} must be valid JSON. ${error instanceof Error ? error.message : ""}`.trim()
    );
  }
}

function inferSourcePathFromGoal(goal: string): string {
  const normalized = goal.toLowerCase();
  if (/(courier|delivery driver|map|route)/.test(normalized)) return "/api/admin/couriers";
  if (/(client|customer|lead|subscriber)/.test(normalized)) return "/api/admin/clients";
  if (/(finance|salary|transaction|revenue|money|cash|payment)/.test(normalized)) {
    return "/api/admin/finance/company";
  }
  if (/(order|kitchen|dispatch)/.test(normalized)) return "/api/admin/orders";
  if (/(feature|flag|toggle)/.test(normalized)) return "/api/admin/features";
  return "/api/admin/statistics";
}

export const getAdminStatisticsTool = registerTamboTool({
  name: "get_admin_statistics",
  title: "Admin statistics",
  description:
    "Fetch order/customer statistics for the currently signed-in AutoFood admin.",
  annotations: {
    tamboStreamableHint: true,
  },
  inputSchema: z.object({}),
  outputSchema: adminStatsSchema,
  defaultMessage: "Failed to fetch admin statistics.",
  tool: async () => {
    const token = getOptionalBearerToken();
    const response = await fetch("/api/admin/statistics", {
      method: "GET",
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Not authenticated. Please log in to the admin panel.");
      }

      const text = await response.text().catch(() => "");
      throw new Error(
        `Failed to fetch statistics (${response.status}). ${text}`.trim()
      );
    }

    const data: unknown = await response.json();
    const parsed = adminStatsSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error("Invalid statistics response format.");
    }

    return parsed.data;
  },
});

export const siteApiRequestTool = registerTamboTool({
  name: "site_api_request",
  title: "Site API request",
  description:
    "Call most site API routes. Supports GET/POST/PUT/PATCH/DELETE for relative /api/* paths.",
  annotations: {},
  inputSchema: siteApiRequestInputSchema,
  outputSchema: siteApiResponseSchema,
  defaultMessage: "Site API request failed.",
  tool: async (input) => {
    const rawInput =
      input && typeof input === "object"
        ? (input as Record<string, unknown>)
        : ({} as Record<string, unknown>);

    const safeMethod = apiMethodSchema.safeParse(rawInput.method).success
      ? (rawInput.method as z.infer<typeof apiMethodSchema>)
      : "GET";
    const rawPath = typeof rawInput.path === "string" ? rawInput.path : "";
    const safeQueryParams = Array.isArray(rawInput.queryParams)
      ? rawInput.queryParams
          .map((item) => queryParamSchema.safeParse(item))
          .filter((item) => item.success)
          .map((item) => item.data)
      : undefined;
    const jsonBody = typeof rawInput.jsonBody === "string" ? rawInput.jsonBody : undefined;

    if (!rawPath.trim()) {
      return {
        ok: false,
        method: safeMethod,
        path: "/api/invalid",
        status: 400,
        error:
          "Invalid site_api_request input. Required: method and path starting with /api/.",
      };
    }

    let requestPath = rawPath;
    try {
      requestPath = buildRelativeApiUrl(rawPath, safeQueryParams);
    } catch (error) {
      return {
        ok: false,
        method: safeMethod,
        path: rawPath,
        status: 400,
        error: error instanceof Error ? error.message : "Invalid API path.",
      };
    }

    const courierByIdMatch = requestPath.match(/^\/api\/admin\/couriers\/([^/?#]+)$/);
    let normalizedPath = requestPath;
    let normalizedJsonBody = jsonBody;

    if (courierByIdMatch) {
      if (safeMethod !== "PATCH") {
        return {
          ok: false,
          method: safeMethod,
          path: requestPath,
          status: 400,
          error:
            "Unsupported courier-by-id route. Use /api/admin/couriers. For updates, call PATCH /api/admin/couriers with courierId in JSON body.",
        };
      }

      normalizedPath = "/api/admin/couriers";

      let payload: Record<string, unknown> = {};
      if (jsonBody) {
        try {
          const parsedPayload: unknown = JSON.parse(jsonBody);
          if (
            parsedPayload &&
            typeof parsedPayload === "object" &&
            !Array.isArray(parsedPayload)
          ) {
            payload = parsedPayload as Record<string, unknown>;
          }
        } catch {
          return {
            ok: false,
            method: safeMethod,
            path: requestPath,
            status: 400,
            error: "jsonBody must be a valid JSON string.",
          };
        }
      }

      if (typeof payload.courierId !== "string" || payload.courierId.trim().length === 0) {
        payload.courierId = decodeURIComponent(courierByIdMatch[1]);
      }
      normalizedJsonBody = JSON.stringify(payload);
    }

    const token = getOptionalBearerToken();
    const headers: Record<string, string> = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    let body: string | undefined;
    if (normalizedJsonBody && safeMethod !== "GET") {
      try {
        JSON.parse(normalizedJsonBody);
      } catch {
        return {
          ok: false,
          method: safeMethod,
          path: normalizedPath,
          status: 400,
          error: "jsonBody must be a valid JSON string.",
        };
      }
      headers["Content-Type"] = "application/json";
      body = normalizedJsonBody;
    }

    let response: Response;
    try {
      response = await fetch(normalizedPath, {
        method: safeMethod,
        credentials: "include",
        headers,
        ...(body ? { body } : {}),
      });
    } catch (error) {
      return {
        ok: false,
        method: safeMethod,
        path: normalizedPath,
        status: 502,
        error:
          error instanceof Error
            ? `Network/request error: ${error.message}`
            : "Network/request error.",
      };
    }

    const contentType = response.headers.get("content-type") ?? undefined;
    const rawText = await response.text().catch(() => "");

    let parsedJson: unknown | undefined;
    if (rawText) {
      try {
        parsedJson = JSON.parse(rawText) as unknown;
      } catch {
        parsedJson = undefined;
      }
    }

    const normalizedBody =
      parsedJson !== undefined
        ? JSON.stringify(parsedJson, null, 2)
        : rawText;
    const safeBody = normalizedBody ? truncateForModel(normalizedBody) : undefined;

    return {
      ok: response.ok,
      method: safeMethod,
      path: normalizedPath,
      status: response.status,
      ...(contentType ? { contentType } : {}),
      ...(parsedJson !== undefined ? { json: parsedJson } : {}),
      ...(safeBody ? { body: safeBody } : {}),
      ...(!response.ok ? { error: `Request failed with status ${response.status}` } : {}),
    };
  },
});

export const createDatabaseFileTool = registerTamboTool({
  name: "create_database_file",
  title: "Create database file",
  description:
    "Create downloadable files (CSV, JSON, TXT, Markdown, HTML, PDF, XLSX, XML spreadsheet) from API data, inline JSON, and instructions.",
  annotations: {},
  inputSchema: fileExportInputSchema,
  outputSchema: fileExportOutputSchema,
  defaultMessage: "Failed to create file export.",
  tool: async (input) => {
    try {
      const safeInput = fileExportInputSchema.parse(input);
      const sourcePath = safeInput.sourcePath?.trim();
      const apiMethod = safeInput.method ?? "GET";
      const inlineDataJson = safeInput.inlineDataJson?.trim();
      const noteParts: string[] = [];

      let payload: unknown;

      if (inlineDataJson) {
        payload = parseUnknownJson(inlineDataJson, "inlineDataJson");
        if (sourcePath) {
          noteParts.push("inlineDataJson was used; sourcePath was ignored.");
        }
      } else if (sourcePath) {
        payload = await fetchApiPayload({
          path: sourcePath,
          method: apiMethod,
          queryParams: safeInput.queryParams,
          jsonBody: safeInput.jsonBody,
        });
      } else if (safeInput.jsonBody && safeInput.jsonBody.trim().length > 0) {
        payload = parseUnknownJson(safeInput.jsonBody, "jsonBody");
        noteParts.push("Generated file from jsonBody because sourcePath was not provided.");
      } else {
        payload = {
          note: "No sourcePath or inlineDataJson provided. File generated from instructions only.",
        };
      }

      const transformedPayload = applyExportFlattening(
        applyExportRowLimit(payload, safeInput.rowLimit),
        safeInput.flattenNested
      );
      const textSnapshot = toTextSnapshot(transformedPayload, safeInput.instructions);
      const requestedFormat = safeInput.format;

      let blob: Blob;
      let fileExtension = requestedFormat;
      let note = noteParts.join(" ");

      if (requestedFormat === "json") {
        blob = new Blob([JSON.stringify(transformedPayload, null, 2)], { type: "application/json;charset=utf-8;" });
      } else if (requestedFormat === "csv") {
        blob = new Blob(
          [jsonToCsv(payload, { flattenNested: safeInput.flattenNested, rowLimit: safeInput.rowLimit })],
          { type: "text/csv;charset=utf-8;" }
        );
      } else if (requestedFormat === "txt") {
        blob = new Blob([textSnapshot], { type: "text/plain;charset=utf-8;" });
      } else if (requestedFormat === "md") {
        blob = new Blob(
          [buildMarkdownReport(safeInput.fileName, payload, safeInput.instructions, {
            flattenNested: safeInput.flattenNested,
            rowLimit: safeInput.rowLimit,
          })],
          { type: "text/markdown;charset=utf-8;" }
        );
      } else if (requestedFormat === "html") {
        blob = new Blob([buildHtmlReport(safeInput.fileName, textSnapshot)], { type: "text/html;charset=utf-8;" });
      } else if (requestedFormat === "pdf") {
        blob = new Blob([createSimplePdfBytes(textSnapshot)], { type: "application/pdf" });
      } else if (requestedFormat === "xlsx") {
        try {
          const XLSX = await import("xlsx");
          const workbook = buildXlsxWorkbookFromPayload(XLSX, safeInput.fileName, payload, {
            flattenNested: safeInput.flattenNested,
            rowLimit: safeInput.rowLimit,
          });
          const fileArrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx", compression: true });
          blob = new Blob([fileArrayBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
        } catch (xlsxError) {
          fileExtension = "xml";
          note = `${note ? `${note} ` : ""}XLSX requested but native workbook generation failed. Generated Excel XML instead. Reason: ${xlsxError instanceof Error ? xlsxError.message : "Unknown error"}`.trim();
          blob = new Blob([buildSpreadsheetXml(safeInput.fileName, payload, {
            flattenNested: safeInput.flattenNested,
            rowLimit: safeInput.rowLimit,
          })], {
            type: "application/xml;charset=utf-8;",
          });
        }
      } else if (requestedFormat === "xml") {
        blob = new Blob([buildSpreadsheetXml(safeInput.fileName, payload, {
          flattenNested: safeInput.flattenNested,
          rowLimit: safeInput.rowLimit,
        })], {
          type: "application/xml;charset=utf-8;",
        });
      } else {
        fileExtension = "txt";
        note = `${note ? `${note} ` : ""}Unknown format requested. Generated TXT fallback.`.trim();
        blob = new Blob([textSnapshot], { type: "text/plain;charset=utf-8;" });
      }

      const fileName = normalizeFileName(safeInput.fileName, fileExtension);
      const downloadUrl = await blobToDataUrl(blob);

      return {
        ok: true,
        fileName,
        format: fileExtension as z.infer<typeof fileFormatSchema>,
        downloadUrl,
        sizeBytes: blob.size,
        ...(note ? { note } : {}),
      };
    } catch (error) {
      return {
        ok: false,
        fileName: "export-error.txt",
        format: "txt" as const,
        error: error instanceof Error ? error.message : "Failed to create export file.",
      };
    }
  },
});

function emptyComponentByName(name: UiComponentName, sourcePath: string): InteractiveComponent {
  if (name === "AdminStatsGrid") {
    return {
      name,
      reason: "Fallback component when source payload is empty.",
      props: { title: "Admin statistics", stats: {} },
    };
  }
  if (name === "SiteMetricGrid") {
    return {
      name,
      reason: "Fallback component when numeric metrics are unavailable.",
      props: { title: "Metrics", metrics: [] },
    };
  }
  if (name === "SiteDataTable") {
    return {
      name,
      reason: "Fallback component when no table rows were detected.",
      props: { title: "Data table", columns: [], rows: [], emptyText: "No data available." },
    };
  }
  if (name === "SiteEntityCards") {
    return {
      name,
      reason: "Fallback component when no entities were detected.",
      props: { title: "Entities", items: [] },
    };
  }
  if (name === "SiteBarChart") {
    return {
      name,
      reason: "Fallback component when chart values are unavailable.",
      props: { title: "Chart", bars: [] },
    };
  }
  if (name === "QuickLinks") {
    return buildQuickLinksComponent(sourcePath);
  }
  return {
    name: "SiteJsonPanel",
    reason: "Fallback raw JSON view.",
    props: { title: "Raw payload", json: "{}" },
  };
}

export const buildInteractiveUiTool = registerTamboTool({
  name: "build_interactive_ui",
  title: "Build interactive UI",
  description:
    "Convert live API payloads into ready-to-render Tambo component props using goal-aware layout heuristics.",
  annotations: {},
  inputSchema: interactiveUiInputSchema,
  outputSchema: interactiveUiOutputSchema,
  defaultMessage: "Failed to build interactive UI payload.",
  tool: async (input) => {
    try {
      const safeInput = interactiveUiInputSchema.parse(input);
      const goal = safeInput.goal.trim();
      const sourcePath = safeInput.sourcePath?.trim() || inferSourcePathFromGoal(goal);
      const method = safeInput.method ?? "GET";
      const maxRows = safeInput.maxRows ?? 40;
      const maxComponents = safeInput.maxComponents ?? 6;
      const includeRawJson = safeInput.includeRawJson !== false;
      const baseTitle = safeInput.title?.trim() || "Interactive data view";
      const explicitPreferred = new Set<UiComponentName>(safeInput.preferredComponents ?? []);
      const layout = inferUiLayout(goal, safeInput.layout);
      const hintedPreferred = componentHintsFromGoal(goal);
      const rankOrder = Array.from(
        new Set<UiComponentName>([
          ...(safeInput.preferredComponents ?? []),
          ...hintedPreferred,
          ...componentPriorityFromLayout(layout),
          "QuickLinks",
          ...(includeRawJson ? ["SiteJsonPanel" as const] : []),
        ])
      );
      const rankMap = new Map<UiComponentName, number>(
        rankOrder.map((name, index) => [name, index])
      );

      const payload = await fetchApiPayload({
        path: sourcePath,
        method,
        queryParams: safeInput.queryParams,
        jsonBody: safeInput.jsonBody,
      });

      const rows = pickPrimaryCollection(payload);
      const components: InteractiveComponent[] = [];

      const push = (component: InteractiveComponent | null) => {
        if (!component) return;
        if (explicitPreferred.size > 0 && !explicitPreferred.has(component.name)) return;
        if (components.some((existing) => existing.name === component.name)) return;
        components.push(component);
      };

      push(buildAdminStatsComponent(payload, baseTitle));
      push(buildMetricGridComponent(payload, baseTitle));
      if (rows) {
        push(buildTableComponent(rows, `${baseTitle} table`, maxRows));
        push(buildEntityCardsComponent(rows, `${baseTitle} entities`, maxRows));
      }
      push(buildChartComponent(payload, rows, `${baseTitle} chart`));
      push(buildQuickLinksComponent(sourcePath));
      if (includeRawJson) {
        push({
          name: "SiteJsonPanel",
          reason: "Raw payload panel for debug details and edge cases.",
          props: {
            title: `${baseTitle} JSON`,
            json: stringifyJson(payload, 12000),
          },
        });
      }

      if (components.length === 0) {
        const fallbackName =
          explicitPreferred.size > 0 ? Array.from(explicitPreferred)[0] : "SiteJsonPanel";
        components.push(emptyComponentByName(fallbackName, sourcePath));
      }

      const sortedComponents = components
        .slice()
        .sort(
          (a, b) =>
            (rankMap.get(a.name) ?? Number.MAX_SAFE_INTEGER) -
            (rankMap.get(b.name) ?? Number.MAX_SAFE_INTEGER)
        )
        .slice(0, maxComponents);

      const strategyParts = [
        `layout=${layout}`,
        safeInput.sourcePath ? `source=explicit:${sourcePath}` : `source=inferred:${sourcePath}`,
        `goal=${goal.slice(0, 80)}`,
      ];

      return {
        ok: true,
        title: baseTitle,
        summary: `Generated ${sortedComponents.length} component payload(s) from ${sourcePath}.`,
        strategy: strategyParts.join(" | "),
        sourcePath,
        components: sortedComponents,
        dataSample: stringifyJson(payload, 4500),
      };
    } catch (error) {
      const safeInput = interactiveUiInputSchema.safeParse(input);
      return {
        ok: false,
        title:
          safeInput.success && safeInput.data.title
            ? safeInput.data.title
            : "Interactive data view",
        summary: "Interactive UI build failed.",
        sourcePath:
          safeInput.success && safeInput.data.sourcePath
            ? safeInput.data.sourcePath
            : undefined,
        components: [],
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while preparing interactive UI payload.",
      };
    }
  },
});

export const editSubdomainWebsiteTool = registerTamboTool({
  name: "edit_subdomain_website",
  title: "Edit subdomain website",
  description:
    "Generate and apply full or section-level subdomain website updates with dry-run preview and optional auto subdomain conflict resolution.",
  annotations: {},
  inputSchema: websiteEditInputSchema,
  outputSchema: websiteEditOutputSchema,
  defaultMessage: "Failed to update subdomain website.",
  tool: async (input) => {
    const parsed = websiteEditInputSchema.safeParse(input);
    const payload: Partial<z.infer<typeof websiteEditInputSchema>> = parsed.success
      ? parsed.data
      : {};
    const rawInput =
      input && typeof input === "object"
        ? (input as Record<string, unknown>)
        : ({} as Record<string, unknown>);

    const modeAlias: Record<string, z.infer<typeof websiteEditModeSchema>> = {
      full: "full_rebuild",
      rebuild: "full_rebuild",
      "full-rebuild": "full_rebuild",
      merge: "merge_existing",
      patch: "section_patch",
      section: "section_patch",
      "section-patch": "section_patch",
    };

    const rawMode =
      (typeof payload.mode === "string" ? payload.mode : undefined) ??
      (typeof rawInput.mode === "string" ? rawInput.mode : undefined) ??
      (typeof rawInput.editMode === "string" ? rawInput.editMode : undefined);
    const normalizedMode = (() => {
      if (!rawMode) return undefined;
      const lower = rawMode.trim().toLowerCase();
      if (websiteEditModeSchema.safeParse(lower).success) {
        return lower as z.infer<typeof websiteEditModeSchema>;
      }
      return modeAlias[lower];
    })();

    const normalizeSectionsInput = (value: unknown): Array<z.infer<typeof websiteSectionSchema>> | undefined => {
      if (Array.isArray(value)) {
        const sections = value
          .map((item) => websiteSectionSchema.safeParse(item))
          .filter((item) => item.success)
          .map((item) => item.data);
        return sections.length > 0 ? Array.from(new Set(sections)) : undefined;
      }
      if (typeof value === "string") {
        const sections = value
          .split(/[,\s]+/)
          .map((item) => item.trim().toLowerCase())
          .map((item) => websiteSectionSchema.safeParse(item))
          .filter((item) => item.success)
          .map((item) => item.data);
        return sections.length > 0 ? Array.from(new Set(sections)) : undefined;
      }
      return undefined;
    };

    const promptCandidates = [
      typeof payload.prompt === "string" ? payload.prompt : undefined,
      typeof rawInput.prompt === "string" ? rawInput.prompt : undefined,
      typeof rawInput.request === "string" ? rawInput.request : undefined,
      typeof rawInput.instruction === "string" ? rawInput.instruction : undefined,
      typeof rawInput.task === "string" ? rawInput.task : undefined,
      typeof rawInput.message === "string" ? rawInput.message : undefined,
    ];

    const prompt =
      promptCandidates.find((candidate) => typeof candidate === "string" && candidate.trim().length >= 10)?.trim() || "";

    if (!prompt) {
      return {
        ok: false,
        applied: false,
        message: "Website update failed.",
        error: "Prompt is required (min 10 characters).",
      };
    }

    const inferredSections = normalizeSectionsInput([
      ...(Array.isArray(payload.sections) ? payload.sections : []),
      ...(normalizeSectionsInput(rawInput.sections) ?? []),
      ...(normalizeSectionsInput(rawInput.section) ?? []),
    ]);

    const sectionsForPatch =
      normalizedMode === "section_patch" && (!inferredSections || inferredSections.length === 0)
        ? (["hero", "features", "pricing", "about"] as Array<z.infer<typeof websiteSectionSchema>>)
        : inferredSections;

    const rawApply =
      typeof payload.apply === "boolean"
        ? payload.apply
        : typeof rawInput.apply === "boolean"
          ? rawInput.apply
          : undefined;
    const dryRun =
      (typeof payload.dryRun === "boolean" ? payload.dryRun : undefined) ??
      (typeof rawInput.dryRun === "boolean" ? rawInput.dryRun : undefined) ??
      (typeof rawInput.previewOnly === "boolean" ? rawInput.previewOnly : undefined);
    const resolvedApply = dryRun === true ? false : rawApply ?? true;

    const autoResolveSubdomain =
      (typeof payload.autoResolveSubdomain === "boolean"
        ? payload.autoResolveSubdomain
        : undefined) ??
      (typeof rawInput.autoResolveSubdomain === "boolean"
        ? rawInput.autoResolveSubdomain
        : undefined) ??
      true;

    const token = getOptionalBearerToken();

    const response = await fetch("/api/admin/website/ai-edit", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        prompt,
        apply: resolvedApply,
        ...(normalizedMode ? { mode: normalizedMode } : {}),
        ...(sectionsForPatch ? { sections: sectionsForPatch } : {}),
        ...(typeof payload.siteName === "string" && payload.siteName.trim().length > 0
          ? { siteName: payload.siteName }
          : {}),
        ...(typeof payload.styleVariant === "string" && payload.styleVariant.trim().length > 0
          ? { styleVariant: payload.styleVariant }
          : {}),
        ...(typeof payload.subdomain === "string" && payload.subdomain.trim().length > 0
          ? { subdomain: payload.subdomain }
          : {}),
        ...(typeof payload.targetAdminId === "string" && payload.targetAdminId.trim().length > 0
          ? { targetAdminId: payload.targetAdminId }
          : {}),
        autoResolveSubdomain,
        ...(typeof payload.includeContentPreview === "boolean"
          ? { includeContentPreview: payload.includeContentPreview }
          : {}),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        applied: false,
        message: "Website update failed.",
        error: typeof data?.error === "string" ? data.error : `Request failed (${response.status})`,
      };
    }

    return {
      ok: true,
      applied: Boolean(data?.applied),
      mode: websiteEditModeSchema.safeParse(data?.mode).success
        ? (data.mode as z.infer<typeof websiteEditModeSchema>)
        : undefined,
      updatedSections: Array.isArray(data?.updatedSections)
        ? data.updatedSections
            .map((section: unknown) => websiteSectionSchema.safeParse(section))
            .filter((section) => section.success)
            .map((section) => section.data)
        : undefined,
      requestedSubdomain:
        typeof data?.website?.requestedSubdomain === "string"
          ? data.website.requestedSubdomain
          : undefined,
      subdomainAdjusted:
        typeof data?.website?.subdomainAdjusted === "boolean"
          ? data.website.subdomainAdjusted
          : undefined,
      subdomain: typeof data?.website?.subdomain === "string" ? data.website.subdomain : undefined,
      pathUrl: typeof data?.urls?.pathUrl === "string" ? data.urls.pathUrl : undefined,
      hostUrl: typeof data?.urls?.hostUrl === "string" ? data.urls.hostUrl : undefined,
      renderPages: Array.isArray(data?.renderPages)
        ? data.renderPages
            .filter(
              (item: unknown) =>
                isRecord(item) &&
                typeof item.id === "string" &&
                typeof item.label === "string"
            )
            .map((item) => ({
              id: String(item.id),
              label: String(item.label),
            }))
        : undefined,
      message:
        typeof data?.message === "string"
          ? data.message
          : "Subdomain website updated successfully.",
    };
  },
});

export const siteUiCatalogTool = registerTamboTool({
  name: "site_ui_catalog",
  title: "Site UI catalog",
  description:
    "Returns approved generative UI components for in-chat rendering.",
  annotations: {
    tamboStreamableHint: true,
  },
  inputSchema: z.object({}),
  outputSchema: siteUiCatalogSchema,
  defaultMessage: "Failed to load UI catalog.",
  tool: async () => {
    return {
      title: "AutoFood generative UI catalog",
      notes: [
        "Do not embed or mirror full site pages.",
        "Build UI only from these components and live data from site_api_request.",
        "Use build_interactive_ui to transform API payloads into component-ready props.",
        "For build_interactive_ui, set layout to auto/table_first/overview/cards_first/chart_focus based on user goal.",
        "Prefer dense, table-first layouts and minimal action controls unless a chart/cards goal is explicit.",
      ],
      components: [
        { name: "AdminStatsGrid", purpose: "Order and customer stats cards" },
        { name: "SiteMetricGrid", purpose: "KPI dashboard cards" },
        { name: "SiteDataTable", purpose: "Tabular data with typed columns/cells" },
        { name: "SiteEntityCards", purpose: "Client/order/courier cards with statuses" },
        { name: "SiteBarChart", purpose: "Simple bar chart for counts and comparisons" },
        { name: "QuickLinks", purpose: "Navigation shortcuts" },
        { name: "SiteJsonPanel", purpose: "Raw API payload view" },
      ],
    };
  },
});

export const siteApiCatalogTool = registerTamboTool({
  name: "site_api_catalog",
  title: "Site API catalog",
  description:
    "Get the main API routes of the site with method hints, then use site_api_request.",
  annotations: {
    tamboStreamableHint: true,
  },
  inputSchema: z.object({}),
  outputSchema: siteApiCatalogSchema,
  defaultMessage: "Failed to load API catalog.",
  tool: async () => {
    return {
      title: "AutoFood API catalog",
      endpoints: SITE_ENDPOINT_CATALOG,
    };
  },
});
