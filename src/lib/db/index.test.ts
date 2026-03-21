import { describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";

vi.mock("@neondatabase/serverless", () => ({
  neon: vi.fn(() => vi.fn()),
}));

describe("getDb", () => {
  it("throws when DATABASE_URL is not set", () => {
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    expect(() => getDb()).toThrow(
      "DATABASE_URL environment variable is not set",
    );

    process.env.DATABASE_URL = original;
  });

  it("returns a function when DATABASE_URL is set", () => {
    const original = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://test:test@localhost/test";

    const db = getDb();
    expect(typeof db).toBe("function");

    process.env.DATABASE_URL = original;
  });
});
