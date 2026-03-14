#pragma once
#include <JuceHeader.h>
#include "PluginProcessor.h"

class StemSplitFXAudioProcessorEditor : public juce::AudioProcessorEditor
{
public:
    StemSplitFXAudioProcessorEditor (StemSplitFXAudioProcessor&);
    ~StemSplitFXAudioProcessorEditor() override;

    void paint (juce::Graphics&) override;
    void resized() override;

private:
    StemSplitFXAudioProcessor& audioProcessor;
    
    // The WebView component that will display the full Stem Split app
    std::unique_ptr<juce::WebBrowserComponent> webView;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (StemSplitFXAudioProcessorEditor)
};
