#include "PluginProcessor.h"
#include "PluginEditor.h"

// Declare BinaryData resources if not available via header
namespace BinaryData
{
    extern const char* ui_zip;
    extern const int ui_zipSize;
}

StemSplitFXAudioProcessorEditor::StemSplitFXAudioProcessorEditor (StemSplitFXAudioProcessor& p)
    : AudioProcessorEditor (&p), audioProcessor (p)
{
    // Use the modern WebView2 backend on Windows
    auto options = juce::WebBrowserComponent::Options()
        .withBackend(juce::WebBrowserComponent::Options::Backend::webview2);

    webView = std::make_unique<juce::WebBrowserComponent>(options);
    addAndMakeVisible(webView.get());

    // Extract embedded UI resources to a temp folder for 100% local loading
    auto appDataDir = juce::File::getSpecialLocation(juce::File::userApplicationDataDirectory)
                          .getChildFile("StemSplit_VST_Cache");
    
    // Use a unique version folder if you update the VST to avoid stale cache
    // For now, simpler structure
    auto uiDir = appDataDir.getChildFile("ui_v1");
    
    // Only extract if not already present. 
    // In production, you'd check a version file or force unzip if necessary.
    if (!uiDir.exists())
    {
        uiDir.createDirectory();
        
        // Check if bundled resources exist (ui_zipSize > 0)
        // Note: The extern assumes 'ui_zip' matches the CMake target resource name.
        // CMake juce_add_binary_data usually uses filename as variable name.
        // ui.zip -> ui_zip
        if (BinaryData::ui_zipSize > 0)
        {
            auto zipFile = appDataDir.getChildFile("ui.zip");
            // Write ZIP to disk
            zipFile.replaceWithData(BinaryData::ui_zip, BinaryData::ui_zipSize);
            
            // Unzip
            juce::ZipFile zip(zipFile);
            if (zip.getNumEntries() > 0)
            {
                zip.uncompressTo(uiDir);
            }
            
            // Cleanup zip
            zipFile.deleteFile();
        }
    }
    
    // The index file inside the extracted folder
    // Note: 'out' folder structure: out/index.html 
    // If zipped root is 'out', then unzip might create 'out' folder or flat.
    // Compress-Archive includes the root folder if multiple sources, or flat if * contents.
    // I used 'out\*' so it should be flat.
    auto indexFile = uiDir.getChildFile("index.html");

    // Load local UI if available, otherwise fallback to localhost (dev mode)
    if (indexFile.exists())
    {
        webView->goToURL(juce::URL(indexFile).toString(true));
    }
    else
    {
        webView->goToURL("http://localhost:3000/");
    }
    
    // Set the window size to a larger default for the full app
    setSize (1000, 800);
    setResizable(true, true);
}

StemSplitFXAudioProcessorEditor::~StemSplitFXAudioProcessorEditor()
{
    webView = nullptr;
}

void StemSplitFXAudioProcessorEditor::paint (juce::Graphics& g)
{
    g.fillAll (juce::Colours::black);
}

void StemSplitFXAudioProcessorEditor::resized()
{
    if (webView != nullptr)
        webView->setBounds(getLocalBounds());
}