#define MyAppName "Temporal Portal VST3"
#define MyAppVersion "0.1.0"
#define MyPublisher "MyAiPlugin"
#define MyPluginFolder "Temporal Portal.vst3"

[Setup]
AppId={{F0D8F5C9-2AB1-4B18-B88A-2E4A3C92A3D1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyPublisher}
DefaultDirName={commoncf}\VST3
DisableProgramGroupPage=yes
OutputDir=.
OutputBaseFilename=TemporalPortalVST3-Setup
Compression=lzma
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
WizardStyle=modern

[Files]
Source: "stage\{#MyPluginFolder}\*"; DestDir: "{commoncf}\VST3\{#MyPluginFolder}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Code]
function InitializeSetup(): Boolean;
begin
  Result := True;
end;
