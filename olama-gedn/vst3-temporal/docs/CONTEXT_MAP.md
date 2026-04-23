## Context Map

### Files to Modify
| File | Purpose | Changes Needed |
|------|---------|----------------|
| temporal.html | Source frontend to preserve exactly | Copied into plugin assets for runtime UI |
| rubberband-worker.js | Worker dependency referenced by frontend | Copied into plugin assets |
| soundtouch-worklet.js | Worklet dependency referenced by frontend | Copied into plugin assets |
| vst3-temporal/CMakeLists.txt | Build system | Added JUCE VST3 target |
| vst3-temporal/Source/PluginProcessor.* | DSP + parameters | Added APVTS and native DSP graph |
| vst3-temporal/Source/PluginEditor.* | Plugin GUI host | Added WebBrowser-based UI loader |
| vst3-temporal/installer/* | Packaging | Added stage + Inno installer scripts |
| vst3-temporal/docs/* | Documentation | Added architecture/build/scope docs |
| README.md | Repo discoverability | Added conversion system pointer |

### Dependencies (may need updates)
| File | Relationship |
|------|--------------|
| vst3-temporal/CMakeLists.txt | Fetches JUCE 8.0.4 via CMake FetchContent |
| vst3-temporal/Source/PluginEditor.cpp | Loads temporal UI resource files |
| vst3-temporal/installer/build-installer.ps1 | Depends on build artefact path and Inno Setup |

### Test Files
| Test | Coverage |
|------|----------|
| None yet | Manual DAW smoke test recommended for VST3 scan/load/audio pass |

### Reference Patterns
| File | Pattern |
|------|---------|
| temporal.html | Canonical control naming and UX behavior |
| server.js | Existing local-first architecture style in repo |

### Risk Assessment
- [x] Breaking changes to public API: No existing API changed
- [ ] Database migrations needed
- [x] Configuration changes required: toolchain + Inno Setup required
