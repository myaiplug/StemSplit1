#include "PluginEditor.h"
#include <BinaryData.h>
#include <cmath>

namespace
{
bool writeAssetIfChanged(const juce::File& file, const void* data, size_t size)
{
    if (file.existsAsFile() && static_cast<size_t>(file.getSize()) == size)
    {
        if (auto in = file.createInputStream())
        {
            juce::MemoryBlock existing;
            in->readIntoMemoryBlock(existing);
            if (existing.getSize() == size && std::memcmp(existing.getData(), data, size) == 0)
                return true;
        }
    }

    if (auto out = file.createOutputStream())
    {
        out->setPosition(0);
        out->truncate();
        out->write(data, size);
        out->flush();
        return true;
    }

    return false;
}

float toFloatSafe(const juce::String& text, float fallback)
{
    const auto v = text.getFloatValue();
    if (juce::approximatelyEqual(v, 0.0f) && !text.containsAnyOf("0123456789"))
        return fallback;
    return v;
}
}

TemporalBridgeBrowser::TemporalBridgeBrowser() = default;

void TemporalBridgeBrowser::setBridgeHandler(BridgeHandler handlerIn)
{
    handler = std::move(handlerIn);
}

bool TemporalBridgeBrowser::pageAboutToLoad(const juce::String& newURL)
{
    const juce::URL url(newURL);
    if (url.getScheme() != "juce")
        return true;

    if (handler)
    {
        juce::String param;
        juce::String value;

        const auto query = newURL.fromFirstOccurrenceOf("?", false, false);
        const auto pairs = juce::StringArray::fromTokens(query, "&", "");
        for (const auto& pair : pairs)
        {
            const auto key = pair.upToFirstOccurrenceOf("=", false, false);
            const auto raw = pair.fromFirstOccurrenceOf("=", false, false);
            const auto decoded = juce::URL::removeEscapeChars(raw);

            if (key == "param")
                param = decoded;
            else if (key == "value")
                value = decoded;
        }

        handler(param, value);
    }

    return false;
}

TemporalPortalAudioProcessorEditor::TemporalPortalAudioProcessorEditor(TemporalPortalAudioProcessor& p)
    : AudioProcessorEditor(&p),
      processor(p)
{
    setOpaque(true);
    setSize(1100, 900);

    addAndMakeVisible(browser);

    fallbackLabel.setJustificationType(juce::Justification::centred);
    fallbackLabel.setText("Temporal UI asset not found. Reinstall plugin assets.", juce::dontSendNotification);
    fallbackLabel.setVisible(false);
    addAndMakeVisible(fallbackLabel);

    browser.setBridgeHandler([this](const juce::String& paramId, const juce::String& valueText)
    {
        handleBridgeParam(paramId, valueText);
    });

    loadFrontend();
    startTimerHz(15);
}

void TemporalPortalAudioProcessorEditor::paint(juce::Graphics& g)
{
    g.fillAll(juce::Colour::fromRGB(10, 10, 10));
}

void TemporalPortalAudioProcessorEditor::resized()
{
    browser.setBounds(getLocalBounds());
    fallbackLabel.setBounds(getLocalBounds().reduced(24));
}

bool TemporalPortalAudioProcessorEditor::ensureAssetsExtracted()
{
    extractedAssetsRoot = juce::File::getSpecialLocation(juce::File::tempDirectory)
        .getChildFile("TemporalPortalVST3")
        .getChildFile("ui");

    if (!extractedAssetsRoot.createDirectory())
        return false;

    const auto htmlFile = extractedAssetsRoot.getChildFile("temporal.html");
    const auto rbFile = extractedAssetsRoot.getChildFile("rubberband-worker.js");
    const auto stFile = extractedAssetsRoot.getChildFile("soundtouch-worklet.js");

    auto ok = true;
    ok = ok && writeAssetIfChanged(htmlFile, BinaryData::temporal_html, static_cast<size_t>(BinaryData::temporal_htmlSize));
    ok = ok && writeAssetIfChanged(rbFile, BinaryData::rubberbandworker_js, static_cast<size_t>(BinaryData::rubberbandworker_jsSize));
    ok = ok && writeAssetIfChanged(stFile, BinaryData::soundtouchworklet_js, static_cast<size_t>(BinaryData::soundtouchworklet_jsSize));

    return ok;
}

void TemporalPortalAudioProcessorEditor::loadFrontend()
{
    uiLoaded = false;

    const auto extracted = ensureAssetsExtracted();
    const auto html = extractedAssetsRoot.getChildFile("temporal.html");

    if (html.existsAsFile())
    {
        fallbackLabel.setVisible(false);
        browser.setVisible(true);
        const auto fileUrl = juce::URL(html).toString(true);
        browser.goToURL(fileUrl);
        uiLoaded = true;
        return;
    }

    browser.setVisible(false);
    if (!extracted)
        fallbackLabel.setText("Temporal UI extraction failed. Check temp folder permissions.", juce::dontSendNotification);
    fallbackLabel.setVisible(true);
}

void TemporalPortalAudioProcessorEditor::timerCallback()
{
    if (!uiLoaded)
        return;

    syncHostParametersToUI();
}

void TemporalPortalAudioProcessorEditor::handleBridgeParam(const juce::String& paramId, const juce::String& valueText)
{
    if (suppressUiToHost)
        return;

    if (auto* p = processor.getAPVTS().getParameter(paramId))
    {
        const auto plain = toFloatSafe(valueText, 0.0f);
        const auto normalised = p->convertTo0to1(plain);

        p->beginChangeGesture();
        p->setValueNotifyingHost(normalised);
        p->endChangeGesture();
    }
}

void TemporalPortalAudioProcessorEditor::syncHostParametersToUI()
{
    auto& apvts = processor.getAPVTS();
    const auto timeShift = apvts.getRawParameterValue("timeShift")->load();
    const auto pitchBend = apvts.getRawParameterValue("pitchBend")->load();
    const auto key = apvts.getRawParameterValue("key")->load();
    const auto detune = apvts.getRawParameterValue("detune")->load();
    const auto sauce = apvts.getRawParameterValue("sauce")->load();
    const auto wetDry = apvts.getRawParameterValue("wetDry")->load();
    const auto output = apvts.getRawParameterValue("output")->load();
    const auto engine = apvts.getRawParameterValue("engine")->load();
    const auto dawProfile = apvts.getRawParameterValue("dawProfile")->load();

    const auto engineIndex = juce::jlimit(0, 4, static_cast<int>(std::round(engine)));
    const auto dawProfileIndex = juce::jlimit(0, 3, static_cast<int>(std::round(dawProfile)));

    juce::String js;
    js << "if(window.__temporalBridge){window.__temporalBridge.applyFromHost({"
       << "timeShift:" << juce::String(timeShift, 4) << ","
       << "pitchBend:" << juce::String(pitchBend, 4) << ","
       << "key:" << juce::String(key, 4) << ","
       << "detune:" << juce::String(detune, 4) << ","
       << "sauce:" << juce::String(sauce, 4) << ","
       << "wetDry:" << juce::String(wetDry, 4) << ","
       << "output:" << juce::String(output, 4) << ","
    << "engine:" << juce::String(engineIndex) << ","
    << "dawProfile:" << juce::String(dawProfileIndex)
       << "});}";

    suppressUiToHost = true;
    browser.evaluateJavascript(js);
    suppressUiToHost = false;
}
