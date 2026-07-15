#!/usr/bin/env python3
"""Génère les déclinaisons PNG des logos SVG (cairosvg).

Usage : python branding/generate_png.py
Sorties dans branding/png/ : icônes d'application (toutes tailles stores),
favicons, logos et splash screens.
"""

from pathlib import Path

import cairosvg

ROOT = Path(__file__).resolve().parent
SVG = ROOT / "svg"
PNG = ROOT / "png"

# (fichier source, nom de sortie, largeur px)
EXPORTS = [
    ("app-icon.svg", "app-icon-1024.png", 1024),   # App Store
    ("app-icon.svg", "app-icon-512.png", 512),     # Play Store
    ("app-icon.svg", "app-icon-192.png", 192),
    ("app-icon.svg", "app-icon-96.png", 96),
    ("favicon.svg", "favicon-64.png", 64),
    ("favicon.svg", "favicon-32.png", 32),
    ("favicon.svg", "favicon-16.png", 16),
    ("mark.svg", "mark-512.png", 512),
    ("logo-principal.svg", "logo-principal-960.png", 960),
    ("logo-principal-dark.svg", "logo-principal-dark-960.png", 960),
    ("logo-horizontal.svg", "logo-horizontal-1200.png", 1200),
    ("logo-horizontal-dark.svg", "logo-horizontal-dark-1200.png", 1200),
    ("logo-monochrome.svg", "logo-monochrome-512.png", 512),
    ("logo-monochrome-blanc.svg", "logo-monochrome-blanc-512.png", 512),
    ("splash.svg", "splash-1080x1920.png", 1080),
]


def main() -> None:
    PNG.mkdir(exist_ok=True)
    for source, output, width in EXPORTS:
        cairosvg.svg2png(
            url=str(SVG / source),
            write_to=str(PNG / output),
            output_width=width,
        )
        print(f"✓ {output}")


if __name__ == "__main__":
    main()
