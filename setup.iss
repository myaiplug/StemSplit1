; usage: iscc setup.iss

#define MyAppName "StemSplit"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "StemSplit Team"
#define MyAppExeName "stem-split.exe"
#define MyAppDisplayName "StemSplit.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application. Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{C6260D04-8E6F-46C3-9366-231362002302}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
; The following line to use the icon
SetupIconFile=ss2.ico
Compression=lzma2/ultra64
SolidCompression=yes
OutputDir=installers
OutputBaseFilename=StemSplit_Setup_x64
; "ArchitecturesAllowed=x64" specifies that Setup cannot run on anything but x64.
ArchitecturesAllowed=x64
; "ArchitecturesInstallIn64BitMode=x64" requests that the install be done in "64-bit mode" on x64, meaning it should use the native 64-bit Program Files directory and the 64-bit view of the registry.
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Main Executable
Source: "src-tauri\target\release\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion

; Python Environment (Embedded)
Source: "embedded_python\*"; DestDir: "{app}\embedded_python"; Flags: recursesubdirs createallsubdirs; Excludes: "__pycache__, .git, *.pyc, *.whl"

; Application Scripts
Source: "scripts\*"; DestDir: "{app}\scripts"; Flags: recursesubdirs createallsubdirs; Excludes: "logs, __pycache__, .git, .vscode, .idea, *.log, s3_*_folder_lists, test_audio, *.txt, *.bmp, *.png, *.json, *.xml, *.yaml"

; Model Dependencies - Reduced footprint
Source: "drumsep-main\*"; DestDir: "{app}\drumsep-main"; Flags: recursesubdirs createallsubdirs; Excludes: "__pycache__, .git, *.md, LICENSE, drumsepInstall"
Source: "MVSEP-MDX23-music-separation-model-main\*"; DestDir: "{app}\MVSEP-MDX23-music-separation-model-main"; Flags: recursesubdirs createallsubdirs; Excludes: "__pycache__, .git, output, *.wav, gui.py, web-ui.py, *.md, images"
Source: "UVR\*"; DestDir: "{app}\UVR"; Flags: recursesubdirs createallsubdirs; Excludes: "__pycache__, .git, *.png, *.jpg"

; Trained Models (Large files)
Source: "Stem Split Models\*"; DestDir: "{app}\Stem Split Models"; Flags: recursesubdirs createallsubdirs

; FFmpeg for MP3 encoding
Source: "ffmpeg\ffmpeg.exe"; DestDir: "{app}\ffmpeg"; Flags: ignoreversion skipifsourcedoesntexist

; Icons & Assets
Source: "ss2.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\ss2.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; IconFilename: "{app}\ss2.ico"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent
