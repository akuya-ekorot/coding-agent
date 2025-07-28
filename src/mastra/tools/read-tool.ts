import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, isAbsolute, resolve } from "node:path";

export const readTool = createTool({
  id: "read-file",
  description:
    "Read file contents from the local filesystem with optional line offset and limit",
  inputSchema: z.object({
    filepath: z.string().describe(
      "The absolute or relative path to the file to read",
    ),
    offset: z.number().default(0).describe(
      "The line number to start reading from (0-based, defaults to 0)",
    ),
    limit: z.number().default(2000).describe(
      "The maximum number of lines to read (defaults to 2000)",
    ),
  }),
  outputSchema: z.object({
    content: z.string(),
    filepath: z.string(),
    isError: z.boolean().optional(),
    metadata: z.object({
      preview: z.string(),
      totalLines: z.number(),
      startLine: z.number(),
      endLine: z.number(),
    }).optional(),
  }),
  execute: async ({ context }) => {
    return await readFile(context.filepath, context.offset, context.limit);
  },
});

const isBinaryFile = (filepath: string): boolean => {
  const binaryExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".svg",
    ".ico",
    ".webp",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".zip",
    ".rar",
    ".7z",
    ".tar",
    ".gz",
    ".bz2",
    ".mp3",
    ".mp4",
    ".avi",
    ".mov",
    ".wav",
    ".flac",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".app",
    ".bin",
    ".dat",
    ".db",
    ".sqlite",
    ".sqlite3",
  ];

  const ext = extname(filepath).toLowerCase();
  return binaryExtensions.includes(ext);
};

const readFile = async (
  filepath: string,
  offset: number = 0,
  limit: number = 2000,
) => {
  try {
    const resolvedPath = isAbsolute(filepath)
      ? filepath
      : resolve(process.cwd(), filepath);

    if (!existsSync(resolvedPath)) {
      const parentDir = dirname(resolvedPath);
      let nearbyFiles: string[] = [];

      try {
        nearbyFiles = readdirSync(parentDir).slice(0, 10); // Limit to first 10 files
      } catch {
      }

      const nearbyFilesStr = nearbyFiles.length > 0
        ? `File not found: '${resolvedPath}'\n\nFiles in parent directory (${parentDir}):\n${
          nearbyFiles.map((f) => `  - ${f}`).join("\n")
        }`
        : `File not found: '${resolvedPath}'\n\nParent directory (${parentDir}) is empty or inaccessible.`;

      return {
        content: nearbyFilesStr,
        filepath: resolvedPath,
        isError: true,
      };
    }

    if (isBinaryFile(resolvedPath)) {
      return {
        content:
          `Cannot read binary file: '${resolvedPath}'\n\nThis appears to be a binary file (${
            extname(resolvedPath)
          }). Binary files are not supported by this tool.`,
        filepath: resolvedPath,
        isError: true,
      };
    }

    const fileContent = readFileSync(resolvedPath, "utf-8");
    const lines = fileContent.split("\n");

    const startLine = Math.max(0, offset);
    const endLine = Math.min(lines.length, startLine + limit);

    const selectedLines = lines.slice(startLine, endLine);

    const padding = Math.max(2, lines.length.toString().length);

    const formattedLines = selectedLines.map((line, index) => {
      const lineNumber = (startLine + index + 1).toString().padStart(
        padding,
        "0",
      );
      return `${lineNumber}| ${line}`;
    });

    let content = formattedLines.join("\n");

    // Add pagination info if file has more content
    if (endLine < lines.length) {
      const remainingLines = lines.length - endLine;
      content +=
        `\n\n--- End of current view ---\nThis file has ${remainingLines} more lines (total: ${lines.length} lines).\nUse offset: ${endLine} to continue reading from line ${
          endLine + 1
        }.`;
    }

    // Generate preview of first 15 lines
    const previewLines = lines.slice(0, 15);
    const previewPadding = Math.max(2, previewLines.length.toString().length);
    const previewFormatted = previewLines.map((line, index) => {
      const lineNumber = (index + 1).toString().padStart(previewPadding, "0");
      return `${lineNumber}| ${line}`;
    });

    let preview = previewFormatted.join("\n");
    if (lines.length > 15) {
      preview += `\n... (${lines.length - 15} more lines)`;
    }

    return {
      content,
      filepath: resolvedPath,
      metadata: {
        preview,
        totalLines: lines.length,
        startLine: startLine + 1, // Convert to 1-based for user display
        endLine: endLine,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to read file '${filepath}': ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
};
