#!/usr/bin/env python3
"""
Studio-style product renders for the local CPU / GPU catalogue.

Every product gets two original SVG "photos":
    img/products/<id>.svg      — main view
    img/products/<id>-b.svg    — second view (GPU backplate / CPU underside)

Nothing is copied from the web: each image is drawn from primitives
(gradients, bevels, soft shadows), so the project stays offline-safe.
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "img", "products")
os.makedirs(OUT, exist_ok=True)

W, H = 800, 600

# ---------------------------------------------------------------- helpers
def defs(extra=""):
    return f"""<defs>
<linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#fdfdfe"/><stop offset=".28" stop-color="#d8dde6"/>
  <stop offset=".52" stop-color="#aeb6c4"/><stop offset=".74" stop-color="#dfe4ec"/>
  <stop offset="1" stop-color="#9aa3b4"/>
</linearGradient>
<linearGradient id="metalEdge" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#8b94a4"/><stop offset="1" stop-color="#5e6676"/>
</linearGradient>
<linearGradient id="shroud" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#3a414f"/><stop offset=".18" stop-color="#262c37"/>
  <stop offset=".75" stop-color="#171b23"/><stop offset="1" stop-color="#0e1116"/>
</linearGradient>
<linearGradient id="shroudTop" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#ffffff" stop-opacity=".18"/>
  <stop offset=".45" stop-color="#ffffff" stop-opacity=".05"/>
  <stop offset="1" stop-color="#ffffff" stop-opacity=".14"/>
</linearGradient>
<linearGradient id="pcb" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#1b2a36"/><stop offset="1" stop-color="#0d151d"/>
</linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#f7d98a"/><stop offset=".5" stop-color="#d9ac45"/>
  <stop offset="1" stop-color="#a87c23"/>
</linearGradient>
<linearGradient id="fin" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#737c8c"/><stop offset=".5" stop-color="#c9d0db"/>
  <stop offset="1" stop-color="#6c7484"/>
</linearGradient>
<radialGradient id="blade" cx=".5" cy=".5" r=".5">
  <stop offset="0" stop-color="#5b6473"/><stop offset=".65" stop-color="#2d333e"/>
  <stop offset="1" stop-color="#1b2027"/>
</radialGradient>
<radialGradient id="glass" cx=".35" cy=".3" r=".8">
  <stop offset="0" stop-color="#ffffff" stop-opacity=".22"/>
  <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
  <feGaussianBlur stdDeviation="14"/>
</filter>
<filter id="soft2" x="-30%" y="-30%" width="160%" height="160%">
  <feGaussianBlur stdDeviation="5"/>
</filter>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
  <feGaussianBlur stdDeviation="9" result="b"/>
  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
{extra}
</defs>"""


def shadow(cx, cy, rx, ry, op=".26"):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#0b1018" opacity="{op}" filter="url(#soft)"/>'


def wrap(body, extra_defs=""):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
        f'font-family="Inter, Segoe UI, Arial, sans-serif">{defs(extra_defs)}{body}</svg>'
    )


def fan(cx, cy, r, accent, blades=9, hub_text=""):
    """A realistic-ish cooling fan: recessed well, curved blades, lit hub."""
    s = [
        f'<circle cx="{cx}" cy="{cy}" r="{r + 10}" fill="#11151c"/>',
        f'<circle cx="{cx}" cy="{cy}" r="{r + 6}" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="6"/>',
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#blade)"/>',
    ]
    for i in range(blades):
        a = i * (360 / blades)
        shade = ["#5c6675", "#505a69", "#454e5c", "#4a5461"][i % 4]
        s.append(
            f'<path d="M{cx} {cy} q {r*0.62:.1f} {-r*0.46:.1f} {r*0.96:.1f} {-r*0.2:.1f} '
            f'q {-r*0.3:.1f} {r*0.46:.1f} {-r*0.96:.1f} {r*0.2:.1f} z" '
            f'fill="{shade}" opacity=".95" transform="rotate({a:.1f} {cx} {cy})"/>'
        )
        s.append(
            f'<path d="M{cx} {cy} q {r*0.62:.1f} {-r*0.46:.1f} {r*0.96:.1f} {-r*0.2:.1f}" '
            f'fill="none" stroke="#99a3b2" stroke-opacity=".35" stroke-width="2" '
            f'transform="rotate({a:.1f} {cx} {cy})"/>'
        )
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{r*0.33:.0f}" fill="#1a1f27"/>')
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{r*0.33:.0f}" fill="none" stroke="{accent}" stroke-width="3" opacity=".9"/>')
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{r*0.14:.0f}" fill="{accent}" opacity=".85" filter="url(#glow)"/>')
    if hub_text:
        s.append(
            f'<text x="{cx}" y="{cy + r*0.33 + 20:.0f}" text-anchor="middle" font-size="13" '
            f'fill="#aeb6c4" letter-spacing="2">{hub_text}</text>'
        )
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#glass)"/>')
    return "".join(s)


# ---------------------------------------------------------------- CPU
def cpu_front(brand, model, accent, maker):
    """Top-down IHS view on substrate."""
    cxw, cyh = 330, 330
    x, y = (W - cxw) / 2, (H - cyh) / 2 - 10
    s = [shadow(W / 2, y + cyh + 26, 190, 26)]
    # substrate
    s.append(f'<rect x="{x-14}" y="{y-14}" width="{cxw+28}" height="{cyh+28}" rx="14" fill="url(#pcb)"/>')
    s.append(f'<rect x="{x-14}" y="{y-14}" width="{cxw+28}" height="{cyh+28}" rx="14" fill="none" stroke="#2f4150" stroke-width="2"/>')
    # tiny smd parts on substrate
    for i in range(10):
        s.append(f'<rect x="{x-6+i*34}" y="{y+cyh+2}" width="16" height="7" rx="2" fill="#3d4f5e"/>')
        s.append(f'<rect x="{x-6+i*34}" y="{y-9}" width="16" height="7" rx="2" fill="#3d4f5e"/>')
    # IHS bevel + top
    s.append(f'<rect x="{x}" y="{y}" width="{cxw}" height="{cyh}" rx="12" fill="url(#metalEdge)"/>')
    s.append(f'<rect x="{x+10}" y="{y+10}" width="{cxw-20}" height="{cyh-20}" rx="8" fill="url(#metal)"/>')
    s.append(
        f'<path d="M{x+10} {y+10} h{cxw-20} l-46 46 h-{cxw-112} z" fill="#ffffff" opacity=".35"/>'
    )
    # engraved labels
    s.append(
        f'<text x="{W/2}" y="{y+118}" text-anchor="middle" font-size="40" font-weight="800" '
        f'fill="#4a5361" letter-spacing="4">{maker}</text>'
    )
    s.append(
        f'<text x="{W/2}" y="{y+166}" text-anchor="middle" font-size="25" font-weight="700" '
        f'fill="#5d6675" letter-spacing="1">{brand}</text>'
    )
    s.append(
        f'<text x="{W/2}" y="{y+206}" text-anchor="middle" font-size="21" fill="#6f7888" letter-spacing="1">{model}</text>'
    )
    s.append(f'<rect x="{W/2-92}" y="{y+228}" width="184" height="3" rx="1.5" fill="#8b94a4" opacity=".6"/>')
    s.append(
        f'<text x="{W/2}" y="{y+262}" text-anchor="middle" font-size="13" fill="#7c8595" letter-spacing="3">DESKTOP PROCESSOR</text>'
    )
    # accent corner marker (pin-1 triangle)
    s.append(f'<path d="M{x+18} {y+cyh-18} h30 l-30 -30 z" fill="{accent}"/>')
    s.append(f'<circle cx="{x+cxw-34}" cy="{y+cyh-34}" r="7" fill="#9aa3b4" opacity=".7"/>')
    return wrap("".join(s))


def cpu_back(accent, maker, pins="lga"):
    """Underside: contact pads or pin grid."""
    cxw = 340
    x, y = (W - cxw) / 2, (H - cxw) / 2 - 10
    s = [shadow(W / 2, y + cxw + 24, 190, 24)]
    s.append(f'<rect x="{x}" y="{y}" width="{cxw}" height="{cxw}" rx="14" fill="url(#pcb)"/>')
    s.append(f'<rect x="{x}" y="{y}" width="{cxw}" height="{cxw}" rx="14" fill="none" stroke="#33465a" stroke-width="2"/>')
    step = 13
    n = int((cxw - 56) / step)
    for r in range(n):
        for c in range(n):
            px, py = x + 28 + c * step, y + 28 + r * step
            # leave a clear window in the middle, like real packages
            if 0.33 * cxw < px - x < 0.67 * cxw and 0.38 * cxw < py - y < 0.62 * cxw:
                continue
            if pins == "pga":
                s.append(f'<circle cx="{px:.0f}" cy="{py:.0f}" r="3.6" fill="url(#gold)"/>')
            else:
                s.append(f'<rect x="{px:.0f}" y="{py:.0f}" width="7" height="7" rx="1.4" fill="url(#gold)"/>')
    s.append(f'<rect x="{x+0.33*cxw:.0f}" y="{y+0.38*cxw:.0f}" width="{0.34*cxw:.0f}" height="{0.24*cxw:.0f}" rx="6" fill="#15202b"/>')
    s.append(
        f'<text x="{W/2}" y="{y+0.52*cxw:.0f}" text-anchor="middle" font-size="18" fill="#6f8296" letter-spacing="3">{maker}</text>'
    )
    s.append(f'<path d="M{x+16} {y+cxw-16} h26 l-26 -26 z" fill="{accent}"/>')
    return wrap("".join(s))


# ---------------------------------------------------------------- GPU
def gpu_front(label, sub, accent, fans=3, tall=False):
    cardw, cardh = 660, (250 if tall else 220)
    x, y = (W - cardw) / 2, (H - cardh) / 2 + 6
    s = [shadow(W / 2, y + cardh + 22, 310, 22)]
    # heatsink fins peeking above the shroud
    s.append(f'<rect x="{x+16}" y="{y-26}" width="{cardw-60}" height="30" rx="5" fill="#6d7585"/>')
    for i in range(int((cardw - 70) / 7)):
        s.append(f'<rect x="{x+20+i*7}" y="{y-26}" width="3" height="30" fill="url(#fin)" opacity=".85"/>')
    # shroud
    s.append(f'<rect x="{x}" y="{y}" width="{cardw}" height="{cardh}" rx="16" fill="url(#shroud)"/>')
    s.append(f'<rect x="{x}" y="{y}" width="{cardw}" height="14" rx="7" fill="url(#shroudTop)"/>')
    s.append(f'<rect x="{x+6}" y="{y+6}" width="{cardw-12}" height="{cardh-12}" rx="12" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="2"/>')
    # accent light strip
    s.append(f'<rect x="{x+22}" y="{y+cardh-16}" width="{cardw-44}" height="5" rx="2.5" fill="{accent}" opacity=".9" filter="url(#glow)"/>')
    # fans
    r = 92 if fans == 3 else 104
    gap = (cardw - 40) / fans
    for i in range(fans):
        cx = x + 20 + gap * (i + 0.5)
        s.append(fan(cx, y + cardh / 2 - 4, r * 0.86, accent, hub_text=""))
    # brand plate
    s.append(
        f'<text x="{x+26}" y="{y+34}" font-size="19" font-weight="800" fill="#e8ecf3" letter-spacing="3">{label}</text>'
    )
    s.append(
        f'<text x="{x+cardw-26}" y="{y+34}" text-anchor="end" font-size="14" fill="{accent}" letter-spacing="2">{sub}</text>'
    )
    # power connector on top edge
    s.append(f'<rect x="{x+cardw-172}" y="{y-20}" width="92" height="22" rx="4" fill="#1d222b"/>')
    for i in range(6):
        s.append(f'<rect x="{x+cardw-166+i*15}" y="{y-15}" width="10" height="12" rx="2" fill="#39414f"/>')
    # PCIe bracket + contacts
    s.append(f'<rect x="{x-26}" y="{y-14}" width="26" height="{cardh+28}" rx="5" fill="url(#metal)"/>')
    for i, oy in enumerate((26, 76, 126)):
        s.append(f'<rect x="{x-21}" y="{y+oy}" width="16" height="30" rx="3" fill="#14181f"/>')
        s.append(f'<rect x="{x-19}" y="{y+oy+4}" width="12" height="22" rx="2" fill="#2b3240"/>')
    s.append(f'<rect x="{x+150}" y="{y+cardh}" width="250" height="22" rx="3" fill="url(#gold)"/>')
    s.append(f'<rect x="{x+60}" y="{y+cardh}" width="76" height="22" rx="3" fill="url(#gold)"/>')
    for i in range(14):
        s.append(f'<rect x="{x+162+i*17}" y="{y+cardh}" width="3" height="22" fill="#0e1116" opacity=".35"/>')
    return wrap("".join(s))


def gpu_back(label, accent, memory):
    cardw, cardh = 660, 230
    x, y = (W - cardw) / 2, (H - cardh) / 2 + 6
    s = [shadow(W / 2, y + cardh + 22, 310, 22)]
    s.append(f'<rect x="{x}" y="{y}" width="{cardw}" height="{cardh}" rx="16" fill="#1a1f29"/>')
    s.append(f'<rect x="{x}" y="{y}" width="{cardw}" height="{cardh}" rx="16" fill="url(#shroudTop)" opacity=".5"/>')
    # backplate cut-out vents (angled slats)
    vent_x = x + cardw - 300
    for i in range(8):
        sx = vent_x + i * 34
        s.append(
            f'<path d="M{sx} {y+36} l18 0 l-26 {cardh-72} l-18 0 z" fill="#0b0e14"/>'
        )
        s.append(
            f'<path d="M{sx} {y+36} l18 0 l-26 {cardh-72} l-18 0 z" fill="none" stroke="#2b3240" stroke-width="1.5"/>'
        )
    # screws
    for cx, cy in ((x + 26, y + 26), (x + cardw - 26, y + 26), (x + 26, y + cardh - 26), (x + cardw - 26, y + cardh - 26)):
        s.append(f'<circle cx="{cx}" cy="{cy}" r="8" fill="#2c323e"/>')
        s.append(f'<circle cx="{cx}" cy="{cy}" r="8" fill="none" stroke="#161b23" stroke-width="1.5"/>')
        s.append(f'<path d="M{cx-4} {cy} h8 M{cx} {cy-4} v8" stroke="#6b7484" stroke-width="2"/>')
    s.append(
        f'<text x="{x+46}" y="{y+108}" font-size="34" font-weight="800" fill="#e8ecf3" letter-spacing="2">{label}</text>'
    )
    s.append(f'<text x="{x+46}" y="{y+142}" font-size="17" fill="{accent}" letter-spacing="3">{memory}</text>')
    s.append(f'<rect x="{x+46}" y="{y+160}" width="150" height="4" rx="2" fill="{accent}" opacity=".7"/>')
    s.append(f'<rect x="{x+150}" y="{y+cardh}" width="250" height="20" rx="3" fill="url(#gold)"/>')
    s.append(f'<rect x="{x+60}" y="{y+cardh}" width="76" height="20" rx="3" fill="url(#gold)"/>')
    return wrap("".join(s))


# ---------------------------------------------------------------- catalogue
CPUS = [
    # id, maker, brand line, model, accent, socket style
    ("r7-7800x3d", "AMD", "RYZEN 7", "7800X3D  ·  8C / 16T", "#e0532c", "lga"),
    ("r5-7600x", "AMD", "RYZEN 5", "7600X  ·  6C / 12T", "#e0532c", "lga"),
    ("r9-7950x", "AMD", "RYZEN 9", "7950X  ·  16C / 32T", "#c2431f", "lga"),
    ("r5-5600", "AMD", "RYZEN 5", "5600  ·  6C / 12T", "#e0532c", "pga"),
    ("i5-14600k", "INTEL", "CORE i5", "14600K  ·  14C / 20T", "#3b82f6", "lga"),
    ("i7-14700k", "INTEL", "CORE i7", "14700K  ·  20C / 28T", "#2f6fd0", "lga"),
    ("i9-14900k", "INTEL", "CORE i9", "14900K  ·  24C / 32T", "#2563eb", "lga"),
    ("i3-14100f", "INTEL", "CORE i3", "14100F  ·  4C / 8T", "#60a5fa", "lga"),
]

GPUS = [
    # id, label, sub, accent, fans, memory
    ("rtx4060-asus", "ASUS DUAL", "GeForce RTX 4060 OC", "#3b82f6", 2, "8 GB GDDR6"),
    ("rtx4070s-msi", "MSI VENTUS 3X", "GeForce RTX 4070 SUPER", "#d0342c", 3, "12 GB GDDR6X"),
    ("rtx4080s-gb", "GIGABYTE GAMING OC", "GeForce RTX 4080 SUPER", "#e9a23b", 3, "16 GB GDDR6X"),
    ("rtx4070tis-zotac", "ZOTAC TRINITY", "GeForce RTX 4070 Ti SUPER", "#7c5cd6", 3, "16 GB GDDR6X"),
    ("rx7800xt-sapphire", "SAPPHIRE PULSE", "Radeon RX 7800 XT", "#17a2b8", 3, "16 GB GDDR6"),
    ("rx7900xtx-asus", "ASUS TUF GAMING", "Radeon RX 7900 XTX", "#6b7280", 3, "24 GB GDDR6"),
    ("rx7600-msi", "MSI MECH 2X", "Radeon RX 7600", "#d0342c", 2, "8 GB GDDR6"),
    ("rtx3050-gb", "GIGABYTE EAGLE", "GeForce RTX 3050", "#e9a23b", 2, "6 GB GDDR6"),
]


def write(name, svg):
    with open(os.path.join(OUT, name + ".svg"), "w", encoding="utf-8") as fh:
        fh.write(svg)


count = 0
for pid, maker, line, model, accent, pins in CPUS:
    write(pid, cpu_front(line, model, accent, maker))
    write(pid + "-b", cpu_back(accent, maker, pins))
    count += 2

for pid, label, sub, accent, fans, mem in GPUS:
    write(pid, gpu_front(label, sub, accent, fans=fans))
    write(pid + "-b", gpu_back(label.split()[0], accent, mem))
    count += 2

print(f"wrote {count} renders to {OUT}")
