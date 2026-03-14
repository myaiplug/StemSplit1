import os
from collections import defaultdict

input_file = 'all_filelist.txt'
output_dir = 's3_all_folder_lists'

os.makedirs(output_dir, exist_ok=True)
folders = defaultdict(list)

with open(input_file, 'r', encoding='utf-8') as f:
    for line in f:
        parts = line.strip().split()
        if len(parts) < 4:
            continue
        key = parts[-1]
        prefix = key.split('/')[0]
        folders[prefix].append(key)

for prefix, keys in folders.items():
    out_path = os.path.join(output_dir, f'{prefix}_files.txt')
    with open(out_path, 'w', encoding='utf-8') as out:
        for k in keys:
            out.write(f'{k}\n')

print(f'Created {len(folders)} files in {output_dir}')
