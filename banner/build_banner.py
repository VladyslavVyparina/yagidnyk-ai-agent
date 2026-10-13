# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC = "/Users/macbookpro/.cursor/projects/Users-macbookpro-Desktop-AI-Agent-Yagidnyk/assets/banner_premium_base.png"
OUT = "/Users/macbookpro/Desktop/AI-Agent_Yagidnyk/banner/banner_premium_1584x396.png"
FONT_PATH = "/System/Library/Fonts/HelveticaNeue.ttc"

W, H = 1584, 396

img = Image.open(SRC).convert("RGB")
w, h = img.size
target_ratio = W / H
crop_h = int(w / target_ratio)
top = int((h - crop_h) * 0.42)
box = (0, top, w, top + crop_h)
cropped = img.crop(box)
canvas = cropped.resize((W, H), Image.LANCZOS)

# gentle overall darken gradient towards the right so any background detail recedes
grad = Image.new("L", (W, 1), 0)
for x in range(W):
    t = x / W
    val = 0
    if t > 0.34:
        val = int(60 * min(1, (t - 0.34) / 0.3))
    grad.putpixel((x, 0), min(val, 60))
grad = grad.resize((W, H))
black = Image.new("RGB", (W, H), (0, 0, 0))
canvas = Image.composite(black, canvas, grad)

draw = ImageDraw.Draw(canvas)

title_font = ImageFont.truetype(FONT_PATH, 40, index=1)   # Bold
sub_font = ImageFont.truetype(FONT_PATH, 21, index=0)      # Regular

title_lines = [
    "AI Systems  \u2022  Agentic Workflows",
    "\u2022  Scalable Architecture",
]
subtitle_lines = [
    "Turning complex AI models into",
    "revenue-generating products.",
]

right_margin = 60
max_text_width = 880

def line_width(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]

title_w = max(line_width(draw, l, title_font) for l in title_lines)
block_x = W - right_margin - title_w

title_h = title_font.getbbox("Ag")[3] - title_font.getbbox("Ag")[1]
line_gap = 12
sub_gap_top = 22
sub_h = sub_font.getbbox("Ag")[3] - sub_font.getbbox("Ag")[1]
sub_line_gap = 8

total_h = (title_h * len(title_lines) + line_gap * (len(title_lines) - 1)
           + sub_gap_top + sub_h * len(subtitle_lines) + sub_line_gap * (len(subtitle_lines) - 1))

start_y = (H - total_h) // 2

# soft feathered dark panel behind the text block for guaranteed legibility
pad_x, pad_top, pad_bottom = 34, 22, 22
panel_left = W - right_margin - title_w - pad_x
panel_top = start_y - pad_top
panel_right = W - int(right_margin * 0.35)
panel_bottom = start_y + total_h + pad_bottom

mask = Image.new("L", (W, H), 0)
mdraw = ImageDraw.Draw(mask)
mdraw.rounded_rectangle(
    [panel_left, panel_top, panel_right, panel_bottom],
    radius=18, fill=140,
)
mask = mask.filter(ImageFilter.GaussianBlur(24))
black_panel = Image.new("RGB", (W, H), (5, 7, 12))
canvas = Image.composite(black_panel, canvas, mask)

draw = ImageDraw.Draw(canvas)

y = start_y
for line in title_lines:
    lw = line_width(draw, line, title_font)
    x = W - right_margin - lw
    draw.text((x, y), line, font=title_font, fill=(255, 255, 255, 255))
    y += title_h + line_gap

y += sub_gap_top - line_gap
for line in subtitle_lines:
    lw = line_width(draw, line, sub_font)
    x = W - right_margin - lw
    draw.text((x, y), line, font=sub_font, fill=(176, 182, 192, 255))
    y += sub_h + sub_line_gap

canvas.save(OUT)
print("saved", OUT, canvas.size)
