#!/usr/bin/env python3
"""Generates flat SVG artwork for the local PC-parts catalogue."""
import os

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "img", "parts")
os.makedirs(OUT, exist_ok=True)

HEAD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">'
TAIL = '</svg>'

INK = "#222836"
DARK = "#161a23"
PCB = "#20283a"
METAL = "#c8cedb"
METAL_D = "#98a1b2"
GOLD = "#e3b23c"
LIGHT = "#eef1f6"


def cpu(accent):
    s = [f'<rect x="108" y="58" width="184" height="184" rx="10" fill="{INK}"/>']
    s.append(f'<rect x="124" y="74" width="152" height="152" rx="6" fill="{DARK}"/>')
    s.append(f'<rect x="146" y="96" width="108" height="108" rx="4" fill="{accent}" opacity=".9"/>')
    s.append(f'<rect x="162" y="112" width="76" height="30" rx="3" fill="{LIGHT}" opacity=".85"/>')
    s.append(f'<rect x="162" y="152" width="50" height="10" rx="3" fill="{LIGHT}" opacity=".55"/>')
    s.append(f'<rect x="162" y="170" width="66" height="10" rx="3" fill="{LIGHT}" opacity=".35"/>')
    # pins
    for i in range(9):
        x = 118 + i * 20
        s.append(f'<rect x="{x}" y="246" width="9" height="12" rx="2" fill="{GOLD}"/>')
        s.append(f'<rect x="{x}" y="42" width="9" height="12" rx="2" fill="{GOLD}"/>')
    for i in range(9):
        y = 68 + i * 20
        s.append(f'<rect x="92" y="{y}" width="12" height="9" rx="2" fill="{GOLD}"/>')
        s.append(f'<rect x="296" y="{y}" width="12" height="9" rx="2" fill="{GOLD}"/>')
    s.append(f'<path d="M118 232h16l-16-16z" fill="{GOLD}"/>')
    return "".join(s)


def gpu(accent):
    s = [f'<rect x="28" y="96" width="344" height="112" rx="10" fill="{PCB}"/>']
    s.append(f'<rect x="28" y="96" width="344" height="92" rx="10" fill="{INK}"/>')
    s.append(f'<rect x="40" y="108" width="320" height="68" rx="8" fill="{DARK}"/>')
    for cx in (124, 266):
        s.append(f'<circle cx="{cx}" cy="142" r="44" fill="{PCB}"/>')
        s.append(f'<circle cx="{cx}" cy="142" r="40" fill="none" stroke="{accent}" stroke-width="3" opacity=".8"/>')
        for a in range(7):
            s.append(
                f'<path d="M{cx} 142 l 30 -10 a 32 32 0 0 1 -8 18 z" fill="{METAL_D}" opacity=".75" '
                f'transform="rotate({a * 51.4} {cx} 142)"/>'
            )
        s.append(f'<circle cx="{cx}" cy="142" r="11" fill="{accent}"/>')
    s.append(f'<rect x="196" y="112" width="8" height="60" rx="3" fill="{accent}" opacity=".55"/>')
    # pcie contacts
    s.append(f'<rect x="150" y="208" width="130" height="16" rx="2" fill="{GOLD}"/>')
    s.append(f'<rect x="96" y="208" width="42" height="16" rx="2" fill="{GOLD}"/>')
    # bracket
    s.append(f'<rect x="356" y="84" width="16" height="140" rx="4" fill="{METAL}"/>')
    s.append(f'<rect x="360" y="104" width="8" height="26" rx="2" fill="{DARK}"/>')
    s.append(f'<rect x="360" y="140" width="8" height="26" rx="2" fill="{DARK}"/>')
    return "".join(s)


def ram(accent):
    s = [f'<rect x="36" y="110" width="328" height="88" rx="8" fill="{PCB}"/>']
    # heat spreader
    s.append(f'<path d="M36 110h328v54H36z" fill="{INK}"/>')
    s.append(f'<path d="M36 110h328v18H36z" fill="{accent}" opacity=".85"/>')
    for i in range(16):
        s.append(f'<rect x="{48 + i * 20}" y="132" width="8" height="26" rx="2" fill="{DARK}" opacity=".7"/>')
    s.append(f'<rect x="150" y="170" width="100" height="18" rx="3" fill="{DARK}" opacity=".5"/>')
    # contacts
    for i in range(34):
        s.append(f'<rect x="{44 + i * 9.4:.0f}" y="190" width="6" height="12" fill="{GOLD}"/>')
    s.append(f'<rect x="196" y="190" width="10" height="14" fill="{PCB}"/>')
    return "".join(s)


def nvme(accent):
    s = [f'<rect x="40" y="124" width="320" height="56" rx="6" fill="{PCB}"/>']
    s.append(f'<rect x="96" y="134" width="90" height="36" rx="4" fill="{INK}"/>')
    s.append(f'<rect x="196" y="134" width="90" height="36" rx="4" fill="{INK}"/>')
    s.append(f'<rect x="296" y="138" width="52" height="28" rx="4" fill="{accent}" opacity=".85"/>')
    s.append(f'<rect x="106" y="144" width="56" height="8" rx="2" fill="{LIGHT}" opacity=".5"/>')
    s.append(f'<rect x="206" y="144" width="56" height="8" rx="2" fill="{LIGHT}" opacity=".3"/>')
    for i in range(10):
        s.append(f'<rect x="{46 + i * 5.2:.0f}" y="146" width="3" height="34" fill="{GOLD}"/>')
    s.append(f'<circle cx="358" cy="152" r="7" fill="none" stroke="{METAL}" stroke-width="3"/>')
    return "".join(s)


def hdd(accent):
    s = [f'<rect x="78" y="64" width="244" height="172" rx="10" fill="{METAL}"/>']
    s.append(f'<rect x="92" y="78" width="216" height="144" rx="6" fill="{INK}"/>')
    s.append(f'<circle cx="188" cy="150" r="62" fill="{DARK}"/>')
    s.append(f'<circle cx="188" cy="150" r="58" fill="none" stroke="{METAL_D}" stroke-width="2" opacity=".6"/>')
    s.append(f'<circle cx="188" cy="150" r="14" fill="{METAL}"/>')
    s.append(f'<circle cx="188" cy="150" r="5" fill="{accent}"/>')
    s.append(f'<path d="M286 96 L232 140 l14 16 54-44z" fill="{METAL_D}"/>')
    s.append(f'<circle cx="292" cy="92" r="12" fill="{METAL}"/>')
    for i in range(6):
        s.append(f'<circle cx="{100 + i * 0}" cy="{0}" r="0" fill="none"/>')
    s.append(f'<rect x="98" y="196" width="40" height="8" rx="3" fill="{accent}" opacity=".6"/>')
    return "".join(s)


def motherboard(accent):
    s = [f'<rect x="58" y="42" width="284" height="216" rx="10" fill="#1d4a3e"/>']
    s.append(f'<rect x="58" y="42" width="284" height="216" rx="10" fill="{PCB}" opacity=".55"/>')
    # cpu socket
    s.append(f'<rect x="88" y="70" width="82" height="82" rx="6" fill="{INK}"/>')
    s.append(f'<rect x="100" y="82" width="58" height="58" rx="4" fill="{accent}" opacity=".8"/>')
    # ram slots
    for i in range(4):
        x = 196 + i * 18
        s.append(f'<rect x="{x}" y="64" width="10" height="110" rx="3" fill="{DARK}"/>')
        s.append(f'<rect x="{x + 2}" y="68" width="6" height="100" rx="2" fill="{accent}" opacity=".5"/>')
    # pcie
    s.append(f'<rect x="88" y="178" width="186" height="14" rx="4" fill="{DARK}"/>')
    s.append(f'<rect x="88" y="206" width="140" height="14" rx="4" fill="{DARK}"/>')
    # chipset heatsink
    s.append(f'<rect x="246" y="192" width="74" height="54" rx="8" fill="{INK}"/>')
    for i in range(6):
        s.append(f'<rect x="{254 + i * 11}" y="200" width="5" height="38" rx="2" fill="{METAL_D}" opacity=".7"/>')
    # io shield
    s.append(f'<rect x="58" y="42" width="284" height="20" rx="6" fill="{INK}"/>')
    for i in range(7):
        s.append(f'<rect x="{72 + i * 24}" y="47" width="16" height="10" rx="2" fill="{METAL}" opacity=".8"/>')
    # capacitors
    for i in range(5):
        s.append(f'<circle cx="{98 + i * 16}" cy="166" r="5" fill="{METAL_D}"/>')
    return "".join(s)


def psu(accent):
    s = [f'<rect x="66" y="78" width="268" height="150" rx="10" fill="{INK}"/>']
    s.append(f'<rect x="66" y="78" width="268" height="150" rx="10" fill="none" stroke="{DARK}" stroke-width="4"/>')
    s.append(f'<circle cx="176" cy="152" r="58" fill="{DARK}"/>')
    for a in range(9):
        s.append(
            f'<path d="M176 152 l 44 -12 a 46 46 0 0 1 -12 26 z" fill="{METAL_D}" opacity=".7" '
            f'transform="rotate({a * 40} 176 152)"/>'
        )
    s.append(f'<circle cx="176" cy="152" r="14" fill="{accent}"/>')
    s.append(f'<rect x="252" y="100" width="66" height="26" rx="4" fill="{accent}" opacity=".85"/>')
    s.append(f'<rect x="252" y="138" width="66" height="10" rx="3" fill="{LIGHT}" opacity=".35"/>')
    s.append(f'<rect x="252" y="156" width="46" height="10" rx="3" fill="{LIGHT}" opacity=".25"/>')
    s.append(
        f'<path d="M334 196 q 36 10 30 40" fill="none" stroke="{DARK}" stroke-width="10" stroke-linecap="round"/>'
    )
    s.append(
        f'<path d="M334 180 q 46 6 44 50" fill="none" stroke="{METAL_D}" stroke-width="8" stroke-linecap="round"/>'
    )
    return "".join(s)


def pc_case(accent):
    s = [f'<rect x="112" y="28" width="176" height="248" rx="12" fill="{INK}"/>']
    s.append(f'<rect x="128" y="44" width="144" height="216" rx="8" fill="#2d3a52" opacity=".55"/>')
    for i, cy in enumerate((82, 146, 210)):
        s.append(f'<circle cx="172" cy="{cy}" r="26" fill="{DARK}"/>')
        for a in range(7):
            s.append(
                f'<path d="M172 {cy} l 18 -6 a 19 19 0 0 1 -5 11 z" fill="{accent}" opacity=".75" '
                f'transform="rotate({a * 51.4} 172 {cy})"/>'
            )
        s.append(f'<circle cx="172" cy="{cy}" r="7" fill="{METAL}"/>')
    s.append(f'<rect x="212" y="70" width="48" height="90" rx="5" fill="{INK}"/>')
    s.append(f'<rect x="212" y="176" width="48" height="26" rx="5" fill="{INK}"/>')
    s.append(f'<rect x="128" y="28" width="144" height="12" rx="6" fill="{accent}"/>')
    s.append(f'<circle cx="272" cy="48" r="5" fill="{accent}"/>')
    return "".join(s)


def cooler(accent):
    s = []
    for i in range(14):
        s.append(f'<rect x="96" y="{54 + i * 12}" width="120" height="7" rx="2" fill="{METAL}"/>')
    s.append(f'<rect x="96" y="222" width="120" height="18" rx="4" fill="{INK}"/>')
    for x in (116, 150, 184):
        s.append(f'<rect x="{x}" y="46" width="12" height="180" rx="6" fill="{METAL_D}"/>')
    s.append(f'<rect x="224" y="78" width="96" height="140" rx="8" fill="{INK}"/>')
    s.append(f'<circle cx="272" cy="148" r="44" fill="{DARK}"/>')
    for a in range(9):
        s.append(
            f'<path d="M272 148 l 32 -10 a 34 34 0 0 1 -9 20 z" fill="{accent}" opacity=".8" '
            f'transform="rotate({a * 40} 272 148)"/>'
        )
    s.append(f'<circle cx="272" cy="148" r="12" fill="{METAL}"/>')
    return "".join(s)


def aio(accent):
    s = [f'<rect x="40" y="64" width="128" height="172" rx="10" fill="{INK}"/>']
    for i in range(3):
        cy = 100 + i * 60
        s.append(f'<circle cx="104" cy="{cy}" r="24" fill="{DARK}"/>')
        for a in range(7):
            s.append(
                f'<path d="M104 {cy} l 17 -6 a 18 18 0 0 1 -5 11 z" fill="{METAL_D}" opacity=".7" '
                f'transform="rotate({a * 51.4} 104 {cy})"/>'
            )
    s.append(
        f'<path d="M168 110 q 70 -20 92 30" fill="none" stroke="{DARK}" stroke-width="16" stroke-linecap="round"/>'
    )
    s.append(
        f'<path d="M168 180 q 70 20 92 -20" fill="none" stroke="{DARK}" stroke-width="16" stroke-linecap="round"/>'
    )
    s.append(f'<rect x="244" y="112" width="96" height="96" rx="14" fill="{INK}"/>')
    s.append(f'<circle cx="292" cy="160" r="30" fill="{accent}" opacity=".9"/>')
    s.append(f'<circle cx="292" cy="160" r="16" fill="{DARK}"/>')
    return "".join(s)


def monitor(accent):
    s = [f'<rect x="44" y="48" width="312" height="176" rx="10" fill="{INK}"/>']
    s.append(f'<rect x="56" y="60" width="288" height="146" rx="5" fill="#223049"/>')
    s.append(f'<path d="M56 206 L344 60 v146z" fill="{accent}" opacity=".2"/>')
    s.append(f'<rect x="170" y="224" width="60" height="30" fill="{METAL_D}"/>')
    s.append(f'<rect x="130" y="252" width="140" height="14" rx="7" fill="{METAL}"/>')
    s.append(f'<circle cx="200" cy="216" r="4" fill="{accent}"/>')
    return "".join(s)


def keyboard(accent):
    s = [f'<rect x="34" y="96" width="332" height="132" rx="12" fill="{INK}"/>']
    s.append(f'<rect x="34" y="96" width="332" height="10" rx="5" fill="{accent}" opacity=".8"/>')
    for r in range(4):
        for c in range(14):
            x = 50 + c * 22
            y = 118 + r * 25
            w = 18
            if r == 3 and 3 <= c <= 9:
                if c > 3:
                    continue
                w = 150
            s.append(f'<rect x="{x}" y="{y}" width="{w}" height="19" rx="4" fill="{LIGHT}" opacity=".85"/>')
    return "".join(s)


def mouse(accent):
    s = [f'<path d="M200 46 c54 0 78 44 78 104 c0 64 -30 104 -78 104 c-48 0 -78 -40 -78 -104 c0 -60 24 -104 78 -104z" fill="{INK}"/>']
    s.append(f'<path d="M200 46 c-54 0 -78 44 -78 104 h78z" fill="{DARK}" opacity=".6"/>')
    s.append(f'<rect x="193" y="76" width="14" height="40" rx="7" fill="{accent}"/>')
    s.append(f'<path d="M140 206 c18 34 102 34 120 0" fill="none" stroke="{accent}" stroke-width="4" opacity=".5"/>')
    return "".join(s)


def fan(accent):
    s = [f'<rect x="88" y="44" width="224" height="224" rx="18" fill="{INK}"/>']
    s.append(f'<circle cx="200" cy="156" r="98" fill="{DARK}"/>')
    for a in range(9):
        s.append(
            f'<path d="M200 156 l 72 -24 a 76 76 0 0 1 -20 44 z" fill="{accent}" opacity=".75" '
            f'transform="rotate({a * 40} 200 156)"/>'
        )
    s.append(f'<circle cx="200" cy="156" r="30" fill="{INK}"/>')
    s.append(f'<circle cx="200" cy="156" r="12" fill="{METAL}"/>')
    for cx, cy in ((110, 66), (290, 66), (110, 246), (290, 246)):
        s.append(f'<circle cx="{cx}" cy="{cy}" r="8" fill="{DARK}"/>')
    return "".join(s)


def headset(accent):
    s = [f'<path d="M92 176 v-20 a108 108 0 0 1 216 0 v20" fill="none" stroke="{INK}" stroke-width="22" stroke-linecap="round"/>']
    s.append(f'<rect x="68" y="160" width="52" height="86" rx="20" fill="{INK}"/>')
    s.append(f'<rect x="280" y="160" width="52" height="86" rx="20" fill="{INK}"/>')
    s.append(f'<rect x="78" y="172" width="32" height="62" rx="14" fill="{accent}" opacity=".8"/>')
    s.append(f'<path d="M120 232 q 44 34 70 2" fill="none" stroke="{INK}" stroke-width="12" stroke-linecap="round"/>')
    s.append(f'<circle cx="194" cy="238" r="13" fill="{accent}"/>')
    return "".join(s)


SHAPES = {
    "cpu-amd": (cpu, "#e0532c"),
    "cpu-intel": (cpu, "#3b82f6"),
    "gpu-green": (gpu, "#17865f"),
    "gpu-red": (gpu, "#d0342c"),
    "gpu-blue": (gpu, "#3b82f6"),
    "ram-red": (ram, "#d0342c"),
    "ram-purple": (ram, "#7c5cd6"),
    "nvme": (nvme, "#17865f"),
    "nvme-blue": (nvme, "#3b82f6"),
    "hdd": (hdd, "#e9a23b"),
    "motherboard": (motherboard, "#e0532c"),
    "motherboard-blue": (motherboard, "#3b82f6"),
    "psu": (psu, "#e9a23b"),
    "psu-dark": (psu, "#7c5cd6"),
    "case": (pc_case, "#3b82f6"),
    "case-rgb": (pc_case, "#e0532c"),
    "cooler": (cooler, "#9aa3b2"),
    "aio": (aio, "#3b82f6"),
    "monitor": (monitor, "#3b82f6"),
    "keyboard": (keyboard, "#e0532c"),
    "mouse": (mouse, "#17865f"),
    "fan": (fan, "#7c5cd6"),
    "headset": (headset, "#e0532c"),
}

for name, (fn, accent) in SHAPES.items():
    svg = HEAD + fn(accent) + TAIL
    with open(os.path.join(OUT, name + ".svg"), "w", encoding="utf-8") as fh:
        fh.write(svg)

print(f"wrote {len(SHAPES)} files to {OUT}")
