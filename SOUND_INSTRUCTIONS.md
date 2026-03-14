# SOUND ASSETS INSTRUCTIONS

To complete the "Cyber-HUD" auditory experience, you need to acquire 10 specific sound files and place them in the `public/sounds/` directory.

## 1. File Placement

All files must be placed in: `e:\Projects\1_StemSplit\public\sounds\`

## 2. Required Sound Files

| Filename | Description | Suggested Style |
| :--- | :--- | :--- |
| `ambient_hum.mp3` | Background loop | Low frequency sci-fi drone, spaceship idle (~60s loop) |
| `hover_tick.mp3` | Hover over buttons/stems | High pitch digital blip, very short (0.05s) |
| `hover_core.mp3` | Hover over the main reactor | Heavier mechanical latching sound or bass wub |
| `click_engage.mp3` | Clicking the reactor | Heavy airlock seal or hydraulic piston |
| `process_start.mp3` | Processing begins | Turbine spool up or energy charge |
| `process_loop.mp3` | Processing active loop | Data processing chatter or computer thinking |
| `success_chime.mp3` | Task complete | "Zelda secret" style but cybernetic/crystal clear |
| `error_buzz.mp3` | Task failed | Low buzz, "access denied", glitch noise |
| `stem_active.mp3` | Stem extraction successful | Single high-tech ping per stem |
| `glitch_noise.mp3` | Occasional UI glitch | Static burst or dataMoshing sound |

## 3. Recommended Sources (Free/Paid)

- **Splice.com**: Search for "UI", "Sci-Fi", "HUD", "Glitch"
- **Freesound.org**: Look for Creative Commons 0 assets.
- **Kenney.nl**: "Sci-Fi Sounds" pack (Free)

## 4. Integration

The application is already configured to load these exact filenames. Once you drop them into the folder, the `SoundSystem` component will automatically preload and trigger them based on UI state.
