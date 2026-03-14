# Achieving Maximum Stem Purity: The Realistic Guide

Reaching 95%+ purity scores consistently isn't magic—it's physics and workflow. Here is a realistic, actionable checklist to maximize isolation quality every single time.

## 1. Source Material Integrity (The 80% Factor)
The single biggest factor is your input file. Models cannot uncrumple a piece of paper perfectly.

-   **Stop Using YouTube Rips**: YouTube audio is compressed AAC (128kbps-160kbps). The "swirly" artifacts in high frequencies confuse separation models, causing bleed.
-   **Use FLAC / WAV**: Lossless audio gives the model the full frequency spectrum to analyze.
-   **Check the Mix**:
    -   *Dense/Wall-of-Sound mixes* (e.g., Metal, EDM) are harder to split than sparse arrangements.
    -   *Live Recordings* with mic bleed will never reach 100% purity because the source itself isn't pure.

## 2. Model Selection Strategy
Different models excel at different things. Use the right tool.

| Goal | Recommended Model | Why? |
| :--- | :--- | :--- |
| **Vocals** | **HTDemucs4** | Best overall balance of bleed reduction and artifact management. |
| **Drums** | **HTDemucs4_ft** (Fine-tuned) | Preserves transient punch better than standard models. |
| **Instrumentals** | **MDX-Net** (specifically Kim Vocal 2) | MDX algorithms are aggressive at removing vocals, leaving a cleaner instrumental. |
| **Overall** | **Hybrid Transformer** | The default in this app for a reason. |

## 3. The "Ensemble" Trick (Advanced Purity)
If your computer can handle it, use **Ensembling**. This is the secret weapon of pro stem services.
-   *What it does*: Runs the separation 2-3 times with slightly different parameters or models and averages the result.
-   *Why*: Random errors in one pass are canceled out by the other passes.
-   *Cost*: Takes 2x-3x longer to process.
-   *Result*: +5-10% Purity Score.

## 4. Pre-Processing Cleanup (Before Splitting)
Sometimes helping the model *see* better yields better results.
-   **High Pass Filter (20Hz-40Hz)**: Remove DC offset and sub-rumble. This useless energy can confuse bass/kick separation.
-   **Transient Shaping**: Slightly sharpening transients can help the model distinguish drums from other percussive elements.

## 5. Post-Processing Polish (The "Pro FX Rack")
Even a 90% purity split has 10% bleed. Use the FX Rack to hide it.

### For Vocals (Removing "Ghost" Hi-Hats)
1.  **Gate**: Set Threshold just above the noise floor (-45dB to -35dB). Fast Attack (1ms), Medium Release (150ms).
2.  **EQ**: Low Cut (High Pass) at 120Hz-150Hz. This removes 90% of kick drum bleed immediately.
3.  **De-Esser / High Shelf Cut**: If cymbal bleed is harsh, gently cut 10kHz+ by -2dB.

### For Drums (Removing "Ghost" Melodies)
1.  **Gate**: Hard Gate. Threshold -30dB, Release 50-80ms. Make it "tight".
2.  **Transient Shaper**: Boost Attack to emphasize the hits and bury the sustained bleed.

### For Bass (Removing "Mud")
1.  **Mono Maker**: Force frequencies below 150Hz to Mono. This creates a solid center image and cancels out some stereo reverb bleed from other instruments.

## 6. The "Phase Cancellation" Test (Verification)
To verify your purity:
1.  Take your instrumental stem.
2.  Take your vocal stem.
3.  Invert the phase of the vocal stem.
4.  Sum it with the original song.
5.  If the result is *pure silence* (or just the instrumental), your separation is mathematically perfect. Is perfect silence possible? Rarely. But the quieter the residual, the better the purity.

---

## Realistic Expectations Table

| Source Quality | Expected Purity | Notes |
| :--- | :--- | :--- |
| **Lossless Studio Master** | **92% - 98%** | "Studio Grade" results. |
| **High Quality MP3 (320kbps)** | **85% - 90%** | Excellent for remixes/DJing. |
| **Low Quality (128kbps/YouTube)** | **70% - 80%** | Usable, but artifacts will be audible. |
| **Live Concert Recording** | **50% - 65%** | Heavy bleed is unavoidable. |

**Pro Tip:** Don't obsess over the number. If it *sounds* good in the mix, it *is* good.
