#pragma once

#include <JuceHeader.h>

class TemporalPortalAudioProcessor : public juce::AudioProcessor
{
public:
    TemporalPortalAudioProcessor();
    ~TemporalPortalAudioProcessor() override = default;

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;

    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return JucePlugin_Name; }

    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.2; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}

    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    juce::AudioProcessorValueTreeState& getAPVTS() { return apvts; }

    static juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

private:
    void updateDSPFromParameters();
    void applyEnginePostProcessing(juce::AudioBuffer<float>& buffer, int engineIndex, int dawProfile, float slowAmount, float sauceAmount);

    juce::AudioProcessorValueTreeState apvts;

    juce::dsp::ProcessorDuplicator<juce::dsp::IIR::Filter<float>, juce::dsp::IIR::Coefficients<float>> eqLow;
    juce::dsp::ProcessorDuplicator<juce::dsp::IIR::Filter<float>, juce::dsp::IIR::Coefficients<float>> eqHigh;
    juce::dsp::Compressor<float> compressor;
    juce::dsp::Chorus<float> chorus;
    juce::Reverb reverb;

    juce::AudioBuffer<float> dryBuffer;
    double currentSampleRate = 44100.0;
    std::array<float, 2> smearState { 0.0f, 0.0f };
    double granularPhase = 0.0;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(TemporalPortalAudioProcessor)
};
