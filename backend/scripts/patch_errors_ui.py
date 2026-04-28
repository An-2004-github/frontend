# -*- coding: utf-8 -*-
"""Replace inline error spans with absolute-positioned tooltip style in hotels/trains/buses pages."""

ERROR_CSS = (
    'position: absolute; top: calc(100% + 4px); left: 0; '
    'font-size: 0.7rem; color: #fff; '
    'background: #e74c3c; border-radius: 6px; '
    'padding: 0.2rem 0.55rem; '
    'display: flex; align-items: center; gap: 0.3rem; '
    'white-space: nowrap; z-index: 10; '
    'box-shadow: 0 2px 8px rgba(231,76,60,0.3);'
)

OLD_SPAN = (
    'style={{ fontSize: "0.72rem", color: "#c0392b", marginTop: "0.25rem", '
    'display: "flex", alignItems: "center", gap: "0.3rem" }}'
)
NEW_SPAN = (
    'style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, '
    'fontSize: "0.7rem", color: "#fff", background: "#e74c3c", '
    'borderRadius: "6px", padding: "0.2rem 0.55rem", '
    'display: "flex", alignItems: "center", gap: "0.3rem", '
    'whiteSpace: "nowrap", zIndex: 10, '
    'boxShadow: "0 2px 8px rgba(231,76,60,0.3)" }}'
)

FILES = [
    r'c:/Users/ADMIN/Documents/DATN/frontend/app/hotels/page.tsx',
    r'c:/Users/ADMIN/Documents/DATN/frontend/app/trains/page.tsx',
    r'c:/Users/ADMIN/Documents/DATN/frontend/app/buses/page.tsx',
]

for path in FILES:
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()

    if OLD_SPAN in src:
        src = src.replace(OLD_SPAN, NEW_SPAN)
        print(f"Replaced error span style in {path.split('/')[-2]}")
    else:
        print(f"WARN: span style not found in {path.split('/')[-2]}")

    # Also ensure the search-field wrapper has position: relative
    # hotels
    src = src.replace(
        'display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 160px;',
        'display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 160px; position: relative;',
    )
    # trains / buses - find their field class
    for cls in ['.tp-search-field', '.bp-search-field']:
        needle = f'{cls} {{\n                    display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 120px;'
        replacement = f'{cls} {{\n                    display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 120px; position: relative;'
        if needle in src:
            src = src.replace(needle, replacement)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(src)

print("Done")
