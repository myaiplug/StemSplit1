#pragma once
#include "FXModuleComponent.h"

namespace stem_fx {

class GateModule : public FXModuleComponent
{
public:
    GateModule() : FXModuleComponent("GATE", juce::Colour(0xff10b981))
    {
        thresholdSlider = std::make_unique<ParameterSlider>("Threshold", " dB", -80.0f, 0.0f, -40.0f);
        addAndMakeVisible(*thresholdSlider);
        
        ratioSlider = std::make_unique<ParameterSlider>("Ratio", ":1", 1.0f, 20.0f, 4.0f);
        addAndMakeVisible(*ratioSlider);
        
        attackSlider = std::make_unique<ParameterSlider>("Attack", " ms", 0.1f, 100.0f, 2.0f);
        addAndMakeVisible(*attackSlider);
        
        releaseSlider = std::make_unique<ParameterSlider>("Release", " ms", 10.0f, 1000.0f, 100.0f);
        addAndMakeVisible(*releaseSlider);
    }

    void resized() override
    {
        FXModuleComponent::resized();
        auto bounds = getContentBounds();
        const int sliderWidth = bounds.getWidth() / 4 - 5;
        thresholdSlider->setBounds(bounds.removeFromLeft(sliderWidth));
        bounds.removeFromLeft(5);
        ratioSlider->setBounds(bounds.removeFromLeft(sliderWidth));
        bounds.removeFromLeft(5);
        attackSlider->setBounds(bounds.removeFromLeft(sliderWidth));
        bounds.removeFromLeft(5);
        releaseSlider->setBounds(bounds);
    }

    std::unique_ptr<ParameterSlider> thresholdSlider, ratioSlider, attackSlider, releaseSlider;
};

class DereverbModule : public FXModuleComponent
{
public:
    DereverbModule() : FXModuleComponent("DE-REVERB", juce::Colour(0xfff59e0b))
    {
        thresholdSlider = std::make_unique<ParameterSlider>("Threshold", " dB", -80.0f, 0.0f, -30.0f);
        addAndMakeVisible(*thresholdSlider);
        
        amountSlider = std::make_unique<ParameterSlider>("Amount", "%", 0.0f, 100.0f, 40.0f);
        addAndMakeVisible(*amountSlider);
        
        releaseSlider = std::make_unique<ParameterSlider>("Release", " ms", 50.0f, 500.0f, 200.0f);
        addAndMakeVisible(*releaseSlider);
    }

    void resized() override
    {
        FXModuleComponent::resized();
        auto bounds = getContentBounds();
        const int sliderWidth = bounds.getWidth() / 3 - 5;
        thresholdSlider->setBounds(bounds.removeFromLeft(sliderWidth));
        bounds.removeFromLeft(5);
        amountSlider->setBounds(bounds.removeFromLeft(sliderWidth));
        bounds.removeFromLeft(5);
        releaseSlider->setBounds(bounds);
    }

    std::unique_ptr<ParameterSlider> thresholdSlider, amountSlider, releaseSlider;
};

class FilterModule : public FXModuleComponent
{
public:
    FilterModule() : FXModuleComponent("FILTER", juce::Colour(0xff06b6d4))
    {
        highpassSlider = std::make_unique<ParameterSlider>("High Pass", " Hz", 20.0f, 1000.0f, 20.0f);
        addAndMakeVisible(*highpassSlider);
        
        lowpassSlider = std::make_unique<ParameterSlider>("Low Pass", " Hz", 1000.0f, 20000.0f, 20000.0f);
        addAndMakeVisible(*lowpassSlider);
    }

    void resized() override
    {
        FXModuleComponent::resized();
        auto bounds = getContentBounds();
        const int sliderWidth = bounds.getWidth() / 2 - 5;
        highpassSlider->setBounds(bounds.removeFromLeft(sliderWidth));
        bounds.removeFromLeft(10);
        lowpassSlider->setBounds(bounds);
    }

    std::unique_ptr<ParameterSlider> highpassSlider, lowpassSlider;
};

class PhaserModule : public FXModuleComponent
{
public:
    PhaserModule() : FXModuleComponent("PHASER", juce::Colour(0xffa855f7))
    {
        rateSlider = std::make_unique<ParameterSlider>("Rate", " Hz", 0.1f, 10.0f, 0.5f);
        addAndMakeVisible(*rateSlider);
        
        depthSlider = std::make_unique<ParameterSlider>("Depth", "%", 0.0f, 100.0f, 50.0f);
        addAndMakeVisible(*depthSlider);
        
        feedbackSlider = std::make_unique<ParameterSlider>("Feedback", "%", 0.0f, 95.0f, 50.0f);
        addAndMakeVisible(*feedbackSlider);
        
        mixSlider = std::make_unique<ParameterSlider>("Mix", "%", 0.0f, 100.0f, 50.0f);
        addAndMakeVisible(*mixSlider);
    }

    void resized() override
    {
        FXModuleComponent::resized();
        auto bounds = getContentBounds();
        const int sliderWidth = bounds.getWidth() / 4 - 5;
        rateSlider->setBounds(bounds.removeFromLeft(sliderWidth));
        bounds.removeFromLeft(5);
        depthSlider->setBounds(bounds.removeFromLeft(sliderWidth));
        bounds.removeFromLeft(5);
        feedbackSlider->setBounds(bounds.removeFromLeft(sliderWidth));
        bounds.removeFromLeft(5);
        mixSlider->setBounds(bounds);
    }

    std::unique_ptr<ParameterSlider> rateSlider, depthSlider, feedbackSlider, mixSlider;
};

class CompressorModule : public FXModuleComponent
{
public:
    CompressorModule() : FXModuleComponent("COMPRESSOR", juce::Colour(0xffef4444))
    {
        thresholdSlider = std::make_unique<ParameterSlider>("Threshold", " dB", -60.0f, 0.0f, -20.0f);
        addAndMakeVisible(*thresholdSlider);
        
        ratioSlider = std::make_unique<ParameterSlider>("Ratio", ":1", 1.0f, 20.0f, 2.5f);
        addAndMakeVisible(*ratioSlider);
        
        attackSlider = std::make_unique<ParameterSlider>("Attack", " ms", 0.1f, 100.0f, 10.0f);
        addAndMakeVisible(*attackSlider);
        
        releaseSlider = std::make_unique<ParameterSlider>("Release", " ms", 10.0f, 1000.0f, 100.0f);
        addAndMakeVisible(*releaseSlider);
        
        makeupSlider = std::make_unique<ParameterSlider>("Makeup", " dB", 0.0f, 24.0f, 0.0f);
        addAndMakeVisible(*makeupSlider);
    }

    void resized() override
    {
        FXModuleComponent::resized();
        auto bounds = getContentBounds();
        const int sliderWidth = (bounds.getWidth() - 20) / 5;
        thresholdSlider->setBounds(bounds.removeFromLeft(sliderWidth));
        bounds.removeFromLeft(5);
        ratioSlider->setBounds(bounds.removeFromLeft(sliderWidth));
        bounds.removeFromLeft(5);
        attackSlider->setBounds(bounds.removeFromLeft(sliderWidth));
        bounds.removeFromLeft(5);
        releaseSlider->setBounds(bounds.removeFromLeft(sliderWidth));
        bounds.removeFromLeft(5);
        makeupSlider->setBounds(bounds);
    }

    std::unique_ptr<ParameterSlider> thresholdSlider, ratioSlider, attackSlider, releaseSlider, makeupSlider;
};

class StereoWidthModule : public FXModuleComponent
{
public:
    StereoWidthModule() : FXModuleComponent("STEREO WIDTH", juce::Colour(0xff3b82f6))
    {
        widthSlider = std::make_unique<ParameterSlider>("Width", "%", 0.0f, 300.0f, 100.0f);
        addAndMakeVisible(*widthSlider);
    }

    void resized() override
    {
        FXModuleComponent::resized();
        widthSlider->setBounds(getContentBounds());
    }

    std::unique_ptr<ParameterSlider> widthSlider;
};

class ReverbModule : public FXModuleComponent
{
public:
    ReverbModule() : FXModuleComponent("REVERB", juce::Colour(0xff8b5cf6))
    {
        roomSizeSlider = std::make_unique<ParameterSlider>("Room", "%", 0.0f, 100.0f, 50.0f);
        addAndMakeVisible(*roomSizeSlider);
        
        dampingSlider = std::make_unique<ParameterSlider>("Damping", "%", 0.0f, 100.0f, 50.0f);
        addAndMakeVisible(*dampingSlider);
        
        mixSlider = std::make_unique<ParameterSlider>("Mix", "%", 0.0f, 100.0f, 30.0f);
        addAndMakeVisible(*mixSlider);
    }

    void resized() override
    {
        FXModuleComponent::resized();
        auto bounds = getContentBounds();
        const int sliderWidth = bounds.getWidth() / 3 - 5;
        roomSizeSlider->setBounds(bounds.removeFromLeft(sliderWidth));
        bounds.removeFromLeft(5);
        dampingSlider->setBounds(bounds.removeFromLeft(sliderWidth));
        bounds.removeFromLeft(5);
        mixSlider->setBounds(bounds);
    }

    std::unique_ptr<ParameterSlider> roomSizeSlider, dampingSlider, mixSlider;
};

} // namespace stem_fx
