cmake_minimum_required(VERSION 3.22)

project(StemSplitFX VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)
FetchContent_Declare(
    JUCE
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG        8.0.0
)
FetchContent_MakeAvailable(JUCE) 

juce_add_plugin(StemSplitFX
    COMPANY_NAME "NoDAW Studio: StemSplit"
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS TRUE
    COPY_PLUGIN_AFTER_BUILD TRUE
    PLUGIN_MANUFACTURER_CODE "StSp"
    PLUGIN_CODE "SS1.3"
    FORMATS VST3 Standalone
    PRODUCT_NAME "StemSplit"
    VST3_CATEGORIES "Fx" "Tools"
)

target_sources(StemSplit
    PRIVATE
        Source/PluginProcessor.cpp
        Source/PluginProcessor.h
        Source/PluginEditor.cpp
        Source/PluginEditor.h
        Source/DSP/FXChain.h
        Source/DSP/Parameters.h
        Source/UI/PremiumLookAndFeel.h
        Source/UI/FXModuleComponent.h
        Source/UI/GateModule.h
)

target_compile_definitions(StemSplit
    PUBLIC
        JUCE_WEB_BROWSER=1
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0
        JUCE_DISPLAY_SPLASH_SCREEN=0
        JUCE_REPORT_APP_USAGE=0
)

juce_add_binary_data(StemSplit_Assets
    SOURCES
        Resources/ui.zip
)

target_link_libraries(StemSplit
    PRIVATE
        StemSplitFX_Assets
        juce::juce_audio_utils
        juce::juce_audio_processors
        juce::juce_dsp
        juce::juce_gui_basics
        juce::juce_gui_extra
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags
)

juce_generate_juce_header(StemSplit)
