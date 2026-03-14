#pragma once
#include <JuceHeader.h>
#include "PremiumLookAndFeel.h"

namespace stem_fx {

class ParameterSlider : public juce::Component
{
public:
    ParameterSlider(const juce::String& paramName, const juce::String& suffix = "",
                   float minVal = 0.0f, float maxVal = 100.0f, float defaultVal = 50.0f)
        : parameterName(paramName), valueSuffix(suffix)
    {
        addAndMakeVisible(slider);
        slider.setSliderStyle(juce::Slider::RotaryVerticalDrag);
        slider.setTextBoxStyle(juce::Slider::NoTextBox, false, 0, 0);
        slider.setRange(minVal, maxVal, 0.01);
        slider.setValue(defaultVal);
        slider.onValueChange = [this] { updateValueLabel(); };
        
        addAndMakeVisible(nameLabel);
        nameLabel.setText(paramName, juce::dontSendNotification);
        nameLabel.setJustificationType(juce::Justification::centred);
        nameLabel.setFont(juce::Font(11.0f));
        nameLabel.setColour(juce::Label::textColourId, PremiumLookAndFeel::textSecondary);
        
        addAndMakeVisible(valueLabel);
        valueLabel.setJustificationType(juce::Justification::centred);
        valueLabel.setFont(juce::Font(13.0f, juce::Font::bold));
        valueLabel.setColour(juce::Label::textColourId, PremiumLookAndFeel::textPrimary);
        updateValueLabel();
    }

    void resized() override
    {
        auto bounds = getLocalBounds();
        nameLabel.setBounds(bounds.removeFromBottom(20));
        valueLabel.setBounds(bounds.removeFromBottom(20));
        slider.setBounds(bounds);
    }

    void paint(juce::Graphics& g) override
    {
        g.setColour(PremiumLookAndFeel::surfaceDark.withAlpha(0.3f));
        g.fillRoundedRectangle(getLocalBounds().toFloat(), 8.0f);
    }

    juce::Slider& getSlider() { return slider; }

private:
    void updateValueLabel()
    {
        auto value = slider.getValue();
        juce::String text;
        
        if (std::abs(value) >= 1000.0f)
            text = juce::String(value / 1000.0f, 1) + "k";
        else if (std::abs(value) >= 100.0f)
            text = juce::String((int)value);
        else
            text = juce::String(value, 1);
        
        text += valueSuffix;
        valueLabel.setText(text, juce::dontSendNotification);
    }

    juce::String parameterName, valueSuffix;
    juce::Slider slider;
    juce::Label nameLabel, valueLabel;
};

class FXModuleComponent : public juce::Component
{
public:
    FXModuleComponent(const juce::String& moduleName, const juce::Colour& accentColor = PremiumLookAndFeel::accentPrimary)
        : name(moduleName), accent(accentColor)
    {
        addAndMakeVisible(headerLabel);
        headerLabel.setText(moduleName, juce::dontSendNotification);
        headerLabel.setFont(juce::Font(16.0f, juce::Font::bold));
        headerLabel.setColour(juce::Label::textColourId, PremiumLookAndFeel::textPrimary);
        headerLabel.setJustificationType(juce::Justification::centredLeft);
        
        addAndMakeVisible(enableToggle);
        enableToggle.setButtonText("");
        enableToggle.onClick = [this] { 
            setEnabled(enableToggle.getToggleState());
            updateModuleState();
        };
        
        addAndMakeVisible(bypassButton);
        bypassButton.setButtonText("BYPASS");
        bypassButton.setClickingTogglesState(true);
        bypassButton.onClick = [this] { updateModuleState(); };
    }

    void resized() override
    {
        auto bounds = getLocalBounds();
        auto headerArea = bounds.removeFromTop(50);
        headerArea.reduce(15, 10);
        
        enableToggle.setBounds(headerArea.removeFromRight(50).reduced(5));
        bypassButton.setBounds(headerArea.removeFromRight(80).reduced(2));
        headerLabel.setBounds(headerArea);
        
        contentBounds = bounds.reduced(15, 10);
    }

    void paint(juce::Graphics& g) override
    {
        auto bounds = getLocalBounds().toFloat();
        
        g.setColour(PremiumLookAndFeel::surfaceMedium.withAlpha(0.7f));
        g.fillRoundedRectangle(bounds, 12.0f);
        
        g.setColour(accent);
        g.fillRoundedRectangle(bounds.removeFromTop(4.0f), 2.0f);
        
        g.setColour(PremiumLookAndFeel::borderColor.withAlpha(0.5f));
        g.drawRoundedRectangle(bounds.withTrimmedTop(4.0f), 12.0f, 1.5f);
        
        if (!moduleEnabled)
        {
            g.setColour(PremiumLookAndFeel::backgroundDark.withAlpha(0.6f));
            g.fillRoundedRectangle(bounds, 12.0f);
        }
        
        if (moduleEnabled && !bypassButton.getToggleState())
        {
            g.setColour(accent.withAlpha(0.1f));
            g.drawRoundedRectangle(bounds.expanded(2.0f), 14.0f, 3.0f);
        }
    }

    void setModuleEnabled(bool enabled)
    {
        moduleEnabled = enabled;
        enableToggle.setToggleState(enabled, juce::dontSendNotification);
        repaint();
    }

    bool isModuleEnabled() const { return moduleEnabled && !bypassButton.getToggleState(); }
    juce::Rectangle<int> getContentBounds() const { return contentBounds; }

protected:
    virtual void updateModuleState() 
    {
        moduleEnabled = enableToggle.getToggleState();
        repaint();
    }

    juce::String name;
    juce::Colour accent;
    juce::Rectangle<int> contentBounds;

private:
    bool moduleEnabled = false;
    juce::Label headerLabel;
    juce::ToggleButton enableToggle;
    juce::TextButton bypassButton;
};

} // namespace stem_fx
