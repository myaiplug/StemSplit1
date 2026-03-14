#include "PluginProcessor.h"
#include "PluginEditor.h"
#include "DSP/Parameters.h"

StemSplitFXAudioProcessor::StemSplitFXAudioProcessor()
    : AudioProcessor(BusesProperties()
                    .withInput("Input", juce::AudioChannelSet::stereo(), true)
                    .withOutput("Output", juce::AudioChannelSet::stereo(), true)),
      apvts(*this, nullptr, "PARAMETERS", stem_fx::createParameterLayout())
{
}

StemSplitFXAudioProcessor::~StemSplitFXAudioProcessor()
{
}

void StemSplitFXAudioProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    juce::dsp::ProcessSpec spec;
    spec.sampleRate = sampleRate;
    spec.maximumBlockSize = static_cast<juce::uint32>(samplesPerBlock);
    spec.numChannels = 2;
    
    fxChain.prepare(spec);
    inputGain.prepare(spec);
    outputGain.prepare(spec);
    inputGain.setRampDurationSeconds(0.05);
    outputGain.setRampDurationSeconds(0.05);
}

void StemSplitFXAudioProcessor::releaseResources()
{
    fxChain.reset();
}

bool StemSplitFXAudioProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
    if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
        return false;
    
    if (layouts.getMainOutputChannelSet() != layouts.getMainInputChannelSet())
        return false;
    
    return true;
}

void StemSplitFXAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    juce::ScopedNoDenormals noDenormals;
    
    if (apvts.getRawParameterValue(stem_fx::ParamIDs::bypassAll)->load() > 0.5f)
        return;
    
    auto totalNumInputChannels = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();
    
    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
        buffer.clear(i, 0, buffer.getNumSamples());
    
    updateFXChainParameters();
    
    juce::dsp::AudioBlock<float> block(buffer);
    juce::dsp::ProcessContextReplacing<float> context(block);
    
    inputGain.setGainDecibels(apvts.getRawParameterValue(stem_fx::ParamIDs::inputGain)->load());
    inputGain.process(context);
    
    fxChain.process(context);
    
    outputGain.setGainDecibels(apvts.getRawParameterValue(stem_fx::ParamIDs::outputGain)->load());
    outputGain.process(context);
}

void StemSplitFXAudioProcessor::updateFXChainParameters()
{
    fxChain.params.gateEnabled = apvts.getRawParameterValue(stem_fx::ParamIDs::gateEnabled)->load() > 0.5f;
    fxChain.params.gateThreshold = apvts.getRawParameterValue(stem_fx::ParamIDs::gateThreshold)->load();
    fxChain.params.gateRatio = apvts.getRawParameterValue(stem_fx::ParamIDs::gateRatio)->load();
    fxChain.params.gateAttack = apvts.getRawParameterValue(stem_fx::ParamIDs::gateAttack)->load();
    fxChain.params.gateRelease = apvts.getRawParameterValue(stem_fx::ParamIDs::gateRelease)->load();
    
    fxChain.params.dereverbEnabled = apvts.getRawParameterValue(stem_fx::ParamIDs::dereverbEnabled)->load() > 0.5f;
    fxChain.params.dereverbThreshold = apvts.getRawParameterValue(stem_fx::ParamIDs::dereverbThreshold)->load();
    fxChain.params.dereverbAmount = apvts.getRawParameterValue(stem_fx::ParamIDs::dereverbAmount)->load();
    fxChain.params.dereverbRelease = apvts.getRawParameterValue(stem_fx::ParamIDs::dereverbRelease)->load();
    
    fxChain.params.filterEnabled = apvts.getRawParameterValue(stem_fx::ParamIDs::filterEnabled)->load() > 0.5f;
    fxChain.params.filterHP = apvts.getRawParameterValue(stem_fx::ParamIDs::filterHP)->load();
    fxChain.params.filterLP = apvts.getRawParameterValue(stem_fx::ParamIDs::filterLP)->load();
    
    fxChain.params.phaserEnabled = apvts.getRawParameterValue(stem_fx::ParamIDs::phaserEnabled)->load() > 0.5f;
    fxChain.params.phaserRate = apvts.getRawParameterValue(stem_fx::ParamIDs::phaserRate)->load();
    fxChain.params.phaserDepth = apvts.getRawParameterValue(stem_fx::ParamIDs::phaserDepth)->load() / 100.0f;
    fxChain.params.phaserFeedback = apvts.getRawParameterValue(stem_fx::ParamIDs::phaserFeedback)->load() / 100.0f;
    fxChain.params.phaserMix = apvts.getRawParameterValue(stem_fx::ParamIDs::phaserMix)->load() / 100.0f;
    
    fxChain.params.compEnabled = apvts.getRawParameterValue(stem_fx::ParamIDs::compEnabled)->load() > 0.5f;
    fxChain.params.compThreshold = apvts.getRawParameterValue(stem_fx::ParamIDs::compThreshold)->load();
    fxChain.params.compRatio = apvts.getRawParameterValue(stem_fx::ParamIDs::compRatio)->load();
    fxChain.params.compAttack = apvts.getRawParameterValue(stem_fx::ParamIDs::compAttack)->load();
    fxChain.params.compRelease = apvts.getRawParameterValue(stem_fx::ParamIDs::compRelease)->load();
    fxChain.params.compMakeup = apvts.getRawParameterValue(stem_fx::ParamIDs::compMakeup)->load();
    
    fxChain.params.widthEnabled = apvts.getRawParameterValue(stem_fx::ParamIDs::widthEnabled)->load() > 0.5f;
    fxChain.params.widthAmount = apvts.getRawParameterValue(stem_fx::ParamIDs::widthAmount)->load();
    
    fxChain.params.reverbEnabled = apvts.getRawParameterValue(stem_fx::ParamIDs::reverbEnabled)->load() > 0.5f;
    fxChain.params.reverbRoomSize = apvts.getRawParameterValue(stem_fx::ParamIDs::reverbRoomSize)->load();
    fxChain.params.reverbDamping = apvts.getRawParameterValue(stem_fx::ParamIDs::reverbDamping)->load();
    fxChain.params.reverbMix = apvts.getRawParameterValue(stem_fx::ParamIDs::reverbMix)->load();
}

juce::AudioProcessorEditor* StemSplitFXAudioProcessor::createEditor()
{
    return new StemSplitFXAudioProcessorEditor(*this);
}

void StemSplitFXAudioProcessor::getStateInformation(juce::MemoryBlock& destData)
{
    auto state = apvts.copyState();
    std::unique_ptr<juce::XmlElement> xml(state.createXml());
    copyXmlToBinary(*xml, destData);
}

void StemSplitFXAudioProcessor::setStateInformation(const void* data, int sizeInBytes)
{
    std::unique_ptr<juce::XmlElement> xmlState(getXmlFromBinary(data, sizeInBytes));
    
    if (xmlState.get() != nullptr)
        if (xmlState->hasTagName(apvts.state.getType()))
            apvts.replaceState(juce::ValueTree::fromXml(*xmlState));
}

void StemSplitFXAudioProcessor::parameterChanged(const juce::String& parameterID, float newValue)
{
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new StemSplitFXAudioProcessor();
}
