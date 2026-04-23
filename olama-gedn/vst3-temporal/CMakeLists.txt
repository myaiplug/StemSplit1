cmake_minimum_required(VERSION 3.22)
project(TemporalPortalVST3 VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

include(FetchContent)

FetchContent_Declare(
    JUCE
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG 8.0.4
)
FetchContent_MakeAvailable(JUCE)

juce_add_plugin(TemporalPortal
    COMPANY_NAME "MyAiPlugin"
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    COPY_PLUGIN_AFTER_BUILD FALSE
    PLUGIN_MANUFACTURER_CODE MyAP
    PLUGIN_CODE TpP0
    FORMATS VST3
    PRODUCT_NAME "Temporal Portal"
)

target_sources(TemporalPortal
    PRIVATE
        Source/PluginProcessor.cpp
        Source/PluginProcessor.h
        Source/PluginEditor.cpp
        Source/PluginEditor.h
)

target_compile_definitions(TemporalPortal
    PUBLIC
        JUCE_WEB_BROWSER=1
        JUCE_USE_CURL=0
)

target_link_libraries(TemporalPortal
    PRIVATE
        juce::juce_audio_utils
        juce::juce_dsp
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags
)

juce_generate_juce_header(TemporalPortal)

juce_add_binary_data(TemporalPortalAssets
    SOURCES
        assets/temporal.html
        assets/rubberband-worker.js
        assets/soundtouch-worklet.js
)

target_link_libraries(TemporalPortal PRIVATE TemporalPortalAssets)

# Ensure the built VST3 bundle always contains the frontend assets.
add_custom_command(TARGET TemporalPortal_VST3 POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory "$<TARGET_FILE_DIR:TemporalPortal_VST3>/../Resources"
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${CMAKE_CURRENT_SOURCE_DIR}/assets/temporal.html"
        "$<TARGET_FILE_DIR:TemporalPortal_VST3>/../Resources/temporal.html"
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${CMAKE_CURRENT_SOURCE_DIR}/assets/rubberband-worker.js"
        "$<TARGET_FILE_DIR:TemporalPortal_VST3>/../Resources/rubberband-worker.js"
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${CMAKE_CURRENT_SOURCE_DIR}/assets/soundtouch-worklet.js"
        "$<TARGET_FILE_DIR:TemporalPortal_VST3>/../Resources/soundtouch-worklet.js"
)
