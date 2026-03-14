#pragma once
#include <JuceHeader.h>

namespace stem_fx {

namespace ParamIDs {
    // Gate
    static const juce::String gateEnabled = "gateEnabled";
    static const juce::String gateThreshold = "gateThreshold";
    static const juce::String gateRatio = "gateRatio";
    static const juce::String gateAttack = "gateAttack";
    static const juce::String gateRelease = "gateRelease";
    
    // DeReverb
    static const juce::String dereverbEnabled = "dereverbEnabled";
    static const juce::String dereverbThreshold = "dereverbThreshold";
    static const juce::String dereverbAmount = "dereverbAmount";
    static const juce::String dereverbRelease = "dereverbRelease";
    
    // Filter
    static const juce::String filterEnabled = "filterEnabled";
    static const juce::String filterHP = "filterHP";
    static const juce::String filterLP = "filterLP";
    
    // Phaser
    static const juce::String phaserEnabled = "phaserEnabled";
    static const juce::String phaserRate = "phaserRate";
    static const juce::String phaserDepth = "phaserDepth";
    static const juce::String phaserFeedback = "phaserFeedback";
    static const juce::String phaserMix = "phaserMix";
    
    // Compressor
    static const juce::String compEnabled = "compEnabled";
    static const juce::String compThreshold = "compThreshold";
    static const juce::String compRatio = "compRatio";
    static const juce::String compAttack = "compAttack";
    static const juce::String compRelease = "compRelease";
    static const juce::String compMakeup = "compMakeup";
    
    // Width
    static const juce::String widthEnabled = "widthEnabled";
    static const juce::String widthAmount = "widthAmount";
    
    // Reverb
    static const juce::String reverbEnabled = "reverbEnabled";
    static const juce::String reverbRoomSize = "reverbRoomSize";
    static const juce::String reverbDamping = "reverbDamping";
    static const juce::String reverbMix = "reverbMix";
    
    // Master
    static const juce::String inputGain = "inputGain";
    static const juce::String outputGain = "outputGain";
    static const juce::String bypassAll = "bypassAll";
}

inline juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout()
{
    juce::AudioProcessorValueTreeState::ParameterLayout layout;
    
    // Gate
    layout.add(std::make_unique<juce::AudioParameterBool>(ParamIDs::gateEnabled, "Gate Enable", false));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::gateThreshold, "Gate Threshold", 
        juce::NormalisableRange<float>(-80.0f, 0.0f, 0.1f), -40.0f, "dB"));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::gateRatio, "Gate Ratio",
        juce::NormalisableRange<float>(1.0f, 20.0f, 0.1f), 4.0f, ":1"));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::gateAttack, "Gate Attack",
        juce::NormalisableRange<float>(0.1f, 100.0f, 0.1f, 0.5f), 2.0f, "ms"));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::gateRelease, "Gate Release",
        juce::NormalisableRange<float>(10.0f, 1000.0f, 1.0f, 0.5f), 100.0f, "ms"));
    
    // DeReverb
    layout.add(std::make_unique<juce::AudioParameterBool>(ParamIDs::dereverbEnabled, "DeReverb Enable", false));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::dereverbThreshold, "DeReverb Threshold",
        juce::NormalisableRange<float>(-80.0f, 0.0f, 0.1f), -30.0f, "dB"));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::dereverbAmount, "DeReverb Amount",
        juce::NormalisableRange<float>(0.0f, 100.0f, 0.1f), 40.0f, "%"));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::dereverbRelease, "DeReverb Release",
        juce::NormalisableRange<float>(50.0f, 500.0f, 1.0f, 0.5f), 200.0f, "ms"));
    
    // Filter
    layout.add(std::make_unique<juce::AudioParameterBool>(ParamIDs::filterEnabled, "Filter Enable", false));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::filterHP, "High Pass",
        juce::NormalisableRange<float>(20.0f, 1000.0f, 1.0f, 0.3f), 20.0f, "Hz"));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::filterLP, "Low Pass",
        juce::NormalisableRange<float>(1000.0f, 20000.0f, 1.0f, 0.3f), 20000.0f, "Hz"));
    
    // Phaser
    layout.add(std::make_unique<juce::AudioParameterBool>(ParamIDs::phaserEnabled, "Phaser Enable", false));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::phaserRate, "Phaser Rate",
        juce::NormalisableRange<float>(0.1f, 10.0f, 0.01f, 0.5f), 0.5f, "Hz"));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::phaserDepth, "Phaser Depth",
        juce::NormalisableRange<float>(0.0f, 100.0f, 0.1f), 50.0f, "%"));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::phaserFeedback, "Phaser Feedback",
        juce::NormalisableRange<float>(0.0f, 95.0f, 0.1f), 50.0f, "%"));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::phaserMix, "Phaser Mix",
        juce::NormalisableRange<float>(0.0f, 100.0f, 0.1f), 50.0f, "%"));
    
    // Compressor
    layout.add(std::make_unique<juce::AudioParameterBool>(ParamIDs::compEnabled, "Comp Enable", false));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::compThreshold, "Comp Threshold",
        juce::NormalisableRange<float>(-60.0f, 0.0f, 0.1f), -20.0f, "dB"));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::compRatio, "Comp Ratio",
        juce::NormalisableRange<float>(1.0f, 20.0f, 0.1f), 2.5f, ":1"));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::compAttack, "Comp Attack",
        juce::NormalisableRange<float>(0.1f, 100.0f, 0.1f, 0.5f), 10.0f, "ms"));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::compRelease, "Comp Release",
        juce::NormalisableRange<float>(10.0f, 1000.0f, 1.0f, 0.5f), 100.0f, "ms"));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::compMakeup, "Comp Makeup",
        juce::NormalisableRange<float>(0.0f, 24.0f, 0.1f), 0.0f, "dB"));
    
    // Width
    layout.add(std::make_unique<juce::AudioParameterBool>(ParamIDs::widthEnabled, "Width Enable", false));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::widthAmount, "Width Amount",
        juce::NormalisableRange<float>(0.0f, 300.0f, 1.0f), 100.0f, "%"));
    
    // Reverb
    layout.add(std::make_unique<juce::AudioParameterBool>(ParamIDs::reverbEnabled, "Reverb Enable", false));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::reverbRoomSize, "Reverb Room",
        juce::NormalisableRange<float>(0.0f, 100.0f, 0.1f), 50.0f, "%"));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::reverbDamping, "Reverb Damping",
        juce::NormalisableRange<float>(0.0f, 100.0f, 0.1f), 50.0f, "%"));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::reverbMix, "Reverb Mix",
        juce::NormalisableRange<float>(0.0f, 100.0f, 0.1f), 30.0f, "%"));
    
    // Master
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::inputGain, "Input Gain",
        juce::NormalisableRange<float>(-24.0f, 24.0f, 0.1f), 0.0f, "dB"));
    layout.add(std::make_unique<juce::AudioParameterFloat>(ParamIDs::outputGain, "Output Gain",
        juce::NormalisableRange<float>(-24.0f, 24.0f, 0.1f), 0.0f, "dB"));
    layout.add(std::make_unique<juce::AudioParameterBool>(ParamIDs::bypassAll, "Bypass All", false));
    
    return layout;
}

} // namespace stem_fx
