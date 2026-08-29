import { describe, expect, it } from "vitest";
import { orchestrateAnswer } from "../constructionQA.js";

describe("construction Q&A input handling", () => {
  it("keeps HTML-looking questions as data and never reflects them into an AI answer", () => {
    const payload = '<img src=x onerror="window.__chatbotXss = true"> <script>alert(1)</script>';
    const result = orchestrateAnswer(payload);
    const answers = [
      result.primaryAnswer.answer,
      ...result.supportingAnswers.map((answer) => answer.answer),
    ];

    expect(result.question).toBe(payload);
    expect(answers.join("\n")).not.toContain("<img");
    expect(answers.join("\n")).not.toContain("<script");
  });
});