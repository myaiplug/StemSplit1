# StemSplit FX VST3 Project

This is a **JUCE 7/8** based VST3 plugin project that duplicates the audio processing chain from the Python/React prototype.

## Project Structure

- **Source/DSP/FXChain.h**: 
  - Contains the C++ DSP implementation of the effect chain:
    - Noise Gate
    - De-Reverb (Transient Shaper / Expander logic)
    - High-Pass Filter
    - Phaser
    - Compressor
    - Stereo Width
    - Reverb
- **Source/PluginProcessor.cpp**:
  - Manages the audio parameters (APVTS) and connects them to the DSP chain.
  - Matches the parameter IDs from the React frontend (e.g., `gate_threshold`, `reverb_mix`).
- **Source/PluginEditor.cpp**:
  - Hosts a `WebBrowserComponent` (WebView2 on Windows) to render the UI.
  - Currently pointed to `http://localhost:3000/embed/fx-rack`.

## Prerequisites

1.  **CMake** (3.20 or higher)
2.  **Visual Studio 2022** (with "Desktop development with C++" workload)
3.  **JUCE Framework**:
    - Download JUCE from [juce.com](https://juce.com/).
    - Extract it to a folder (e.g., `C:/JUCE`).
    - **Crucial**: You must edit `CMakeLists.txt` line 6 to point to your JUCE installation path if it is not in `~/JUCE` or `C:/JUCE`.

## How to Build

1.  Open this folder in VS Code or a Terminal.
2.  Create a build directory:
    ```bash
    mkdir build
    cd build
    ```
3.  Generate the Visual Studio solution:
    ```bash
    cmake .. -G "Visual Studio 17 2022" -DJUCE_GLOBAL_MODULE_PATHS="C:/JUCE/modules"
    ```
    *(Replace `C:/JUCE/modules` with your actual JUCE modules path)*.
4.  Open the generated `.sln` file in Visual Studio.
5.  Select **Release** configuration and **Build Solution**.
6.  The `.vst3` file will be generated in `build/VST3_Project_artefacts/Release/VST3/`.

## Connecting the React UI

The C++ plugin uses a WebView to display the interface. To make it work:

1.  **Development**: Ensure your React app is running (`npm run dev`) on port 3000. The plugin will load `http://localhost:3000/embed/fx-rack`.
2.  **Production**: 
    - Build your React app (`npm run build`).
    - Modify `Source/PluginEditor.cpp` to serve the static files from the binary resources instead of a local URL.
