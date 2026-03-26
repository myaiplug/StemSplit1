; Online Installer - Downloads Python during installation
; Usage: iscc setup_online.iss
; This creates a SMALL installer (~100MB) that downloads Python packages during install

#define MyAppName "StemSplit"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "StemSplit Team"
#define MyAppExeName "stem-split.exe"
#define PythonVersion "3.10.11"
#define PythonURL "https://www.python.org/ftp/python/3.10.11/python-3.10.11-embed-amd64.zip"
#define GetPipURL "https://bootstrap.pypa.io/get-pip.py"

[Setup]
AppId={{C6260D04-8E6F-46C3-9366-231362002302}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
SetupIconFile=ss2.ico
Compression=lzma2/ultra64
SolidCompression=yes
OutputDir=installers
OutputBaseFilename=StemSplit_Setup_v{#MyAppVersion}_x64_Online
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
; Need admin to install Python packages
PrivilegesRequired=admin

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Main Executable
Source: "src-tauri\target\release\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion

; Application Scripts
Source: "scripts\*"; DestDir: "{app}\scripts"; Flags: recursesubdirs createallsubdirs; Excludes: "logs, __pycache__, .git, .vscode, .idea, *.log, s3_*_folder_lists, test_audio, *.txt, *.bmp, *.png, *.json, *.xml, *.yaml"

; Model Dependencies
Source: "drumsep-main\*"; DestDir: "{app}\drumsep-main"; Flags: recursesubdirs createallsubdirs skipifsourcedoesntexist; Excludes: "__pycache__, .git, *.md, LICENSE, drumsepInstall"
Source: "MVSEP-MDX23-music-separation-model-main\*"; DestDir: "{app}\MVSEP-MDX23-music-separation-model-main"; Flags: recursesubdirs createallsubdirs skipifsourcedoesntexist; Excludes: "__pycache__, .git, output, *.wav, gui.py, web-ui.py, *.md, images"
Source: "UVR\*"; DestDir: "{app}\UVR"; Flags: recursesubdirs createallsubdirs skipifsourcedoesntexist; Excludes: "__pycache__, .git, *.png, *.jpg"

; Trained Models
Source: "Stem Split Models\*"; DestDir: "{app}\Stem Split Models"; Flags: recursesubdirs createallsubdirs skipifsourcedoesntexist

; Requirements file for pip
Source: "requirements.txt"; DestDir: "{app}"; Flags: ignoreversion

; FFmpeg for MP3 encoding
Source: "ffmpeg\\ffmpeg.exe"; DestDir: "{app}\\ffmpeg"; Flags: ignoreversion skipifsourcedoesntexist

; Icons
Source: "ss2.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\ss2.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; IconFilename: "{app}\ss2.ico"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent

[Code]
var
  DownloadPage: TDownloadWizardPage;
  PythonInstallPage: TOutputProgressWizardPage;

function OnDownloadProgress(const Url, FileName: String; const Progress, ProgressMax: Int64): Boolean;
begin
  if Progress = ProgressMax then
    Log(Format('Successfully downloaded file to %s', [FileName]));
  Result := True;
end;

procedure InitializeWizard;
begin
  DownloadPage := CreateDownloadPage(SetupMessage(msgWizardPreparing), SetupMessage(msgPreparingDesc), @OnDownloadProgress);
  PythonInstallPage := CreateOutputProgressPage('Installing Python Packages', 'Please wait while Python packages are downloaded and installed...');
end;

function ExtractZipFile(ZipFile, DestDir: String): Boolean;
var
  Shell: Variant;
  ZipObj: Variant;
  DestObj: Variant;
begin
  Result := False;
  try
    Shell := CreateOleObject('Shell.Application');
    ZipObj := Shell.NameSpace(ZipFile);
    DestObj := Shell.NameSpace(DestDir);
    DestObj.CopyHere(ZipObj.Items, 4 or 16); // 4=No progress, 16=Yes to all
    Result := True;
  except
    Log('Failed to extract zip: ' + GetExceptionMessage);
  end;
end;

function EnableImportSite(PythonDir: String): Boolean;
var
  PthFile: String;
  ContentAnsi: AnsiString;
  Content: String;
begin
  Result := False;
  PthFile := PythonDir + '\python310._pth';
  if FileExists(PthFile) then
  begin
    if LoadStringFromFile(PthFile, ContentAnsi) then
    begin
      Content := ContentAnsi;
      StringChangeEx(Content, '#import site', 'import site', True);
      ContentAnsi := Content;
      Result := SaveStringToFile(PthFile, ContentAnsi, False);
    end;
  end;
end;

function RunPythonCommand(PythonDir, Args: String; var Output: String): Integer;
var
  ResultCode: Integer;
  ExecResult: Boolean;
begin
  ExecResult := Exec(PythonDir + '\python.exe', Args, PythonDir, SW_HIDE, ewWaitUntilTerminated, ResultCode);
  if ExecResult then
    Result := ResultCode
  else
    Result := -1;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  PythonZip, PythonDir, GetPipPath: String;
  ResultCode: Integer;
begin
  Result := True;
  
  if CurPageID = wpReady then begin
#ifdef SkipOnlineDownloads
    Log('SkipOnlineDownloads enabled; skipping online dependency download/install phase.');
    Exit;
#endif
    PythonDir := ExpandConstant('{app}\embedded_python');
    PythonZip := ExpandConstant('{tmp}\python_embed.zip');
    GetPipPath := ExpandConstant('{tmp}\get-pip.py');
    
    // Check if Python already installed (for upgrades)
    if FileExists(PythonDir + '\python.exe') then
    begin
      Log('Python already installed, skipping download');
      Exit;
    end;
    
    // Download Python
    DownloadPage.Clear;
    DownloadPage.Add('{#PythonURL}', 'python_embed.zip', '');
    DownloadPage.Add('{#GetPipURL}', 'get-pip.py', '');
    DownloadPage.Show;
    
    try
      try
        DownloadPage.Download;
        Result := True;
      except
        if DownloadPage.AbortedByUser then
          Log('Download aborted by user')
        else
          SuppressibleMsgBox(AddPeriod(GetExceptionMessage), mbCriticalError, MB_OK, IDOK);
        Result := False;
      end;
    finally
      DownloadPage.Hide;
    end;
    
    if Result then
    begin
      // Create Python directory
      ForceDirectories(PythonDir);
      
      // Extract Python
      PythonInstallPage.Show;
      PythonInstallPage.SetText('Extracting Python...', '');
      PythonInstallPage.SetProgress(10, 100);
      
      if not ExtractZipFile(PythonZip, PythonDir) then
      begin
        MsgBox('Failed to extract Python. Please check disk space and try again.', mbError, MB_OK);
        Result := False;
        PythonInstallPage.Hide;
        Exit;
      end;
      
      // Enable import site
      PythonInstallPage.SetText('Configuring Python...', '');
      PythonInstallPage.SetProgress(20, 100);
      EnableImportSite(PythonDir);
      
      // Copy get-pip.py to Python dir
      FileCopy(GetPipPath, PythonDir + '\get-pip.py', False);
      
      // Install pip
      PythonInstallPage.SetText('Installing pip...', '');
      PythonInstallPage.SetProgress(30, 100);
      
      if Exec(PythonDir + '\python.exe', 'get-pip.py --no-warn-script-location', PythonDir, SW_HIDE, ewWaitUntilTerminated, ResultCode) then
      begin
        if ResultCode <> 0 then
        begin
          MsgBox('Failed to install pip. Error code: ' + IntToStr(ResultCode), mbError, MB_OK);
          Result := False;
          PythonInstallPage.Hide;
          Exit;
        end;
      end;
      
      // Install requirements
      PythonInstallPage.SetText('Installing AI packages (this may take 5-15 minutes)...', 'Downloading PyTorch, Demucs, and audio processing libraries');
      PythonInstallPage.SetProgress(40, 100);
      
      // Install PyTorch first (largest package)
      if Exec(PythonDir + '\python.exe', '-m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118 --no-warn-script-location', PythonDir, SW_HIDE, ewWaitUntilTerminated, ResultCode) then
      begin
        if ResultCode <> 0 then
        begin
          MsgBox('Failed to install PyTorch. Error code: ' + IntToStr(ResultCode), mbError, MB_OK);
          Result := False;
          PythonInstallPage.Hide;
          Exit;
        end;
        PythonInstallPage.SetProgress(70, 100);
      end
      else
      begin
        MsgBox('Failed to launch Python for PyTorch installation.', mbError, MB_OK);
        Result := False;
        PythonInstallPage.Hide;
        Exit;
      end;
      
      // Install other requirements
      PythonInstallPage.SetText('Installing remaining packages...', '');
      if Exec(PythonDir + '\python.exe', '-m pip install -r "' + ExpandConstant('{app}\requirements.txt') + '" --no-warn-script-location --no-cache-dir', PythonDir, SW_HIDE, ewWaitUntilTerminated, ResultCode) then
      begin
        if ResultCode <> 0 then
        begin
          MsgBox('Failed to install required packages. Error code: ' + IntToStr(ResultCode), mbError, MB_OK);
          Result := False;
          PythonInstallPage.Hide;
          Exit;
        end;
        PythonInstallPage.SetProgress(95, 100);
      end
      else
      begin
        MsgBox('Failed to launch Python for package installation.', mbError, MB_OK);
        Result := False;
        PythonInstallPage.Hide;
        Exit;
      end;
      
      // Cleanup
      DeleteFile(PythonDir + '\get-pip.py');
      PythonInstallPage.SetProgress(100, 100);
      PythonInstallPage.Hide;
    end;
  end;
end;

function UpdateReadyMemo(Space, NewLine, MemoUserInfoInfo, MemoDirInfo, MemoTypeInfo, MemoComponentsInfo, MemoGroupInfo, MemoTasksInfo: String): String;
begin
  Result := '';
  Result := Result + 'Installation Directory:' + NewLine + Space + ExpandConstant('{app}') + NewLine + NewLine;
  Result := Result + 'The installer will download:' + NewLine;
  Result := Result + Space + '• Python 3.10.11 Embedded (~25 MB)' + NewLine;
  Result := Result + Space + '• PyTorch with CUDA support (~2.5 GB)' + NewLine;
  Result := Result + Space + '• Demucs and audio libraries (~200 MB)' + NewLine + NewLine;
  Result := Result + 'Total download: approximately 2.7 GB' + NewLine;
  Result := Result + 'Installation requires internet connection.' + NewLine;
end;
