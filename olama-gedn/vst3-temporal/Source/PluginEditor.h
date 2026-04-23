#pragma once

#include <JuceHeader.h>
#include <functional>
#include "PluginProcessor.h"

class TemporalBridgeBrowser final : public juce::WebBrowserComponent
{
public:
    using BridgeHandler = std::function<void(const juce::String&, const juce::String&)>;

    TemporalBridgeBrowser();

    void setBridgeHandler(BridgeHandler handlerIn);

    bool pageAboutToLoad(const juce::String& newURL) override;

private:
    BridgeHandler handler;
};

class TemporalPortalAudioProcessorEditor : public juce::AudioProcessorEditor
                                               , private juce::Timer
{
public:
    explicit TemporalPortalAudioProcessorEditor(TemporalPortalAudioProcessor&);
    ~TemporalPortalAudioProcessorEditor() override = default;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    void timerCallback() override;
    bool ensureAssetsExtracted();
    void loadFrontend();
    void handleBridgeParam(const juce::String& paramId, const juce::String& valueText);
    void syncHostParametersToUI();

    TemporalPortalAudioProcessor& processor;
    TemporalBridgeBrowser browser;
    juce::Label fallbackLabel;
    juce::File extractedAssetsRoot;
    bool uiLoaded = false;
    bool suppressUiToHost = false;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(TemporalPortalAudioProcessorEditor)
};
