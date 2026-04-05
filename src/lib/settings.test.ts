import { afterEach, describe, expect, it } from "vitest";
import { loadSettings, saveSettings } from "./settings";

describe("loadSettings", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("returns defaults when localStorage is empty", () => {
    expect(loadSettings()).toEqual({ speed: 1.0 });
  });

  it("merges stored values with defaults", () => {
    localStorage.setItem("shadowing-settings", JSON.stringify({ speed: 1.5 }));
    expect(loadSettings()).toEqual({ speed: 1.5 });
  });

  it("falls back to defaults on invalid JSON", () => {
    localStorage.setItem("shadowing-settings", "not-json");
    expect(loadSettings()).toEqual({ speed: 1.0 });
  });
});

describe("saveSettings", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("persists partial updates", () => {
    saveSettings({ speed: 2.0 });
    expect(loadSettings()).toEqual({ speed: 2.0 });
  });
});
