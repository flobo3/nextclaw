import { describe, expect, it } from "vitest";
import { validateToolArgs } from "../utils.js";

describe("validateToolArgs", () => {
  it("supports oneOf branches with additionalProperties false", () => {
    const schema = {
      type: "object",
      oneOf: [
        {
          type: "object",
          properties: {
            path: { type: "string" },
          },
          required: ["path"],
          additionalProperties: false,
        },
        {
          type: "object",
          properties: {
            bytesBase64: { type: "string" },
            fileName: { type: "string" },
          },
          required: ["bytesBase64", "fileName"],
          additionalProperties: false,
        },
      ],
    };

    expect(validateToolArgs({ path: "/tmp/a.txt" }, schema)).toEqual([]);
    expect(validateToolArgs({ file_path: "/tmp/a.txt" }, schema)).toContain(
      "file_path is not allowed",
    );
    expect(
      validateToolArgs({ bytesBase64: "ZmlsZQ==" }, schema),
    ).toContain("fileName is required");
  });

  it("returns no issues when no schema is provided", () => {
    expect(validateToolArgs({ anything: true }, undefined)).toEqual([]);
  });
});
