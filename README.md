# Bias Lab: Implicit Shooter Bias Simulation

**Bias Lab** is a gamified cognitive psychology experiment designed to test and demonstrate implicit bias. It is based on the "Shooter Bias" paradigm, where participants must make split-second decisions to "shoot" or "don't shoot" potential targets based on whether they are holding a weapon or a harmless object.

## 🎮 How to Play

1.  **Start:** Wait for the AI to generate the simulation assets (happens once).
2.  **React:** Targets will appear in a 3x3 grid.
3.  **Controls:**
    *   **Shoot:** Press the **SPACEBAR** immediately if the person is holding a **GUN**.
    *   **Don't Shoot:** Do **NOTHING** if the person is holding a harmless object (Phone, Wallet, Camera).
4.  **Speed Matters:** You have limited time to react. Hesitation counts as a miss.
5.  **Review:** At the end, view a statistical breakdown of your reaction times and error rates across different demographics.

## 🧪 The Science

This simulation measures two key metrics:
1.  **Reaction Time Latency:** Do you shoot armed suspects of one race faster than another?
2.  **Error Rate (False Alarms):** are you more likely to mistake a wallet for a gun when held by a specific demographic?

*Disclaimer: This is a demonstration tool using Generative AI assets. It is not a clinical diagnostic tool.*

## 🛠️ Technical Details

*   **Framework:** React 19, TypeScript, Vite.
*   **AI Generation:** Uses **Google Gemini 2.5 Flash Image** to generate photorealistic, variable stimuli with specific controls (Race, Attire, Object, Background).
*   **Caching:** Assets are generated once and stored in **IndexedDB** to ensure instant load times on subsequent runs.
*   **Analysis:** Uses **Google Gemini 3 Flash** to interpret the raw statistical data into a psychological report.
