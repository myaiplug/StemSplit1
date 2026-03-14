import struct
import io

def create_icon_file(filename, size=32):
    """Create a minimal valid 32x32 1-bit ICO file"""
    
    # Icon directory header (6 bytes)
    ico_data = io.BytesIO()
    ico_data.write(struct.pack('<H', 0))      # Reserved
    ico_data.write(struct.pack('<H', 1))      # Type (1 = ICO)
    ico_data.write(struct.pack('<H', 1))      # Number of images
    
    # Image directory entry (16 bytes) 
    ico_data.write(struct.pack('B', 32))      # Width
    ico_data.write(struct.pack('B', 32))      # Height
    ico_data.write(struct.pack('B', 0))       # Color count
    ico_data.write(struct.pack('B', 0))       # Reserved
    ico_data.write(struct.pack('<H', 1))      # Color planes
    ico_data.write(struct.pack('<H', 1))      # Bits per pixel
    
    # Create BMP data
    # For 1-bit image: 32 pixels = 4 bytes per row
    # Color table: 2 entries × 4 bytes = 8 bytes
    # BMP header: 40 bytes
    row_size = 4
    # BMP data size = header + color table + image data + mask data
    bmp_data_size = 40 + 8 + (row_size * 32 * 2)
    
    ico_data.write(struct.pack('<I', bmp_data_size))  # Image size
    ico_data.write(struct.pack('<I', 22))             # Image offset
    
    # BMP Header (40 bytes - BITMAPINFOHEADER)
    ico_data.write(struct.pack('<I', 40))             # Header size
    ico_data.write(struct.pack('<i', 32))             # Width
    ico_data.write(struct.pack('<i', 64))             # Height (doubled for AND and XOR masks)
    ico_data.write(struct.pack('<H', 1))              # Color planes
    ico_data.write(struct.pack('<H', 1))              # Bits per pixel
    ico_data.write(struct.pack('<I', 0))              # Compression
    ico_data.write(struct.pack('<I', bmp_data_size - 40))  # Image size
    ico_data.write(struct.pack('<i', 0))              # X pixels per meter
    ico_data.write(struct.pack('<i', 0))              # Y pixels per meter
    ico_data.write(struct.pack('<I', 2))              # Color table entries
    ico_data.write(struct.pack('<I', 0))              # Important colors
    
    # Color table (black and white)
    ico_data.write(b'\x00\x00\x00\x00')  # Black
    ico_data.write(b'\xff\xff\xff\xff')  # White
    
    # Image data (all zeros - will be displayed as all black)
    for _ in range(32):
        ico_data.write(b'\x00\x00\x00\x00')
    
    # AND mask (all ones - fully opaque)
    for _ in range(32):
        ico_data.write(b'\xff\xff\xff\xff')
    
    # Write to file
    with open(filename, 'wb') as f:
        f.write(ico_data.getvalue())
    
    print(f'Created {filename} ({len(ico_data.getvalue())} bytes)')

create_icon_file(r'e:\Projects\1_StemSplit\src-tauri\icons\icon.ico')
print("Icon file created successfully!")
