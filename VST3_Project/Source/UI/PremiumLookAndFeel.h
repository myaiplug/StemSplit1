#pragma once
#include <JuceHeader.h>

namespace stem_fx {

class PremiumLookAndFeel : public juce::LookAndFeel_V4
{
public:
    PremiumLookAndFeel()
    {
        setColour(juce::ResizableWindow::backgroundColourId, backgroundDark);
        setColour(juce::Slider::thumbColourId, accentPrimary);
        setColour(juce::Slider::trackColourId, surfaceLight);
        setColour(juce::Slider::backgroundColourId, backgroundMedium);
        setColour(juce::TextButton::buttonColourId, accentPrimary);
        setColour(juce::TextButton::buttonOnColourId, accentSecondary);
        setColour(juce::TextButton::textColourOnId, textPrimary);
        setColour(juce::TextButton::textColourOffId, textSecondary);
        setColour(juce::Label::textColourId, textPrimary);
        setColour(juce::ComboBox::backgroundColourId, surfaceMedium);
        setColour(juce::ComboBox::textColourId, textPrimary);
        setColour(juce::ComboBox::outlineColourId, borderColor);
    }

    void drawRotarySlider(juce::Graphics& g, int x, int y, int width, int height,
                         float sliderPosProportional, float rotaryStartAngle,
                         float rotaryEndAngle, juce::Slider& slider) override
    {
        const float radius = juce::jmin(width / 2.0f, height / 2.0f) - 8.0f;
        const float centreX = x + width * 0.5f;
        const float centreY = y + height * 0.5f;
        const float angle = rotaryStartAngle + sliderPosProportional * (rotaryEndAngle - rotaryStartAngle);
        
        juce::ColourGradient glowGradient(accentPrimary.withAlpha(0.3f), centreX, centreY,
                                         accentPrimary.withAlpha(0.0f), centreX, centreY + radius * 1.5f, true);
        g.setGradientFill(glowGradient);
        g.fillEllipse(centreX - radius * 1.2f, centreY - radius * 1.2f, radius * 2.4f, radius * 2.4f);
        
        juce::Path backgroundArc;
        backgroundArc.addCentredArc(centreX, centreY, radius, radius, 0.0f,
                                   rotaryStartAngle, rotaryEndAngle, true);
        
        g.setColour(surfaceLight);
        g.strokePath(backgroundArc, juce::PathStrokeType(4.0f, juce::PathStrokeType::curved,
                                                          juce::PathStrokeType::rounded));
        
        juce::Path valueArc;
        valueArc.addCentredArc(centreX, centreY, radius, radius, 0.0f,
                              rotaryStartAngle, angle, true);
        
        juce::ColourGradient gradient(accentPrimary, centreX, centreY - radius,
                                     accentSecondary, centreX, centreY + radius, false);
        g.setGradientFill(gradient);
        g.strokePath(valueArc, juce::PathStrokeType(4.0f, juce::PathStrokeType::curved,
                                                     juce::PathStrokeType::rounded));
        
        const float knobRadius = radius * 0.5f;
        juce::ColourGradient knobGradient(surfaceMedium.brighter(0.3f), centreX, centreY - knobRadius,
                                         surfaceMedium.darker(0.2f), centreX, centreY + knobRadius, false);
        g.setGradientFill(knobGradient);
        g.fillEllipse(centreX - knobRadius, centreY - knobRadius, knobRadius * 2.0f, knobRadius * 2.0f);
        
        g.setColour(borderColor);
        g.drawEllipse(centreX - knobRadius, centreY - knobRadius, knobRadius * 2.0f, knobRadius * 2.0f, 1.5f);
        
        juce::Path pointer;
        const float pointerLength = radius * 0.4f;
        const float pointerThickness = 3.0f;
        pointer.addRectangle(-pointerThickness * 0.5f, -pointerLength, pointerThickness, pointerLength);
        pointer.applyTransform(juce::AffineTransform::rotation(angle).translated(centreX, centreY));
        
        g.setColour(accentPrimary);
        g.fillPath(pointer);
        
        g.setColour(accentPrimary.brighter(0.5f));
        g.fillEllipse(centreX - 3.0f, centreY - 3.0f, 6.0f, 6.0f);
    }

    void drawLinearSlider(juce::Graphics& g, int x, int y, int width, int height,
                         float sliderPos, float minSliderPos, float maxSliderPos,
                         juce::Slider::SliderStyle style, juce::Slider& slider) override
    {
        if (style == juce::Slider::LinearVertical)
        {
            const float trackWidth = 6.0f;
            const float trackX = x + (width - trackWidth) * 0.5f;
            
            g.setColour(surfaceLight);
            g.fillRoundedRectangle(trackX, y, trackWidth, height, trackWidth * 0.5f);
            
            juce::ColourGradient gradient(accentSecondary, trackX, sliderPos,
                                         accentPrimary, trackX, y + height, false);
            g.setGradientFill(gradient);
            g.fillRoundedRectangle(trackX, sliderPos, trackWidth, y + height - sliderPos, trackWidth * 0.5f);
            
            const float thumbSize = 18.0f;
            juce::ColourGradient thumbGradient(surfaceMedium.brighter(0.4f), x + width * 0.5f, sliderPos - thumbSize * 0.5f,
                                              surfaceMedium.darker(0.1f), x + width * 0.5f, sliderPos + thumbSize * 0.5f, false);
            g.setGradientFill(thumbGradient);
            g.fillEllipse(x + (width - thumbSize) * 0.5f, sliderPos - thumbSize * 0.5f, thumbSize, thumbSize);
            
            g.setColour(accentPrimary);
            g.drawEllipse(x + (width - thumbSize) * 0.5f, sliderPos - thumbSize * 0.5f, thumbSize, thumbSize, 2.0f);
        }
        else
        {
            LookAndFeel_V4::drawLinearSlider(g, x, y, width, height, sliderPos, minSliderPos, maxSliderPos, style, slider);
        }
    }

    void drawButtonBackground(juce::Graphics& g, juce::Button& button, const juce::Colour& backgroundColour,
                             bool shouldDrawButtonAsHighlighted, bool shouldDrawButtonAsDown) override
    {
        const auto bounds = button.getLocalBounds().toFloat().reduced(1.0f);
        const auto cornerSize = 6.0f;
        
        auto baseColour = backgroundColour;
        if (shouldDrawButtonAsDown)
            baseColour = baseColour.darker(0.2f);
        else if (shouldDrawButtonAsHighlighted)
            baseColour = baseColour.brighter(0.1f);
        
        juce::ColourGradient gradient(baseColour.brighter(0.1f), 0.0f, bounds.getY(),
                                     baseColour.darker(0.1f), 0.0f, bounds.getBottom(), false);
        g.setGradientFill(gradient);
        g.fillRoundedRectangle(bounds, cornerSize);
        
        g.setColour(borderColor);
        g.drawRoundedRectangle(bounds, cornerSize, 1.5f);
        
        if (shouldDrawButtonAsDown)
        {
            g.setColour(accentPrimary.withAlpha(0.3f));
            g.drawRoundedRectangle(bounds.expanded(2.0f), cornerSize + 2.0f, 2.0f);
        }
    }

    void drawToggleButton(juce::Graphics& g, juce::ToggleButton& button,
                         bool shouldDrawButtonAsHighlighted, bool shouldDrawButtonAsDown) override
    {
        const auto bounds = button.getLocalBounds().toFloat();
        const float toggleWidth = 44.0f;
        const float toggleHeight = 24.0f;
        const float thumbSize = 18.0f;
        
        auto toggleBounds = juce::Rectangle<float>(0, 0, toggleWidth, toggleHeight)
                              .withCentre(bounds.getCentre());
        
        auto trackColour = button.getToggleState() ? accentPrimary : surfaceLight;
        g.setColour(trackColour);
        g.fillRoundedRectangle(toggleBounds, toggleHeight * 0.5f);
        
        g.setColour(borderColor);
        g.drawRoundedRectangle(toggleBounds, toggleHeight * 0.5f, 1.5f);
        
        const float thumbX = button.getToggleState() 
                            ? toggleBounds.getRight() - thumbSize - 3.0f 
                            : toggleBounds.getX() + 3.0f;
        const float thumbY = toggleBounds.getCentreY() - thumbSize * 0.5f;
        
        g.setColour(juce::Colours::black.withAlpha(0.3f));
        g.fillEllipse(thumbX + 1.0f, thumbY + 1.0f, thumbSize, thumbSize);
        
        juce::ColourGradient thumbGradient(juce::Colours::white, thumbX + thumbSize * 0.5f, thumbY,
                                          juce::Colours::white.darker(0.1f), thumbX + thumbSize * 0.5f, thumbY + thumbSize, false);
        g.setGradientFill(thumbGradient);
        g.fillEllipse(thumbX, thumbY, thumbSize, thumbSize);
    }

    static inline const juce::Colour backgroundDark     = juce::Colour(0xff0f0f1e);
    static inline const juce::Colour backgroundMedium   = juce::Colour(0xff1a1a2e);
    static inline const juce::Colour surfaceDark        = juce::Colour(0xff16213e);
    static inline const juce::Colour surfaceMedium      = juce::Colour(0xff1f2937);
    static inline const juce::Colour surfaceLight       = juce::Colour(0xff374151);
    static inline const juce::Colour accentPrimary      = juce::Colour(0xff6366f1);
    static inline const juce::Colour accentSecondary    = juce::Colour(0xff8b5cf6);
    static inline const juce::Colour textPrimary        = juce::Colour(0xfff9fafb);
    static inline const juce::Colour textSecondary      = juce::Colour(0xff9ca3af);
    static inline const juce::Colour borderColor        = juce::Colour(0xff4b5563);
};

} // namespace stem_fx
