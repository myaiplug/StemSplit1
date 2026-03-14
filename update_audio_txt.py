input_file = 'all_filelist.txt'
out_file = 's3_selected_folder_lists/audio.txt'

with open(input_file, 'r', encoding='utf-8') as f:
    audio_files = []
    for line in f:
        parts = line.strip().split()
        if len(parts) < 4:
            continue
        key = parts[-1]
        if key.startswith('audio/'):
            audio_files.append(key)

with open(out_file, 'w', encoding='utf-8') as out:
    for k in audio_files:
        out.write(f'{k}\n')

print(f'Updated audio.txt with {len(audio_files)} entries.')
