import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../prisma";
import { inngest, Inngest } from "./client";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

export const generateIndustryInsights = inngest.createFunction(
  { name: "Generate Industry Insights" },
  { cron: "0 0 * * 0" },
  async ({ step }) => {
    const industries = await step.run("Fetch industries", async () => {
      return await db.industryInsight.findMany({
        select: { industry: true },
      });
    });
    for (const { industry } of industries) {
      const prompt = `
          Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
          {
            "salaryRanges": [
              { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
            ],
            "growthRate": number,
            "demandLevel": "High" | "Medium" | "Low",
            "topSkills": ["skill1", "skill2"],
            "marketOutlook": "Positive" | "Neutral" | "Negetive",
            "keyTrends": ["trend1", "trend2"],
            "recommendedSkills": ["skill1", "skill2"]
          }
          
          IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
          Include at least 5 common roles for salary ranges.
          Growth rate should be a percentage.
          Include at least 5 skills and trends.
        `;
      const res = await step.ai.wrap(
        "gemini",
        async (p) => {
          return await await model.generateContent(p);
        },
        prompt
      );
      const candidate = res.response.candidates?.[0];

      if (!candidate || !candidate.content?.parts?.[0]?.text) {
        // Log the full response for debugging and throw a meaningful error
        console.error(
          "Gemini API returned an unexpected or blocked response:",
          res
        );
        throw new Error("Gemini API failed to return content or was blocked.");
      }

      const text = candidate.content.parts[0].text;
      const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

      let insights;
      try {
        insights = JSON.parse(cleanedText);
      } catch (e) {
        // Handle case where the response is NOT valid JSON
        console.error("Failed to parse JSON:", cleanedText, e);
        throw new Error("Gemini response was not valid JSON.");
      }

      await step.run(`update ${industry} insights`, async () => {
        await db.industryInsight.update({
          where: { industry },
          data: {
            ...insights,
            lastUpdated: new Date(),
            nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      });
    }
  }
);
