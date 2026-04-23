#include "PluginProcessor.h"
#include "PluginEditor.h"

namespace
{
float clampf(float v, float lo, float hi)
{
    return juce::jlimit(lo, hi, v);
}

float getParamValue(juce::AudioProcessorValueTreeState& apvts, const juce::String& id, float fallback)
{
    if (auto* p = apvts.getRawParameterValue(id))
        return p->load();
    return fallback;
}

float softClip(float x)
{
    // Fast smooth saturation used by tape/rubber-like engines.
    return std::tanh(x);
}
}

TemporalPortalAudioProcessor::TemporalPortalAudioProcessor()
    : AudioProcessor(BusesProperties().withInput("Input", juce::AudioChannelSet::stereo(), true)
                                      .withOutput("Output", juce::AudioChannelSet::stereo(), true)),
      apvts(*this, nullptr, "PARAMS", createParameterLayout())
{
}

void TemporalPortalAudioProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    currentSampleRate = sampleRate;

    juce::dsp::ProcessSpec spec;
    spec.sampleRate = sampleRate;
    spec.maximumBlockSize = static_cast<juce::uint32>(samplesPerBlock);
    spec.numChannels = static_cast<juce::uint32>(juce::jmax(1, getTotalNumOutputChannels()));

    eqLow.prepare(spec);
    eqHigh.prepare(spec);
    compressor.prepare(spec);
    chorus.prepare(spec);

    eqLow.state = juce::dsp::IIR::Coefficients<float>::makeLowShelf(sampleRate, 180.0, 0.707f, 1.0f);
    eqHigh.state = juce::dsp::IIR::Coefficients<float>::makeHighShelf(sampleRate, 6500.0, 0.707f, 1.0f);

    compressor.setThreshold(-18.0f);
    compressor.setRatio(2.5f);
    compressor.setAttack(5.0f);
    compressor.setRelease(120.0f);

    chorus.setRate(0.12f);
    chorus.setDepth(0.2f);
    chorus.setCentreDelay(6.0f);
    chorus.setFeedback(0.0f);
    chorus.setMix(0.22f);

    reverb.reset();

    dryBuffer.setSize(getTotalNumOutputChannels(), samplesPerBlock);
}

void TemporalPortalAudioProcessor::releaseResources()
{
}

bool TemporalPortalAudioProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
    const auto in = layouts.getMainInputChannelSet();
    const auto out = layouts.getMainOutputChannelSet();
    return (in == out) && (out == juce::AudioChannelSet::mono() || out == juce::AudioChannelSet::stereo());
}

void TemporalPortalAudioProcessor::updateDSPFromParameters()
{
    const auto timeShift = getParamValue(apvts, "timeShift", 100.0f);
    const auto pitchBend = getParamValue(apvts, "pitchBend", 0.0f);
    const auto key = getParamValue(apvts, "key", 0.0f);
    const auto detune = getParamValue(apvts, "detune", 0.0f);
    const auto sauce = clampf(getParamValue(apvts, "sauce", 0.0f), 0.0f, 100.0f) / 100.0f;
    const auto engine = juce::jlimit(0, 4, static_cast<int>(std::round(getParamValue(apvts, "engine", 0.0f))));
    const auto dawProfile = juce::jlimit(0, 3, static_cast<int>(std::round(getParamValue(apvts, "dawProfile", 0.0f))));
    const auto slowAmount = clampf((100.0f - timeShift) / 50.0f, 0.0f, 1.0f);

    // 0=Generic, 1=Ableton, 2=FL Studio, 3=Reaper
    float profileLowTilt = 0.0f;
    float profileHighTilt = 0.0f;
    float profileCompTightness = 0.0f;
    float profileSpace = 0.0f;

    switch (dawProfile)
    {
        case 1: // Ableton
            profileLowTilt = -0.5f;
            profileHighTilt = 0.8f;
            profileCompTightness = 0.3f;
            profileSpace = -0.04f;
            break;
        case 2: // FL Studio
            profileLowTilt = 0.9f;
            profileHighTilt = -0.3f;
            profileCompTightness = 0.1f;
            profileSpace = 0.02f;
            break;
        case 3: // Reaper
            profileLowTilt = 0.2f;
            profileHighTilt = 0.2f;
            profileCompTightness = -0.15f;
            profileSpace = 0.05f;
            break;
        default:
            break;
    }

    const auto totalSemitones = pitchBend + key + (detune / 100.0f);

    auto lowGainDb = sauce * 3.5f + totalSemitones * 0.2f;
    auto highGainDb = sauce * 2.4f + totalSemitones * 0.15f;

    if (engine == 1) // Clean slow
    {
        lowGainDb += slowAmount * 1.2f;
        highGainDb -= slowAmount * 0.4f;
    }
    else if (engine == 2) // Rubber drag
    {
        lowGainDb += slowAmount * 3.2f;
        highGainDb -= slowAmount * 2.1f;
    }
    else if (engine == 3) // Stretch haze
    {
        lowGainDb += slowAmount * 2.0f;
        highGainDb -= slowAmount * 4.0f;
    }
    else if (engine == 4) // Granular drift
    {
        lowGainDb += slowAmount * 0.8f;
        highGainDb -= slowAmount * 3.0f;
    }

    lowGainDb += profileLowTilt;
    highGainDb += profileHighTilt;

    eqLow.state = juce::dsp::IIR::Coefficients<float>::makeLowShelf(currentSampleRate, 180.0, 0.707f, juce::Decibels::decibelsToGain(lowGainDb));
    eqHigh.state = juce::dsp::IIR::Coefficients<float>::makeHighShelf(currentSampleRate, 6500.0, 0.707f, juce::Decibels::decibelsToGain(highGainDb));

    auto threshold = -18.0f - sauce * 10.0f;
    auto ratio = 2.0f + sauce * 2.5f;
    auto attackMs = (0.004f + sauce * 0.006f) * 1000.0f;
    auto releaseMs = (0.12f + sauce * 0.18f) * 1000.0f;

    if (engine == 1)
    {
        threshold += 2.0f;
        ratio -= 0.4f;
    }
    else if (engine == 2)
    {
        threshold -= 2.5f * slowAmount;
        ratio += 1.0f * slowAmount;
        releaseMs += 80.0f * slowAmount;
    }
    else if (engine == 3)
    {
        threshold -= 4.0f * slowAmount;
        ratio += 0.8f * slowAmount;
        attackMs += 8.0f * slowAmount;
    }
    else if (engine == 4)
    {
        threshold -= 1.5f * slowAmount;
        ratio += 0.6f * slowAmount;
    }

    ratio += profileCompTightness;
    threshold -= profileCompTightness * 1.2f;

    compressor.setThreshold(threshold);
    compressor.setRatio(ratio);
    compressor.setAttack(attackMs);
    compressor.setRelease(releaseMs);

    const auto baseRate = clampf(timeShift / 100.0f, 0.5f, 2.0f);
    auto modRate = clampf(0.08f + sauce * 0.42f + (baseRate - 1.0f) * 0.2f, 0.02f, 2.0f);
    auto modDepth = clampf(0.1f + sauce * 0.7f, 0.0f, 1.0f);

    if (engine == 1)
    {
        modRate *= 0.6f;
        modDepth *= 0.35f;
    }
    else if (engine == 2)
    {
        modRate = clampf(modRate * (0.75f + slowAmount * 0.2f), 0.02f, 2.0f);
        modDepth = clampf(modDepth * (1.2f + slowAmount * 0.3f), 0.0f, 1.0f);
    }
    else if (engine == 3)
    {
        modRate = clampf(modRate * 0.45f, 0.02f, 2.0f);
        modDepth = clampf(modDepth * 0.55f, 0.0f, 1.0f);
    }
    else if (engine == 4)
    {
        modRate = clampf(modRate * 1.6f, 0.02f, 2.0f);
        modDepth = clampf(modDepth * 0.7f, 0.0f, 1.0f);
    }

    chorus.setRate(modRate);
    chorus.setCentreDelay(clampf(4.0f + (100.0f - timeShift) * 0.05f, 1.0f, 20.0f));
    chorus.setFeedback(0.0f);

    juce::Reverb::Parameters rp;
    rp.roomSize = clampf(0.2f + sauce * 0.4f, 0.0f, 1.0f);
    rp.damping = clampf(0.3f + sauce * 0.2f, 0.0f, 1.0f);
    rp.wetLevel = clampf(sauce * 0.18f, 0.0f, 1.0f);

    if (engine == 2)
    {
        rp.wetLevel = clampf(rp.wetLevel + slowAmount * 0.05f, 0.0f, 1.0f);
    }
    else if (engine == 3)
    {
        rp.roomSize = clampf(0.65f + slowAmount * 0.30f, 0.0f, 1.0f);
        rp.damping = clampf(0.55f + slowAmount * 0.30f, 0.0f, 1.0f);
        rp.wetLevel = clampf(0.18f + sauce * 0.20f + slowAmount * 0.20f, 0.0f, 1.0f);
    }
    else if (engine == 4)
    {
        rp.roomSize = clampf(rp.roomSize + slowAmount * 0.15f, 0.0f, 1.0f);
        rp.wetLevel = clampf(rp.wetLevel + slowAmount * 0.08f, 0.0f, 1.0f);
    }

    modDepth = clampf(modDepth + profileCompTightness * 0.04f, 0.0f, 1.0f);
    chorus.setDepth(modDepth);

    rp.roomSize = clampf(rp.roomSize + profileSpace, 0.0f, 1.0f);
    rp.wetLevel = clampf(rp.wetLevel + profileSpace * 0.35f, 0.0f, 1.0f);

    rp.dryLevel = 1.0f;
    rp.width = 1.0f;
    rp.freezeMode = 0.0f;
    reverb.setParameters(rp);
}

void TemporalPortalAudioProcessor::applyEnginePostProcessing(juce::AudioBuffer<float>& buffer, int engineIndex, int dawProfile, float slowAmount, float sauceAmount)
{
    if (engineIndex == 0)
        return;

    const auto numCh = buffer.getNumChannels();
    const auto numSamples = buffer.getNumSamples();

    if (engineIndex == 1)
    {
        // Clean slow: minimal coloration, just a touch of smoothing in slow territory.
        for (int ch = 0; ch < numCh; ++ch)
        {
            auto* x = buffer.getWritePointer(ch);
            auto prev = smearState[static_cast<size_t>(juce::jmin(ch, 1))];
            for (int i = 0; i < numSamples; ++i)
            {
                const auto blended = (x[i] * (1.0f - 0.06f * slowAmount)) + (prev * 0.06f * slowAmount);
                prev = blended;
                x[i] = blended;
            }
            smearState[static_cast<size_t>(juce::jmin(ch, 1))] = prev;
        }
        return;
    }

    if (engineIndex == 2)
    {
        // Rubber drag: warmer saturation and deeper body.
        auto satDrive = 1.0f + (slowAmount * 1.3f) + (sauceAmount * 0.8f);
        if (dawProfile == 1) satDrive *= 0.92f;      // Ableton cleaner
        else if (dawProfile == 2) satDrive *= 1.10f; // FL punchier
        else if (dawProfile == 3) satDrive *= 0.98f; // Reaper neutral

        for (int ch = 0; ch < numCh; ++ch)
        {
            auto* x = buffer.getWritePointer(ch);
            for (int i = 0; i < numSamples; ++i)
                x[i] = softClip(x[i] * satDrive) * (0.80f + 0.20f * (1.0f - slowAmount));
        }
        return;
    }

    if (engineIndex == 3)
    {
        // Stretch haze: long smear for ambient/paulstretch-like tails.
        const auto smear = 0.14f + (slowAmount * 0.26f);
        for (int ch = 0; ch < numCh; ++ch)
        {
            auto* x = buffer.getWritePointer(ch);
            auto prev = smearState[static_cast<size_t>(juce::jmin(ch, 1))];
            for (int i = 0; i < numSamples; ++i)
            {
                const auto v = (x[i] * (1.0f - smear)) + (prev * smear);
                prev = v;
                x[i] = v;
            }
            smearState[static_cast<size_t>(juce::jmin(ch, 1))] = prev;
        }
        return;
    }

    if (engineIndex == 4)
    {
        // Granular drift: rhythmic grain envelope for chopped slow texture.
        auto hz = 4.0 + (1.0 - slowAmount) * 5.0;
        if (dawProfile == 1) hz *= 0.9;      // Ableton smoother
        else if (dawProfile == 2) hz *= 1.1; // FL more animated

        const auto phaseInc = juce::MathConstants<double>::twoPi * hz / juce::jmax(1.0, currentSampleRate);
        for (int i = 0; i < numSamples; ++i)
        {
            const auto env = static_cast<float>(0.62 + 0.38 * std::pow(std::sin(granularPhase), 2.0));
            granularPhase += phaseInc;
            if (granularPhase > juce::MathConstants<double>::twoPi)
                granularPhase -= juce::MathConstants<double>::twoPi;

            for (int ch = 0; ch < numCh; ++ch)
                buffer.getWritePointer(ch)[i] *= env;
        }
    }
}

void TemporalPortalAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    juce::ignoreUnused(midiMessages);
    juce::ScopedNoDenormals noDenormals;

    const auto numInputChannels = getTotalNumInputChannels();
    const auto numOutputChannels = getTotalNumOutputChannels();

    for (auto i = numInputChannels; i < numOutputChannels; ++i)
        buffer.clear(i, 0, buffer.getNumSamples());

    if (buffer.getNumSamples() <= 0)
        return;

    if (dryBuffer.getNumChannels() != buffer.getNumChannels() || dryBuffer.getNumSamples() != buffer.getNumSamples())
        dryBuffer.setSize(buffer.getNumChannels(), buffer.getNumSamples(), false, false, true);

    dryBuffer.makeCopyOf(buffer, true);

    updateDSPFromParameters();

    juce::dsp::AudioBlock<float> block(buffer);
    juce::dsp::ProcessContextReplacing<float> context(block);

    eqLow.process(context);
    eqHigh.process(context);
    compressor.process(context);
    chorus.process(context);

    if (buffer.getNumChannels() >= 2)
        reverb.processStereo(buffer.getWritePointer(0), buffer.getWritePointer(1), buffer.getNumSamples());
    else
        reverb.processMono(buffer.getWritePointer(0), buffer.getNumSamples());

    const auto wetDry = clampf(getParamValue(apvts, "wetDry", 100.0f), 0.0f, 100.0f) / 100.0f;
    const auto sauce = clampf(getParamValue(apvts, "sauce", 0.0f), 0.0f, 100.0f) / 100.0f;
    const auto timeShift = clampf(getParamValue(apvts, "timeShift", 100.0f), 50.0f, 200.0f);
    const auto slowAmount = clampf((100.0f - timeShift) / 50.0f, 0.0f, 1.0f);
    const auto engine = juce::jlimit(0, 4, static_cast<int>(std::round(getParamValue(apvts, "engine", 0.0f))));
    const auto dawProfile = juce::jlimit(0, 3, static_cast<int>(std::round(getParamValue(apvts, "dawProfile", 0.0f))));
    const auto output = clampf(getParamValue(apvts, "output", 50.0f), 0.0f, 100.0f);

    for (int ch = 0; ch < buffer.getNumChannels(); ++ch)
    {
        auto* wet = buffer.getWritePointer(ch);
        const auto* dry = dryBuffer.getReadPointer(ch);
        for (int i = 0; i < buffer.getNumSamples(); ++i)
            wet[i] = dry[i] * (1.0f - wetDry) + wet[i] * wetDry;
    }

    applyEnginePostProcessing(buffer, engine, dawProfile, slowAmount, sauce);

    const auto baseGain = (output / 50.0f) * (output / 50.0f);
    const auto sauceLoudness = 1.0f + sauce * 0.35f;
    buffer.applyGain(baseGain * sauceLoudness);
}

juce::AudioProcessorEditor* TemporalPortalAudioProcessor::createEditor()
{
    return new TemporalPortalAudioProcessorEditor(*this);
}

void TemporalPortalAudioProcessor::getStateInformation(juce::MemoryBlock& destData)
{
    if (auto xml = apvts.copyState().createXml())
        copyXmlToBinary(*xml, destData);
}

void TemporalPortalAudioProcessor::setStateInformation(const void* data, int sizeInBytes)
{
    if (auto xml = getXmlFromBinary(data, sizeInBytes))
        apvts.replaceState(juce::ValueTree::fromXml(*xml));
}

juce::AudioProcessorValueTreeState::ParameterLayout TemporalPortalAudioProcessor::createParameterLayout()
{
    std::vector<std::unique_ptr<juce::RangedAudioParameter>> params;

    params.push_back(std::make_unique<juce::AudioParameterFloat>("timeShift", "Time Shift", juce::NormalisableRange<float>(50.0f, 200.0f, 0.1f), 100.0f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>("pitchBend", "Pitch Bend", juce::NormalisableRange<float>(-12.0f, 12.0f, 0.01f), 0.0f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>("key", "Key", juce::NormalisableRange<float>(-12.0f, 12.0f, 1.0f), 0.0f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>("detune", "Detune", juce::NormalisableRange<float>(-100.0f, 100.0f, 0.1f), 0.0f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>("sauce", "Sauce", juce::NormalisableRange<float>(0.0f, 100.0f, 0.1f), 0.0f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>("wetDry", "Wet Dry", juce::NormalisableRange<float>(0.0f, 100.0f, 0.1f), 100.0f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>("output", "Output", juce::NormalisableRange<float>(0.0f, 100.0f, 0.1f), 50.0f));

    params.push_back(std::make_unique<juce::AudioParameterChoice>(
        "engine",
        "Engine",
        juce::StringArray{ "Classic", "Clean Slow", "Rubber Drag", "Stretch Haze", "Granular Drift" },
        0));

    params.push_back(std::make_unique<juce::AudioParameterChoice>(
        "dawProfile",
        "DAW Profile",
        juce::StringArray{ "Generic", "Ableton", "FL Studio", "Reaper" },
        0));

    return { params.begin(), params.end() };
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new TemporalPortalAudioProcessor();
}
