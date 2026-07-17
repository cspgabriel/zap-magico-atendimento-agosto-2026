from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os, math

SIZES = [16, 24, 32, 48, 64, 128, 256]
COLOR_BG = "#0f172a"
COLOR_PRIMARY = "#f59e0b"
COLOR_SECONDARY = "#ffffff"

def create_png(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img, "RGBA")

    cx, cy = size // 2, size // 2
    r = size * 0.42

    # Circle BG
    draw.ellipse(
        [cx - r, cy - r, cx + r, cy + r],
        fill=COLOR_BG + "FF",
        outline=COLOR_PRIMARY + "FF",
        width=max(1, size // 24),
    )

    # Inner glow circle
    glow_r = r * 0.7
    for i in range(5):
        alpha = int(15 - i * 3)
        c = cx + int(math.cos(math.pi / 4) * r * 0.15)
        d = cy - int(math.sin(math.pi / 4) * r * 0.15)
        draw.ellipse(
            [c - glow_r - i * 2, d - glow_r - i * 2, c + glow_r + i * 2, d + glow_r + i * 2],
            outline=(245, 158, 11, max(0, alpha)),
            width=1,
        )

    # Magic wand star (sparkle)
    sparkle_size = size * 0.08
    sparkle_x = cx + r * 0.35
    sparkle_y = cy - r * 0.4
    draw.polygon(
        [
            (sparkle_x, sparkle_y - sparkle_size),
            (sparkle_x + sparkle_size * 0.3, sparkle_y - sparkle_size * 0.3),
            (sparkle_x + sparkle_size, sparkle_y),
            (sparkle_x + sparkle_size * 0.3, sparkle_y + sparkle_size * 0.3),
            (sparkle_x, sparkle_y + sparkle_size),
            (sparkle_x - sparkle_size * 0.3, sparkle_y + sparkle_size * 0.3),
            (sparkle_x - sparkle_size, sparkle_y),
            (sparkle_x - sparkle_size * 0.3, sparkle_y - sparkle_size * 0.3),
        ],
        fill=(255, 255, 255, 220),
    )

    # Small sparkle dots
    for angle, dist_factor in [(0, 0.5), (90, 0.4), (180, 0.6), (270, 0.45)]:
        a = math.radians(angle)
        dx = sparkle_x + math.cos(a) * sparkle_size * 1.8
        dy = sparkle_y + math.sin(a) * sparkle_size * 1.8
        dot_r = max(1, size * 0.015)
        draw.ellipse(
            [dx - dot_r, dy - dot_r, dx + dot_r, dy + dot_r],
            fill=(245, 158, 11, 180),
        )

    # Letter "Z" in bold
    font_size = int(size * 0.38)
    try:
        font = ImageFont.truetype("C:\\Windows\\Fonts\\segoeuib.ttf", font_size)
    except:
        font = ImageFont.load_default()

    text = "Z"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = cx - tw // 2 + int(r * 0.02)
    ty = cy - th // 2 - int(size * 0.02)

    # Shadow
    shadow_offset = max(1, size // 48)
    draw.text((tx + shadow_offset, ty + shadow_offset), text, fill=(0, 0, 0, 60), font=font)
    draw.text((tx, ty), text, fill=COLOR_PRIMARY + "FF", font=font)

    # Chat bubble tail (small triangle bottom-right)
    tail_size = size * 0.08
    bx = cx + r * 0.3
    by = cy + r * 0.3
    draw.polygon(
        [
            (bx - tail_size, by - tail_size * 0.5),
            (bx, by),
            (bx - tail_size * 0.5, by - tail_size),
        ],
        fill=COLOR_BG + "FF",
        outline=COLOR_PRIMARY + "60",
    )

    return img


output_dir = os.path.join(os.path.dirname(__file__), "..", "resources")
os.makedirs(output_dir, exist_ok=True)

# Generate all sizes
pngs = []
for s in SIZES:
    img = create_png(s)
    path = os.path.join(output_dir, f"icon-{s}.png")
    img.save(path, "PNG")
    pngs.append(img)
    print(f"  icon-{s}.png ({s}x{s})")

# Save 256x256 as main PNG
main_png = create_png(256)
main_png.save(os.path.join(output_dir, "icon.png"), "PNG")
print(f"  icon.png (256x256)")

# Create ICO (multi-size)
ico_path = os.path.join(output_dir, "icon.ico")
main_png.save(ico_path, "ICO", sizes=[(s, s) for s in SIZES])
print(f"  icon.ico (multi-size)")

print("\nDone!")
