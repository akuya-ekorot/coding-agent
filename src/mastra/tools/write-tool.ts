import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { existsSync, writeFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const cleanLineNumbers = (content: string): string => {
  const lines = content.split("\n");
  const hasLineNumbers = lines.some((line) => /^\s*\d+[|→]\s/.test(line));

  if (!hasLineNumbers) {
    return content;
  }

  const cleanedLines = lines.map((line) => {
    const match = line.match(/^\s*\d+[|→]\s(.*)$/);
    return match ? match[1] : line;
  });

  return cleanedLines.join("\n");
};

export const writeTool = createTool({
  id: "write-file",
  description: "Write content to a file in the local filesystem",
  inputSchema: z.object({
    filepath: z.string().describe(
      "The absolute or relative path to the file to write",
    ),
    content: z.string().describe(
      "The content to write to the file. Do NOT include line numbers or prefixes - provide only the raw file content.",
    ),
  }),
  outputSchema: z.object({
    message: z.string(),
    filepath: z.string(),
    existed: z.boolean(),
    isError: z.boolean().optional(),
  }),
  execute: async ({ context, runtimeContext }) => {
    return await writeFile(context.filepath, context.content, runtimeContext);
  },
});

const writeFile = async (
  filepath: string,
  content: string,
  runtimeContext?: any,
) => {
  try {
    const workingDirectory = runtimeContext?.get?.("working-directory") ||
      process.cwd();

    const resolvedPath = isAbsolute(filepath)
      ? filepath
      : resolve(workingDirectory, filepath);

    const fileExists = existsSync(resolvedPath);

    const cleanedContent = cleanLineNumbers(content);

    writeFileSync(resolvedPath, cleanedContent, "utf-8");

    const action = fileExists ? "updated" : "created";

    return {
      message: `File ${action} successfully: '${resolvedPath}'`,
      filepath: resolvedPath,
      existed: fileExists,
    };
  } catch (error) {
    return {
      message: `Failed to write file '${filepath}': ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      filepath: filepath,
      existed: false,
      isError: true,
    };
  }
};
