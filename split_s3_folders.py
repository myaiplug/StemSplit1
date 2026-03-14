import os
from collections import defaultdict

input_file = 'filelist.txt'
output_dir = 's3_folder_lists'

# Create output directory if it doesn't exist
os.makedirs(output_dir, exist_ok=True)

folders = defaultdict(list)

with open(input_file, 'r', encoding='utf-8') as f:
    for line in f:
        parts = line.strip().split()
        if len(parts) < 4:
            continue
        # S3 key is always the last part
        key = parts[-1]
        # Get top-level folder (prefix)
        prefix = key.split('/')[0]
        folders[prefix].append(key)

for prefix, keys in folders.items():
    out_path = os.path.join(output_dir, f'{prefix}_files.txt')
    with open(out_path, 'w', encoding='utf-8') as out:
        for k in keys:
            out.write(f'{k}\n')

print(f'Created {len(folders)} files in {output_dir}')
