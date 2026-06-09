import { defineTool } from "@tambo-ai/react";
import { z } from "zod";

type AnyToolInput = Record<string, unknown>;

type GuardOptions = {
  toolName: string;
  defaultMessage?: string;
};

export function withTamboToolGuard<TInput extends AnyToolInput, TResult>(
  handler: (input: TInput) => Promise<TResult>,
  options: GuardOptions
) {
  return async (input: TInput): Promise<TResult> => {
    try {
      return await handler(input);
    } catch (error) {
      console.error(`[Tambo tool:${options.toolName}]`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error(options.defaultMessage ?? "Tool execution failed.");
    }
  };
}

type GuardedToolDefinition<TInput extends AnyToolInput, TResult> = {
  name: string;
  title?: string;
  description: string;
  annotations?: Record<string, unknown>;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TResult>;
  tool: (input: TInput) => Promise<TResult>;
  defaultMessage?: string;
};

export function registerTamboTool<TInput extends AnyToolInput, TResult>({
  defaultMessage,
  tool,
  ...toolDefinition
}: GuardedToolDefinition<TInput, TResult>) {
  return defineTool({
    ...toolDefinition,
    tool: withTamboToolGuard(tool, {
      toolName: toolDefinition.name,
      defaultMessage,
    }),
  });
}
