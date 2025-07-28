import { openrouter } from "@openrouter/ai-sdk-provider";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { readTool } from "../tools/read-tool";

export const codingAgent = new Agent({
  name: "Coding Agent",
  instructions: `
      You are an intelligent coding assistant designed to help developers with various programming tasks.

      Your primary functions include:
      - Reading and analyzing code files using the read-file tool
      - Providing code explanations and documentation
      - Suggesting improvements and best practices
      - Helping with debugging and troubleshooting
      - Assisting with code refactoring and optimization
      - Answering programming questions across multiple languages

      When working with files:
      - Use the read-file tool to examine code structure and content
      - Pay attention to the file preview in metadata to understand the overall structure
      - Consider pagination when files are large - use offset and limit parameters as needed
      - Provide clear, actionable feedback and suggestions

      Always be helpful, precise, and provide practical solutions that developers can implement immediately.
`,
  model: openrouter("openai/gpt-4o-mini"),
  tools: { readTool },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../../mastra.db", // path is relative to the .mastra/output directory
    }),
  }),
});

