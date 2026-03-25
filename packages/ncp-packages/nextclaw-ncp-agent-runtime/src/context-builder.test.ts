import { describe, expect, it } from "vitest";
import { DefaultNcpContextBuilder } from "./context-builder.js";

describe("DefaultNcpContextBuilder", () => {
  it("converts user image file parts into OpenAI multimodal content", () => {
    const builder = new DefaultNcpContextBuilder();
    const prepared = builder.prepare({
      sessionId: "session-1",
      messages: [
        {
          id: "user-1",
          sessionId: "session-1",
          role: "user",
          status: "final",
          timestamp: "2026-03-25T12:00:00.000Z",
          parts: [
            { type: "text", text: "describe this" },
            {
              type: "file",
              mimeType: "image/png",
              contentBase64: "ZmFrZS1pbWFnZQ==",
              sizeBytes: 12,
            },
          ],
        },
      ],
    });

    expect(prepared.messages).toEqual([
      {
        role: "user",
        content: [
          { type: "text", text: "describe this" },
          {
            type: "image_url",
            image_url: {
              url: "data:image/png;base64,ZmFrZS1pbWFnZQ==",
            },
          },
        ],
      },
    ]);
  });
});
