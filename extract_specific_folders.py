import os

input_file = 'all_filelist.txt'
output_dir = 's3_selected_folder_lists'
folders_to_extract = ['audio', 'background', 'graphic', 'icons', 'logos', 'vid']

os.makedirs(output_dir, exist_ok=True)
folder_files = {folder: [] for folder in folders_to_extract}

with open(input_file, 'r', encoding='utf-8') as f:
    for line in f:
        parts = line.strip().split()
        if len(parts) < 4:
            continue
        key = parts[-1]
        for folder in folders_to_extract:
            if key.startswith(folder + '/'):  # Only top-level folder
                folder_files[folder].append(key)

for folder, files in folder_files.items():
    out_path = os.path.join(output_dir, f'{folder}_files.txt')
    with open(out_path, 'w', encoding='utf-8') as out:
        for k in files:
            out.write(f'{k}\n')

print(f'Created files for: {', '.join(folders_to_extract)} in {output_dir}')
