import { describe, expect, it } from "vitest";
import { groupNumber, isAddressLike, shortAddress } from "./format";

describe("shortAddress", () => {
  it("truncates a full address to head…tail", () => {
    expect(shortAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234…5678");
  });

  it("returns short strings unchanged", () => {
    expect(shortAddress("0x1234")).toBe("0x1234");
  });

  it("handles empty input", () => {
    expect(shortAddress("")).toBe("");
  });
});

describe("groupNumber", () => {
  it("inserts thousands separators", () => {
    expect(groupNumber("1234567")).toBe("1,234,567");
  });

  it("preserves the fractional part", () => {
    expect(groupNumber("1234.5678")).toBe("1,234.5678");
  });

  it("leaves small numbers untouched", () => {
    expect(groupNumber("42")).toBe("42");
  });
});

describe("isAddressLike", () => {
  it("accepts a 20-byte hex address", () => {
    expect(isAddressLike("0x1234567890abcdef1234567890abcdef12345678")).toBe(true);
  });

  it("rejects short or malformed input", () => {
    expect(isAddressLike("0x123")).toBe(false);
    expect(isAddressLike("not-an-address")).toBe(false);
  });
});
