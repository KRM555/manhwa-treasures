import { describe, it, expect } from "vitest";
import { DEFAULT_GEMINI_MODELS, MODEL_FALLBACK_MAP, doesModelSupportThinking } from "./models";

describe("Gemini Models and Fallback Mechanism", () => {
  it("provides fallback chains for all default models", () => {
    DEFAULT_GEMINI_MODELS.forEach((model) => {
      const fallbackChain = MODEL_FALLBACK_MAP[model.id];
      expect(fallbackChain, `Expected fallback chain for model ${model.id}`).toBeDefined();
      expect(fallbackChain!.length).toBeGreaterThanOrEqual(2);
      // Primary model should be first in fallback chain
      expect(fallbackChain![0]).toBe(model.id);
    });
  });

  it("correctly identifies models that support thinkingConfig", () => {
    // Gemini 3.x models support thinking
    expect(doesModelSupportThinking("gemini-3.6-flash")).toBe(true);
    expect(doesModelSupportThinking("gemini-3.7-flash")).toBe(true);
    expect(doesModelSupportThinking("gemini-3.8-flash")).toBe(true);
    expect(doesModelSupportThinking("gemini-3.1-pro-preview")).toBe(true);

    // Gemini 2.x and earlier models do not use the Gemini 3 thinking config
    expect(doesModelSupportThinking("gemini-2.5-flash")).toBe(false);
    expect(doesModelSupportThinking("gemini-2.5-pro")).toBe(false);
    expect(doesModelSupportThinking("gemini-2.0-flash")).toBe(false);
    expect(doesModelSupportThinking("gemini-1.5-pro")).toBe(false);
  });

  it("simulates model fallback progression when primary fails with retryable error", () => {
    const selectedModel = "gemini-3.8-flash";
    const chain = MODEL_FALLBACK_MAP[selectedModel] || ["gemini-3.8-flash", "gemini-3.7-flash"];

    const attempts: string[] = [];
    const mockModelRunner = (modelId: string) => {
      attempts.push(modelId);
      // Simulate failure on 3.8 and 3.7, success on 3.6
      if (modelId === "gemini-3.6-flash") {
        return { success: true, model: modelId };
      }
      return { success: false, status: 429 };
    };

    let result = null;
    for (const model of chain) {
      const res = mockModelRunner(model);
      if (res.success) {
        result = res;
        break;
      }
    }

    expect(result).not.toBeNull();
    expect(result!.model).toBe("gemini-3.6-flash");
    expect(attempts).toContain("gemini-3.8-flash");
    expect(attempts).toContain("gemini-3.7-flash");
    expect(attempts).toContain("gemini-3.6-flash");
  });
});
