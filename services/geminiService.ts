import { GoogleGenAI } from "@google/genai";
import { GameStats, BiasMetric } from "../types";

export const generatePsychologicalReport = async (stats: GameStats): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key missing. Unable to generate AI analysis.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      You are an expert cognitive psychologist specializing in implicit bias and the "Shooter Bias" paradigm.
      Analyze the following game statistics from a user's session.
      
      The user played a "Whac-A-Mole" style game where they had to shoot targets holding guns and spare targets holding phones/wallets.
      
      Data:
      - Total Trials: ${stats.totalTrials}
      - Overall Accuracy: ${(stats.accuracy * 100).toFixed(1)}%
      - Average Reaction Time: ${stats.avgReactionTime.toFixed(0)}ms
      
      Bias Breakdown by Category:
      ${stats.biasData.map(d => `
        - Category: ${d.category}
          - Avg RT (Threats): ${d.avgReactionTimeThreat.toFixed(0)}ms
          - Avg RT (Non-Threats): ${d.avgReactionTimeNonThreat.toFixed(0)}ms
          - False Alarm Rate (Shot Innocent): ${(d.errorRateFalseAlarm * 100).toFixed(1)}%
      `).join('\n')}
      
      Please provide a concise, 3-paragraph analysis:
      1. Overall performance summary (fast vs slow, impulsive vs cautious).
      2. Identify any significant disparities in Reaction Time or Error Rates between groups (Race/Attire) that might suggest implicit bias. Be scientific and objective.
      3. A brief disclaimer that this is a game and not a clinical diagnosis, followed by one tip for reducing implicit bias.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Analysis generation failed.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "An error occurred while generating the psychological report.";
  }
};