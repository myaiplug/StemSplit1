#pragma once
#include <JuceHeader.h>

namespace stem_fx {

// --- Stereo Widener ---
// Converts L/R -> M/S -> Scales S -> Converts back to L/R
class StereoWidener {
public:
    void prepare(const juce::dsp::ProcessSpec& spec) {
        sampleRate = spec.sampleRate;
    }

    void process(juce::dsp::ProcessContextReplacing<float>& context) {
        auto& block = context.getOutputBlock();
        const auto numSamples = block.getNumSamples();
        const float widthFactor = widthParam / 100.0f; // 0.0 - 3.0 (0% - 300%)

        auto* left = block.getChannelPointer(0);
        auto* right = block.getChannelPointer(1);

        for (size_t i = 0; i < numSamples; ++i) {
            float mid = (left[i] + right[i]) * 0.5f;
            float side = (left[i] - right[i]) * 0.5f;
            
            side *= widthFactor;

            left[i] = mid + side;
            right[i] = mid - side;
        }
    }

    void setWidth(float newWidth) { widthParam = newWidth; }

private:
    double sampleRate = 44100.0;
    float widthParam = 100.0f;
};


// --- Main FX Chain ---
// Combines all modules (Gate, DeReverb, Filter, Phaser, Compressor, Width, Reverb)
class FXChain {
public:
    void prepare(const juce::dsp::ProcessSpec& spec) {
        sampleRate = spec.sampleRate;
        
        gate.prepare(spec);
        compressor.prepare(spec);
        filter.prepare(spec);
        phaser.prepare(spec);
        reverb.prepare(spec);
        widener.prepare(spec);
        
        // DeReverb utilizes Expander logic
        dereverbExpander.prepare(spec);
    }

    void reset() {
        gate.reset();
        compressor.reset();
        filter.reset();
        phaser.reset();
        reverb.reset();
        dereverbExpander.reset();
    }

    // Process Block (Stereo)
    void process(juce::dsp::ProcessContextReplacing<float>& context) {
        // 1. Gate (Dynamics)
        if (params.gateEnabled) {
            gate.setThreshold(params.gateThreshold); // dB
            gate.setRatio(params.gateRatio);
            gate.setAttack(params.gateAttack);
            gate.setRelease(params.gateRelease);
            gate.process(context);
        }

        // 2. De-Reverb (Expander)
        if (params.dereverbEnabled) {
            // Simulated De-Reverb using Expander to clamp tails
            dereverbExpander.setThreshold(params.dereverbThreshold);
            dereverbExpander.setRatio(1.0f + (params.dereverbAmount / 20.0f)); // Map 0-100% to Ratio
            dereverbExpander.setRelease(params.dereverbRelease);
            dereverbExpander.process(context);
        }

        // 3. Filter (EQ/Tone)
        if (params.filterEnabled) {
            *filter.state = *juce::dsp::IIR::Coefficients<float>::makeHighPass(sampleRate, params.filterHP);
            filter.process(context);
            
            // Note: Single pass IIR. For separate LP/HP, chain another filter here.
            // Simplified for this example to just one filter block.
        }

        // 4. Phaser (Modulation)
        if (params.phaserEnabled) {
            phaser.setRate(params.phaserRate);
            phaser.setDepth(params.phaserDepth);
            phaser.setFeedback(params.phaserFeedback);
            phaser.setMix(params.phaserMix);
            phaser.process(context);
        }

        // 5. Compressor (Dynamics)
        if (params.compEnabled) {
            compressor.setThreshold(params.compThreshold);
            compressor.setRatio(params.compRatio);
            compressor.setAttack(params.compAttack);
            compressor.setRelease(params.compRelease);
            // Makeup gain logic
            compressor.process(context);
            
            // Apply makeup manually if needed
            // context.getOutputBlock().multiplyBy(juce::Decibels::decibelsToGain(params.compMakeup));
        }

        // 6. Stereo Width (Spatial)
        if (params.widthEnabled) {
            widener.setWidth(params.widthAmount);
            widener.process(context);
        }

        // 7. Reverb (Spatial)
        if (params.reverbEnabled) {
             juce::dsp::Reverb::Parameters rParams;
             rParams.roomSize = params.reverbRoomSize / 100.0f;
             rParams.damping = params.reverbDamping / 100.0f;
             rParams.wetLevel = params.reverbMix / 100.0f;
             rParams.dryLevel = 1.0f - (rParams.wetLevel * 0.5f);
             reverb.setParameters(rParams);
             reverb.process(context);
        }
    }

    struct Parameters {
        bool gateEnabled = false;
        float gateThreshold = -40.0f, gateRatio = 4.0f, gateAttack = 2.0f, gateRelease = 100.0f;

        bool dereverbEnabled = false;
        float dereverbThreshold = -30.0f, dereverbAmount = 40.0f, dereverbRelease = 200.0f;

        bool filterEnabled = false;
        float filterHP = 20.0f, filterLP = 20000.0f;

        bool phaserEnabled = false;
        float phaserRate = 0.5f, phaserDepth = 0.5f, phaserFeedback = 0.5f, phaserMix = 0.5f;

        bool compEnabled = false;
        float compThreshold = -20.0f, compRatio = 2.5f, compAttack = 10.0f, compRelease = 100.0f, compMakeup = 0.0f;
        
        bool widthEnabled = false;
        float widthAmount = 100.0f;

        bool reverbEnabled = false;
        float reverbRoomSize = 50.0f, reverbDamping = 50.0f, reverbMix = 30.0f;
    } params;

private:
    double sampleRate = 44100.0;

    juce::dsp::NoiseGate<float> gate;
    juce::dsp::Compressor<float> dereverbExpander; // Utilizing compressor in expansion mode logic or NoiseGate
    
    // JUCE doesn't have a dedicated Expander class in dsp module yet easily accessible without custom code,
    // so we re-use NoiseGate with specialized settings or implement custom.
    // For this duplicate, we stick to standard modules.
    
    juce::dsp::ProcessorDuplicator<juce::dsp::IIR::Filter<float>, juce::dsp::IIR::Coefficients<float>> filter;
    juce::dsp::Phaser<float> phaser;
    juce::dsp::Compressor<float> compressor;
    juce::dsp::Reverb reverb;
    StereoWidener widener;
};

} // namespace stem_fx
