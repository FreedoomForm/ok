"use client";

import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTambo, useTamboThreadInput } from "@tambo-ai/react";
import { flushSync } from "react-dom";
import {
  Bot,
  Loader2,
  Maximize2,
  MessageSquare,
  Minimize2,
  Plus,
  Send,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import styles from "./TamboAgentWidget.module.css";
import { useLanguage } from "@/contexts/LanguageContext";

const PLACEHOLDER_THREAD_ID = "placeholder";
const MAX_TEXTAREA_HEIGHT = 156;
const MAX_TEXT_ATTACHMENT_SIZE = 512 * 1024;
const MAX_TEXT_ATTACHMENT_CHARS = 12000;
const MAX_TEXT_ATTACHMENTS = 5;

type WebsiteArtifact = {
  id: string;
  kind: "website";
  sourceMessageId: string;
  createdAt?: string;
  ok: boolean;
  applied: boolean;
  subdomain?: string;
  pathUrl?: string;
  hostUrl?: string;
  message?: string;
};

type FileArtifact = {
  id: string;
  kind: "file";
  sourceMessageId: string;
  createdAt?: string;
  ok: boolean;
  fileName: string;
  format: string;
  downloadUrl?: string;
  note?: string;
};

type TamboArtifact = WebsiteArtifact | FileArtifact;

type StagedTextAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
  truncated: boolean;
};

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isTextAttachment(file: File): boolean {
  if (file.type.startsWith("text/")) return true;
  if (
    [
      "application/json",
      "application/xml",
      "application/javascript",
      "application/x-javascript",
    ].includes(file.type)
  ) {
    return true;
  }

  const lower = file.name.toLowerCase();
  return /\.(txt|md|csv|json|xml|html|js|jsx|ts|tsx|yml|yaml|log|sql)$/i.test(lower);
}

function createTextAttachmentBlock(attachments: StagedTextAttachment[]) {
  if (attachments.length === 0) return "";

  const blocks = attachments.map((attachment, index) => {
    const meta = `File ${index + 1}: ${attachment.name} (${formatFileSize(attachment.size)})`;
    const truncatedNote = attachment.truncated
      ? "\n[File content truncated for chat context]"
      : "";
    return `${meta}\n\`\`\`\n${attachment.content}\n\`\`\`${truncatedNote}`;
  });

  return `Attached text files for context:\n\n${blocks.join("\n\n")}`;
}

function formatMessageTime(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function summarizeMessageText(input: string, limit = 84): string {
  const compact = input.replace(/\s+/g, " ").trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, limit - 1).trimEnd()}…`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseToolResultObject(raw: string): Record<string, unknown> | null {
  const normalized = raw.trim();
  if (!normalized) return null;

  const candidates: string[] = [normalized];
  const codeFenceMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeFenceMatch?.[1]) {
    candidates.push(codeFenceMatch[1].trim());
  }

  const objectMatch = normalized.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    candidates.push(objectMatch[0].trim());
  }

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // ignore parsing attempts until a valid JSON object is found.
    }
  }

  return null;
}

function inferFileFormat(input?: string, mimeType?: string): string {
  if (typeof input === "string" && input.length > 0) {
    const match = input.toLowerCase().match(/\.([a-z0-9]{2,8})(?:$|\?|#)/);
    if (match?.[1]) return match[1];
  }

  if (typeof mimeType === "string" && mimeType.includes("/")) {
    const subtype = mimeType.split("/")[1]?.toLowerCase();
    if (subtype) return subtype.replace(/^x-/, "");
  }

  return "file";
}

function looksLikeArtifactPayload(value: Record<string, unknown>): boolean {
  return (
    typeof value.downloadUrl === "string" ||
    typeof value.fileName === "string" ||
    typeof value.pathUrl === "string" ||
    typeof value.hostUrl === "string" ||
    typeof value.subdomain === "string" ||
    typeof value.applied === "boolean"
  );
}

function findArtifactPayload(value: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 5 || value == null) return null;

  if (typeof value === "string") {
    const parsed = parseToolResultObject(value);
    return parsed ? findArtifactPayload(parsed, depth + 1) : null;
  }

  if (!isRecord(value)) return null;
  if (looksLikeArtifactPayload(value)) return value;

  const objectContainerKeys = [
    "result",
    "output",
    "data",
    "payload",
    "value",
    "resource",
    "response",
  ] as const;

  for (const key of objectContainerKeys) {
    const nested = value[key];
    const resolved = findArtifactPayload(nested, depth + 1);
    if (resolved) return resolved;
  }

  if (Array.isArray(value.content)) {
    for (const item of value.content) {
      const resolved = findArtifactPayload(item, depth + 1);
      if (resolved) return resolved;
    }
  }

  return null;
}

function extractToolResultPayload(content: unknown): Record<string, unknown> | null {
  if (!isRecord(content) || !Array.isArray(content.content)) return null;

  for (const block of content.content) {
    if (!isRecord(block)) continue;

    if (block.type === "text" && typeof block.text === "string") {
      const resolved = findArtifactPayload(block.text);
      if (resolved) return resolved;
      continue;
    }

    if (block.type !== "resource" || !isRecord(block.resource)) continue;
    const resource = block.resource;

    const resourcePayload = findArtifactPayload(resource);
    if (resourcePayload) return resourcePayload;

    if (typeof resource.text === "string") {
      const textPayload = findArtifactPayload(resource.text);
      if (textPayload) return textPayload;
    }

    if (typeof resource.uri === "string") {
      return {
        ok: true,
        fileName:
          typeof resource.name === "string" && resource.name.length > 0
            ? resource.name
            : "artifact",
        format: inferFileFormat(
          resource.uri,
          typeof resource.mimeType === "string" ? resource.mimeType : undefined
        ),
        downloadUrl: resource.uri,
      };
    }
  }

  return null;
}

function TamboEmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className={styles.emptyState}>
      <div className="space-y-1">
        <p className={styles.emptyTitle}>{title}</p>
        <p className={styles.emptyCopy}>{copy}</p>
      </div>
    </div>
  );
}

export function TamboAgentWidget({ embedded = false }: { embedded?: boolean } = {}) {
  const apiKey = process.env.NEXT_PUBLIC_TAMBO_API_KEY;
  const { t } = useLanguage();
  const tamboT = t.tambo;
  const [isOpen, setIsOpen] = useState(embedded);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [textAttachments, setTextAttachments] = useState<StagedTextAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renderedBlockCountRef = useRef(0);

  const {
    messages,
    isStreaming,
    currentThreadId,
    initThread,
    startNewThread,
  } = useTambo();
  const userFacingMessages = useMemo(
    () => messages.filter((message) => message.role !== "system"),
    [messages]
  );
  const {
    value,
    setValue,
    submit,
    isPending,
    isDisabled,
    images,
    addImages,
    removeImage,
    clearImages,
  } =
    useTamboThreadInput();

  useEffect(() => {
    if (!isOpen) return;
    initThread(currentThreadId);
  }, [isOpen, initThread, currentThreadId]);

  useEffect(() => {
    if (!isOpen) return;
    const renderedBlockCount = userFacingMessages.length + (isStreaming ? 1 : 0);
    const shouldAnimate = renderedBlockCount > renderedBlockCountRef.current;
    bottomRef.current?.scrollIntoView({ behavior: shouldAnimate ? "smooth" : "auto" });
    renderedBlockCountRef.current = renderedBlockCount;
  }, [userFacingMessages.length, isStreaming, isOpen]);

  useEffect(() => {
    if (embedded) return;
    if (!isOpen || !isFullscreen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [embedded, isOpen, isFullscreen]);

  useEffect(() => {
    const onOpenChat = (event: Event) => {
      const custom = event as CustomEvent<{ prompt?: string; newThread?: boolean }>
      if (!embedded) {
        setIsOpen(true)
        setIsFullscreen(false)
      }

      const wantsNewThread = Boolean(custom.detail?.newThread)
      if (wantsNewThread) {
        startNewThread()
        setValue("")
        clearImages()
        setTextAttachments([])
        setAttachmentError(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }

      if (typeof custom.detail?.prompt === "string") {
        // If a new thread is requested, let the thread state settle before setting input.
        if (wantsNewThread) {
          requestAnimationFrame(() => setValue(custom.detail!.prompt as string))
        } else {
          setValue(custom.detail.prompt)
        }
      }

      requestAnimationFrame(() => textareaRef.current?.focus())
    }

    window.addEventListener("tambo:open-chat", onOpenChat as EventListener)
    return () => window.removeEventListener("tambo:open-chat", onOpenChat as EventListener)
  }, [clearImages, embedded, setAttachmentError, setTextAttachments, setValue, startNewThread])


  useEffect(() => {
    if (!isOpen) return;
    const timeoutId = window.setTimeout(() => textareaRef.current?.focus(), 40);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  useEffect(() => {
    if (embedded) return;
    if (!isOpen) return;
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isFullscreen) {
        setIsFullscreen(false);
        return;
      }
      setIsOpen(false);
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [embedded, isOpen, isFullscreen]);

  const syncTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    syncTextareaHeight();
  }, [value, syncTextareaHeight, isOpen]);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const removeTextAttachment = useCallback((id: string) => {
    setTextAttachments((current) => current.filter((item) => item.id !== id));
  }, []);

  const handleFileSelection = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0) return;

      setAttachmentError(null);
      const imageFiles: File[] = [];
      const nextTextAttachments: StagedTextAttachment[] = [];
      const skipped: string[] = [];

      for (const file of files) {
        if (file.type.startsWith("image/")) {
          imageFiles.push(file);
          continue;
        }

        if (!isTextAttachment(file)) {
          skipped.push(tamboT.attachmentUnsupported.replace("{file}", file.name));
          continue;
        }

        if (file.size > MAX_TEXT_ATTACHMENT_SIZE) {
          skipped.push(tamboT.attachmentMaxSize.replace("{file}", file.name));
          continue;
        }

        try {
          const raw = await file.text();
          const normalized = raw.replace(/\u0000/g, "");
          const truncated = normalized.length > MAX_TEXT_ATTACHMENT_CHARS;
          nextTextAttachments.push({
            id: globalThis.crypto?.randomUUID
              ? globalThis.crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: file.name,
            size: file.size,
            type: file.type || "text/plain",
            content: truncated
              ? `${normalized.slice(0, MAX_TEXT_ATTACHMENT_CHARS)}\n...[truncated]`
              : normalized,
            truncated,
          });
        } catch {
          skipped.push(tamboT.attachmentReadFailed.replace("{file}", file.name));
        }
      }

      if (imageFiles.length > 0) {
        try {
          await addImages(imageFiles);
        } catch {
          skipped.push(
            ...imageFiles.map((file) =>
              tamboT.attachmentImageUploadFailed.replace("{file}", file.name)
            )
          );
        }
      }

      if (nextTextAttachments.length > 0) {
        setTextAttachments((current) =>
          [...current, ...nextTextAttachments].slice(0, MAX_TEXT_ATTACHMENTS)
        );
      }

      if (skipped.length > 0) {
        setAttachmentError(
          tamboT.skipped.replace("{items}", skipped.slice(0, 4).join(", "))
        );
      }

      event.target.value = "";
    },
    [addImages, tamboT]
  );

  const hasRealThread = currentThreadId !== PLACEHOLDER_THREAD_ID;
  const hasInput = value.trim().length > 0;
  const hasAttachments = images.length > 0 || textAttachments.length > 0;
  const canSend = hasInput || hasAttachments;

  const handleSend = useCallback(async () => {
    if (!canSend || isDisabled || isPending) return;

    const baseInput = value.trim();
    const attachmentContext = createTextAttachmentBlock(textAttachments);
    const messageText = [baseInput, attachmentContext]
      .filter((part) => part.length > 0)
      .join("\n\n")
      .trim();

    if (!messageText && images.length > 0) {
      flushSync(() => {
        setValue(tamboT.analyzeImagesFallback);
      });
    } else if (messageText && messageText !== value) {
      flushSync(() => {
        setValue(messageText);
      });
    }

    if (textAttachments.length > 0) {
      setTextAttachments([]);
    }
    setAttachmentError(null);

    const result = await submit();
    if (result.threadId && result.threadId !== currentThreadId) {
      initThread(result.threadId);
    }
  }, [
    canSend,
    currentThreadId,
    images.length,
    initThread,
    isDisabled,
    isPending,
    setValue,
    submit,
    tamboT,
    textAttachments,
    value,
  ]);

  const handleNewThread = useCallback(() => {
    startNewThread();
    setValue("");
    clearImages();
    setTextAttachments([]);
    setAttachmentError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [clearImages, setValue, startNewThread]);

  const handleComposerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
        return;
      }
      event.preventDefault();
      void handleSend();
    },
    [handleSend]
  );

  const widgetLabel = useMemo(
    () => (isFullscreen ? tamboT.ariaFullscreen : tamboT.ariaDocked),
    [isFullscreen, tamboT.ariaDocked, tamboT.ariaFullscreen]
  );

  type ThreadMessage = (typeof messages)[number];
  type ThreadContent = ThreadMessage["content"][number];

  const toolProgress = useMemo(() => {
    const started = new Set<string>();
    const completed = new Set<string>();

    messages.forEach((message) => {
      message.content.forEach((content) => {
        if (content.type === "tool_use") {
          const fallbackId = `${message.id}:${content.name}`;
          const toolId = typeof content.id === "string" ? content.id : fallbackId;
          started.add(toolId);

          const statusValue =
            "status" in content && typeof content.status === "string" ? content.status : "";
          if (statusValue === "completed" || statusValue === "failed" || statusValue === "cancelled") {
            completed.add(toolId);
          }
        }

        if (content.type === "tool_result" && typeof content.toolUseId === "string") {
          started.add(content.toolUseId);
          completed.add(content.toolUseId);
        }
      });
    });

    const total = started.size;
    const completedCount = Math.min(completed.size, total);
    const hasActiveToolWork = total > 0 && completedCount < total;

    if (total === 0) {
      return {
        total: 0,
        completed: 0,
        active: isStreaming || isPending,
        value: isStreaming ? 24 : isPending ? 12 : 0,
      };
    }

    return {
      total,
      completed: completedCount,
      active: hasActiveToolWork,
      value: Math.max(8, Math.min(100, Math.round((completedCount / total) * 100))),
    };
  }, [isPending, isStreaming, messages]);

  const artifacts = useMemo<TamboArtifact[]>(() => {
    const toolNamesById = new Map<string, string>();

    messages.forEach((message) => {
      message.content.forEach((content) => {
        if (content.type === "tool_use" && typeof content.id === "string") {
          toolNamesById.set(content.id, content.name);
        }
      });
    });

    const collected: TamboArtifact[] = [];

    messages.forEach((message) => {
      message.content.forEach((content) => {
        if (content.type !== "tool_result" || typeof content.toolUseId !== "string") return;

        const toolName = toolNamesById.get(content.toolUseId);
        if (!toolName) return;

        const parsed = extractToolResultPayload(content);
        if (!parsed) return;

        if (toolName === "create_database_file" || typeof parsed.downloadUrl === "string" || typeof parsed.fileName === "string") {
          collected.push({
            id: content.toolUseId,
            kind: "file",
            sourceMessageId: message.id,
            createdAt: message.createdAt,
            ok: parsed.ok !== false,
            fileName: typeof parsed.fileName === "string" ? parsed.fileName : "export",
            format: typeof parsed.format === "string" ? parsed.format : "file",
            downloadUrl: typeof parsed.downloadUrl === "string" ? parsed.downloadUrl : undefined,
            note: typeof parsed.note === "string" ? parsed.note : undefined,
          });
          return;
        }

        if (toolName === "edit_subdomain_website") {
          collected.push({
            id: content.toolUseId,
            kind: "website",
            sourceMessageId: message.id,
            createdAt: message.createdAt,
            ok: parsed.ok !== false,
            applied: Boolean(parsed.applied),
            subdomain: typeof parsed.subdomain === "string" ? parsed.subdomain : undefined,
            pathUrl: typeof parsed.pathUrl === "string" ? parsed.pathUrl : undefined,
            hostUrl: typeof parsed.hostUrl === "string" ? parsed.hostUrl : undefined,
            message: typeof parsed.message === "string" ? parsed.message : undefined,
          });
        }
      });
    });

    const deduped = new Map<string, TamboArtifact>();
    collected.forEach((item) => deduped.set(`${item.kind}:${item.id}`, item));

    const ts = (value?: string) => {
      if (!value) return 0;
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    return Array.from(deduped.values()).sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
  }, [messages]);

  const visibleMessages = useMemo(
    () =>
      userFacingMessages
        .map((message) => ({
          message,
          visibleContent: message.content.filter((content) => content.type === "text"),
        }))
        .filter(({ visibleContent }) => visibleContent.length > 0),
    [userFacingMessages]
  );

  const artifactsByMessage = useMemo(() => {
    const grouped = new Map<string, TamboArtifact[]>();
    artifacts.forEach((artifact) => {
      const existing = grouped.get(artifact.sourceMessageId) ?? [];
      existing.push(artifact);
      grouped.set(artifact.sourceMessageId, existing);
    });
    return grouped;
  }, [artifacts]);

  const visibleMessageIds = useMemo(
    () => new Set(visibleMessages.map(({ message }) => message.id)),
    [visibleMessages]
  );

  const orphanArtifacts = useMemo(
    () => artifacts.filter((artifact) => !visibleMessageIds.has(artifact.sourceMessageId)),
    [artifacts, visibleMessageIds]
  );

  const historyItems = useMemo(
    () =>
      visibleMessages.map(({ message, visibleContent }) => {
        const preview = visibleContent
          .filter((content): content is Extract<ThreadContent, { type: "text" }> => content.type === "text")
          .map((content) => content.text)
          .join(" ")
          .trim();

        return {
          id: message.id,
          role: message.role,
          preview: summarizeMessageText(
            preview || (message.role === "user" ? tamboT.historyNewRequest : tamboT.historyReply)
          ),
          timeLabel: formatMessageTime(message.createdAt),
          fileCount: artifactsByMessage.get(message.id)?.length ?? 0,
        };
      }),
    [artifactsByMessage, visibleMessages, tamboT]
  );

  const scrollToMessage = useCallback((messageId: string) => {
    const target = document.getElementById(`tambo-message-${messageId}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const renderContent = useCallback(
    (message: ThreadMessage, content: ThreadContent, index: number) => {
      if (content.type === "text") {
        return (
          <div
            key={`${message.id}:text:${index}`}
            className="whitespace-pre-wrap break-words leading-relaxed"
          >
            {content.text}
          </div>
        );
      }

      return null;
    },
    []
  );

  const renderArtifactCard = useCallback((artifact: TamboArtifact) => {
    if (artifact.kind === "file") {
      return (
        <div key={`${artifact.kind}:${artifact.id}`} className={styles.fileCard}>
          <div className={styles.fileCardHeader}>
            <div className="min-w-0">
              <p className={styles.fileCardTitle}>{artifact.fileName}</p>
              <p className={styles.fileCardMeta}>
                {artifact.ok ? tamboT.fileGenerated : tamboT.fileGenerationFailed}
                {artifact.note ? ` - ${artifact.note}` : ""}
              </p>
            </div>
            <Badge variant="outline" className={styles.fileBadge}>
              {artifact.format.toUpperCase()}
            </Badge>
          </div>
          <div className={styles.fileActions}>
            {artifact.downloadUrl ? (
              <>
                <a
                  href={artifact.downloadUrl}
                  download={artifact.fileName}
                  className={styles.fileAction}
                >
                  {tamboT.download}
                </a>
                <a
                  href={artifact.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.fileAction}
                >
                  {tamboT.open}
                </a>
              </>
            ) : (
              <p className={styles.fileCardMeta}>{tamboT.downloadLinkUnavailable}</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={`${artifact.kind}:${artifact.id}`} className={styles.fileCard}>
        <div className={styles.fileCardHeader}>
          <div className="min-w-0">
            <p className={styles.fileCardTitle}>
              {artifact.subdomain
                ? tamboT.websiteTitleWithSubdomain.replace("{subdomain}", artifact.subdomain)
                : tamboT.websiteEditedTitle}
            </p>
            <p className={styles.fileCardMeta}>
              {artifact.message ?? (artifact.applied ? tamboT.updateApplied : tamboT.previewGenerated)}
            </p>
          </div>
          <Badge variant={artifact.ok ? "secondary" : "destructive"} className={styles.fileBadge}>
            {artifact.ok ? tamboT.badgeOk : tamboT.badgeError}
          </Badge>
        </div>
        <div className={styles.fileActions}>
          {artifact.pathUrl ? (
            <a
              href={artifact.pathUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.fileAction}
            >
              {tamboT.preview}
            </a>
          ) : null}
          {artifact.hostUrl ? (
            <a
              href={artifact.hostUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.fileAction}
            >
              {tamboT.openSite}
            </a>
          ) : null}
        </div>
        {artifact.pathUrl ? (
          <div className={styles.previewFrame}>
            <iframe
              title={artifact.subdomain ? `${tamboT.preview} ${artifact.subdomain}` : tamboT.preview}
              src={artifact.pathUrl}
              loading="lazy"
              className="h-44 w-full bg-white"
            />
          </div>
        ) : null}
      </div>
    );
  }, [tamboT]);

  if (!apiKey) return null;

  const effectiveOpen = embedded || isOpen;
  const effectiveFullscreen = embedded ? false : isFullscreen;

  return (
    <>
      {!embedded && !isOpen ? (
        <Button
          type="button"
          className={cn("fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-50 h-14 w-14 rounded-2xl max-sm:right-[5.25rem]", styles.launcher)}
          onClick={() => {
            setIsOpen(true);
            setIsFullscreen(false);
          }}
          aria-label={tamboT.ariaOpenAgent}
        >
          <MessageSquare className="h-5 w-5" />
          <span aria-hidden className={styles.launcherPulse} />
        </Button>
      ) : null}

      {effectiveOpen ? (
        <section
          role="dialog"
          aria-label={widgetLabel}
          aria-modal={effectiveFullscreen || undefined}
          className={
            embedded
              ? "relative h-full w-full"
              : effectiveFullscreen
                ? "fixed inset-0 z-50 p-0 sm:p-2"
                : "fixed bottom-3 right-3 z-50 h-[min(640px,calc(100vh-1.5rem))] w-[min(520px,calc(100vw-1.5rem))] max-sm:inset-x-3 max-sm:bottom-3 max-sm:top-[4.5rem] max-sm:h-auto max-sm:w-auto"
          }
        >
          <div
            className={cn(
              "flex h-full w-full min-h-0 flex-col overflow-hidden",
              embedded ? "rounded-none" : effectiveFullscreen ? "rounded-none sm:rounded-3xl" : "rounded-3xl",
              styles.widgetSurface
            )}
          >
            <div aria-hidden className={styles.widgetNoise} />

            <div
              className={cn(
 "relative z-10 flex items-center justify-between gap-2 px-4 py-3",
                styles.header
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className={styles.brandMark} aria-hidden>
                  <Bot className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-tight">{tamboT.headerTitle}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span aria-hidden className={styles.statusDot} />
                    <span>{isStreaming ? tamboT.statusStreaming : tamboT.statusReady}</span>
                    {hasRealThread ? (
                      <span className={styles.threadChip}>#{currentThreadId.slice(0, 8)}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {!embedded ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleNewThread}
                    aria-label={tamboT.ariaNewChat}
                    className="h-9 w-9 rounded-xl"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                ) : null}
                {!embedded ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsFullscreen((current) => !current)}
                      aria-label={
                        isFullscreen ? tamboT.ariaExitFullscreen : tamboT.ariaEnterFullscreen
                      }
                      className="h-9 w-9 rounded-xl"
                    >
                      {isFullscreen ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      aria-label={tamboT.ariaClose}
                      className="h-9 w-9 rounded-xl"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            <div className={styles.shell}>
              <aside className={styles.historyPanel}>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.panelEyebrow}>{tamboT.historyLabel}</p>
                    <p className={styles.panelTitle}>{tamboT.currentSessionLabel}</p>
                  </div>
                  <span className={styles.panelCount}>{historyItems.length}</span>
                </div>
                <ScrollArea className="min-h-[160px] flex-1">
                  <div className={styles.historyList}>
                    {historyItems.length === 0 ? (
                      <div className={styles.historyEmpty}>{tamboT.historyEmpty}</div>
                    ) : null}
                    {historyItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={styles.historyItem}
                        onClick={() => scrollToMessage(item.id)}
                      >
                        <div className={styles.historyItemHeader}>
                          <span className={styles.historyRole}>
                            {item.role === "user" ? tamboT.roleYou : tamboT.roleTambo}
                          </span>
                          <div className={styles.historyMeta}>
                            {item.fileCount > 0 ? (
                              <span className={styles.historyFileCount}>
                                {tamboT.fileCountLabel.replace("{count}", item.fileCount.toString())}
                              </span>
                            ) : null}
                            {item.timeLabel ? <span>{item.timeLabel}</span> : null}
                          </div>
                        </div>
                        <p className={styles.historyPreview}>{item.preview}</p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </aside>

              <div className={styles.chatColumn}>
                <ScrollArea className="min-h-0 flex-1">
                  <div className={styles.transcript} aria-live="polite">
                    {userFacingMessages.length === 0 ? (
                      <TamboEmptyState title={tamboT.emptyTitle} copy={tamboT.emptyCopy} />
                    ) : null}

                    {visibleMessages.map(({ message, visibleContent }) => {
                      const messageArtifacts = artifactsByMessage.get(message.id) ?? [];

                      return (
                        <article
                          key={message.id}
                          id={`tambo-message-${message.id}`}
                          className={cn(
                            styles.messageRow,
                            message.role === "user" ? styles.userRow : styles.assistantRow
                          )}
                        >
                          {message.role !== "user" ? (
                            <div className={styles.messageAvatar}>
                              <Bot className="h-4 w-4" />
                            </div>
                          ) : null}
                          <div
                            className={cn(
                              styles.messageBubble,
                              message.role === "user" ? styles.userBubble : styles.assistantBubble
                            )}
                          >
                            <div className={styles.messageMeta}>
                              <span className="font-semibold">
                                {message.role === "user" ? tamboT.roleYou : tamboT.roleTambo}
                              </span>
                              {formatMessageTime(message.createdAt) ? (
                                <span>{formatMessageTime(message.createdAt)}</span>
                              ) : null}
                            </div>
                            <div className={styles.messageBody}>
                              {visibleContent.map((content, idx) =>
                                renderContent(message, content, idx)
                              )}
                            </div>
                            {message.role !== "user" && messageArtifacts.length > 0 ? (
                              <div className={styles.messageFiles}>
                                {messageArtifacts.map((artifact) => renderArtifactCard(artifact))}
                              </div>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}

                    {orphanArtifacts.length > 0 ? (
                      <section className={styles.orphanSection}>
                        <p className={styles.orphanTitle}>{tamboT.latestFiles}</p>
                        <div className={styles.messageFiles}>
                          {orphanArtifacts.map((artifact) => renderArtifactCard(artifact))}
                        </div>
                      </section>
                    ) : null}

                    {toolProgress.active ? (
                      <div className={styles.progressCard}>
                        <div className={styles.progressHeader}>
                          <span>{tamboT.workingTitle}</span>
                          <span>
                            {toolProgress.total > 0
                              ? `${toolProgress.completed}/${toolProgress.total}`
                              : tamboT.inProgress}
                          </span>
                        </div>
                        <Progress value={toolProgress.value} className="h-1.5" />
                      </div>
                    ) : null}

                    {isStreaming ? (
                      <div className={styles.streaming}>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{tamboT.generatingAnswer}</span>
                      </div>
                    ) : null}

                    <div ref={bottomRef} />
                  </div>
                </ScrollArea>

                <div className={styles.footer}>
                  <div className={styles.footerInner}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileSelection}
                      className="hidden"
                      aria-hidden
                    />

                    {images.length > 0 || textAttachments.length > 0 || attachmentError ? (
                      <div className={styles.attachmentList}>
                        {images.map((image) => (
                          <button
                            key={image.id}
                            type="button"
                            className={styles.attachmentChip}
                            onClick={() => removeImage(image.id)}
                            title={tamboT.removeImageAttachment}
                          >
                            {image.name}
                            <span className={styles.attachmentChipMeta}>
                              {formatFileSize(image.size)}
                            </span>
                          </button>
                        ))}
                        {textAttachments.map((attachment) => (
                          <button
                            key={attachment.id}
                            type="button"
                            className={styles.attachmentChip}
                            onClick={() => removeTextAttachment(attachment.id)}
                            title={tamboT.removeTextAttachment}
                          >
                            {attachment.name}
                            <span className={styles.attachmentChipMeta}>
                              {formatFileSize(attachment.size)}
                            </span>
                          </button>
                        ))}
                        {attachmentError ? (
                          <p className={styles.attachmentError}>{attachmentError}</p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className={styles.composer}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={openFilePicker}
                        disabled={isDisabled || isPending}
                        aria-label={tamboT.ariaAttachFile}
                        className={styles.attachButton}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        onKeyDown={handleComposerKeyDown}
                        onInput={syncTextareaHeight}
                        rows={1}
                        placeholder={tamboT.messagePlaceholder}
                        disabled={isDisabled || isPending}
                        className={styles.composerInput}
                      />
                      <Button
                        type="button"
                        onClick={() => void handleSend()}
                        disabled={isDisabled || isPending || !canSend}
                        aria-label={tamboT.ariaSend}
                        className={styles.sendButton}
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className={styles.footerMeta}>
                      <span>{tamboT.disclaimer}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}



