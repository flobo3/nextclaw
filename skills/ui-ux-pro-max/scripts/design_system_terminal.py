#!/usr/bin/env python3
# -*- coding: utf-8 -*-

BOX_WIDTH = 90


def _wrap_text(text: str, prefix: str, width: int) -> list:
    if not text:
        return []
    words = text.split()
    lines = []
    current_line = prefix
    for word in words:
        if len(current_line) + len(word) + 1 <= width - 2:
            current_line += (" " if current_line != prefix else "") + word
            continue
        if current_line != prefix:
            lines.append(current_line)
        current_line = prefix + word
    if current_line != prefix:
        lines.append(current_line)
    return lines


def format_ascii_box(design_system: dict) -> str:
    project = design_system.get("project_name", "PROJECT")
    pattern = design_system.get("pattern", {})
    style = design_system.get("style", {})
    colors = design_system.get("colors", {})
    typography = design_system.get("typography", {})
    effects = design_system.get("key_effects", "")
    anti_patterns = design_system.get("anti_patterns", "")
    sections = [item.strip() for item in pattern.get("sections", "").split(">") if item.strip()]
    width = BOX_WIDTH - 1

    lines = [
        "+" + "-" * width + "+",
        f"|  TARGET: {project} - RECOMMENDED DESIGN SYSTEM".ljust(BOX_WIDTH) + "|",
        "+" + "-" * width + "+",
        "|" + " " * BOX_WIDTH + "|",
        f"|  PATTERN: {pattern.get('name', '')}".ljust(BOX_WIDTH) + "|",
    ]
    if pattern.get("conversion"):
        lines.append(f"|     Conversion: {pattern.get('conversion', '')}".ljust(BOX_WIDTH) + "|")
    if pattern.get("cta_placement"):
        lines.append(f"|     CTA: {pattern.get('cta_placement', '')}".ljust(BOX_WIDTH) + "|")
    lines.append("|     Sections:".ljust(BOX_WIDTH) + "|")
    for index, section in enumerate(sections, 1):
        lines.append(f"|       {index}. {section}".ljust(BOX_WIDTH) + "|")
    lines.extend(
        [
            "|" + " " * BOX_WIDTH + "|",
            f"|  STYLE: {style.get('name', '')}".ljust(BOX_WIDTH) + "|",
        ]
    )
    for text in _wrap_text(f"Keywords: {style.get('keywords', '')}", "|     ", BOX_WIDTH):
        lines.append(text.ljust(BOX_WIDTH) + "|")
    for text in _wrap_text(f"Best For: {style.get('best_for', '')}", "|     ", BOX_WIDTH):
        lines.append(text.ljust(BOX_WIDTH) + "|")
    if style.get("performance") or style.get("accessibility"):
        metrics = f"Performance: {style.get('performance', '')} | Accessibility: {style.get('accessibility', '')}"
        lines.append(f"|     {metrics}".ljust(BOX_WIDTH) + "|")
    lines.extend(
        [
            "|" + " " * BOX_WIDTH + "|",
            "|  COLORS:".ljust(BOX_WIDTH) + "|",
            f"|     Primary:    {colors.get('primary', '')}".ljust(BOX_WIDTH) + "|",
            f"|     Secondary:  {colors.get('secondary', '')}".ljust(BOX_WIDTH) + "|",
            f"|     CTA:        {colors.get('cta', '')}".ljust(BOX_WIDTH) + "|",
            f"|     Background: {colors.get('background', '')}".ljust(BOX_WIDTH) + "|",
            f"|     Text:       {colors.get('text', '')}".ljust(BOX_WIDTH) + "|",
        ]
    )
    for text in _wrap_text(f"Notes: {colors.get('notes', '')}", "|     ", BOX_WIDTH):
        lines.append(text.ljust(BOX_WIDTH) + "|")
    lines.extend(
        [
            "|" + " " * BOX_WIDTH + "|",
            f"|  TYPOGRAPHY: {typography.get('heading', '')} / {typography.get('body', '')}".ljust(BOX_WIDTH) + "|",
        ]
    )
    for label in ("Mood", "Best For"):
        source_key = "mood" if label == "Mood" else "best_for"
        for text in _wrap_text(f"{label}: {typography.get(source_key, '')}", "|     ", BOX_WIDTH):
            lines.append(text.ljust(BOX_WIDTH) + "|")
    if typography.get("google_fonts_url"):
        lines.append(f"|     Google Fonts: {typography.get('google_fonts_url', '')}".ljust(BOX_WIDTH) + "|")
    if typography.get("css_import"):
        preview = typography.get("css_import", "")[:70]
        lines.append(f"|     CSS Import: {preview}...".ljust(BOX_WIDTH) + "|")
    lines.append("|" + " " * BOX_WIDTH + "|")
    if effects:
        lines.append("|  KEY EFFECTS:".ljust(BOX_WIDTH) + "|")
        for text in _wrap_text(effects, "|     ", BOX_WIDTH):
            lines.append(text.ljust(BOX_WIDTH) + "|")
        lines.append("|" + " " * BOX_WIDTH + "|")
    if anti_patterns:
        lines.append("|  AVOID (Anti-patterns):".ljust(BOX_WIDTH) + "|")
        for text in _wrap_text(anti_patterns, "|     ", BOX_WIDTH):
            lines.append(text.ljust(BOX_WIDTH) + "|")
        lines.append("|" + " " * BOX_WIDTH + "|")
    checklist_items = [
        "[ ] No emojis as icons (use SVG: Heroicons/Lucide)",
        "[ ] cursor-pointer on all clickable elements",
        "[ ] Hover states with smooth transitions (150-300ms)",
        "[ ] Light mode: text contrast 4.5:1 minimum",
        "[ ] Focus states visible for keyboard nav",
        "[ ] prefers-reduced-motion respected",
        "[ ] Responsive: 375px, 768px, 1024px, 1440px",
    ]
    lines.append("|  PRE-DELIVERY CHECKLIST:".ljust(BOX_WIDTH) + "|")
    for item in checklist_items:
        lines.append(f"|     {item}".ljust(BOX_WIDTH) + "|")
    lines.extend(["|" + " " * BOX_WIDTH + "|", "+" + "-" * width + "+"])
    return "\n".join(lines)


def format_markdown(design_system: dict) -> str:
    pattern = design_system.get("pattern", {})
    style = design_system.get("style", {})
    colors = design_system.get("colors", {})
    typography = design_system.get("typography", {})
    effects = design_system.get("key_effects", "")
    anti_patterns = design_system.get("anti_patterns", "")

    lines = [
        f"## Design System: {design_system.get('project_name', 'PROJECT')}",
        "",
        "### Pattern",
        f"- **Name:** {pattern.get('name', '')}",
    ]
    if pattern.get("conversion"):
        lines.append(f"- **Conversion Focus:** {pattern.get('conversion', '')}")
    if pattern.get("cta_placement"):
        lines.append(f"- **CTA Placement:** {pattern.get('cta_placement', '')}")
    if pattern.get("color_strategy"):
        lines.append(f"- **Color Strategy:** {pattern.get('color_strategy', '')}")
    lines.extend(
        [
            f"- **Sections:** {pattern.get('sections', '')}",
            "",
            "### Style",
            f"- **Name:** {style.get('name', '')}",
        ]
    )
    if style.get("keywords"):
        lines.append(f"- **Keywords:** {style.get('keywords', '')}")
    if style.get("best_for"):
        lines.append(f"- **Best For:** {style.get('best_for', '')}")
    if style.get("performance") or style.get("accessibility"):
        lines.append(f"- **Performance:** {style.get('performance', '')} | **Accessibility:** {style.get('accessibility', '')}")
    lines.extend(
        [
            "",
            "### Colors",
            "| Role | Hex |",
            "|------|-----|",
            f"| Primary | {colors.get('primary', '')} |",
            f"| Secondary | {colors.get('secondary', '')} |",
            f"| CTA | {colors.get('cta', '')} |",
            f"| Background | {colors.get('background', '')} |",
            f"| Text | {colors.get('text', '')} |",
        ]
    )
    if colors.get("notes"):
        lines.append(f"\n*Notes: {colors.get('notes', '')}*")
    lines.extend(
        [
            "",
            "### Typography",
            f"- **Heading:** {typography.get('heading', '')}",
            f"- **Body:** {typography.get('body', '')}",
        ]
    )
    if typography.get("mood"):
        lines.append(f"- **Mood:** {typography.get('mood', '')}")
    if typography.get("best_for"):
        lines.append(f"- **Best For:** {typography.get('best_for', '')}")
    if typography.get("google_fonts_url"):
        lines.append(f"- **Google Fonts:** {typography.get('google_fonts_url', '')}")
    if typography.get("css_import"):
        lines.extend(["- **CSS Import:**", "```css", typography.get("css_import", ""), "```"])
    if effects:
        lines.extend(["", "### Key Effects", effects])
    if anti_patterns:
        anti_pattern_lines = anti_patterns.replace(" + ", "\n- ")
        lines.extend(["", "### Avoid (Anti-patterns)", f"- {anti_pattern_lines}"])
    lines.extend(
        [
            "",
            "### Pre-Delivery Checklist",
            "- [ ] No emojis as icons (use SVG: Heroicons/Lucide)",
            "- [ ] cursor-pointer on all clickable elements",
            "- [ ] Hover states with smooth transitions (150-300ms)",
            "- [ ] Light mode: text contrast 4.5:1 minimum",
            "- [ ] Focus states visible for keyboard nav",
            "- [ ] prefers-reduced-motion respected",
            "- [ ] Responsive: 375px, 768px, 1024px, 1440px",
            "",
        ]
    )
    return "\n".join(lines)
