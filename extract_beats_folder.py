import os

input_file = 'all_filelist.txt'
output_file = 'beats_files.txt'
folder = 'beats'

beats_files = []

with open(input_file, 'r', encoding='utf-8') as f:
    for line in f:
        parts = line.strip().split()
        if len(parts) < 4:
            continue
        key = parts[-1]
        if key.startswith(folder + '/'):  # Only top-level beats folder
            beats_files.append(key)

with open(output_file, 'w', encoding='utf-8') as out:
    for k in beats_files:
        out.write(f'{k}\n')

print(f'Updated list for /beats written to {output_file}')
