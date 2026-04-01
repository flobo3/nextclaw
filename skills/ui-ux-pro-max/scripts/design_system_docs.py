#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from datetime import datetime

from design_system_overrides import generate_page_overrides


def _append_code_block(lines: list, content: list[str]) -> None:
    lines.append("```css")
    lines.extend(content)
    lines.append("```")
    lines.append("")


def format_master_md(design_system: dict) -> str:
    project = design_system.get("project_name", "PROJECT")
    pattern = design_system.get("pattern", {})
    style = design_system.get("style", {})
    colors = design_system.get("colors", {})
    typography = design_system.get("typography", {})
    effects = design_system.get("key_effects", "")
    anti_patterns = design_system.get("anti_patterns", "")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    lines = [
        "# Design System Master File",
        "",
        "> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.",
        "> If that file exists, its rules **override** this Master file.",
        "> If not, strictly follow the rules below.",
        "",
        "---",
        "",
        f"**Project:** {project}",
        f"**Generated:** {timestamp}",
        f"**Category:** {design_system.get('category', 'General')}",
        "",
        "---",
        "",
        "## Global Rules",
        "",
        "### Color Palette",
        "",
        "| Role | Hex | CSS Variable |",
        "|------|-----|--------------|",
        f"| Primary | `{colors.get('primary', '#2563EB')}` | `--color-primary` |",
        f"| Secondary | `{colors.get('secondary', '#3B82F6')}` | `--color-secondary` |",
        f"| CTA/Accent | `{colors.get('cta', '#F97316')}` | `--color-cta` |",
        f"| Background | `{colors.get('background', '#F8FAFC')}` | `--color-background` |",
        f"| Text | `{colors.get('text', '#1E293B')}` | `--color-text` |",
        "",
    ]
    if colors.get("notes"):
        lines.extend([f"**Color Notes:** {colors.get('notes', '')}", ""])
    lines.extend(
        [
            "### Typography",
            "",
            f"- **Heading Font:** {typography.get('heading', 'Inter')}",
            f"- **Body Font:** {typography.get('body', 'Inter')}",
        ]
    )
    if typography.get("mood"):
        lines.append(f"- **Mood:** {typography.get('mood', '')}")
    if typography.get("google_fonts_url"):
        label = f"{typography.get('heading', '')} + {typography.get('body', '')}"
        lines.append(f"- **Google Fonts:** [{label}]({typography.get('google_fonts_url', '')})")
    lines.append("")
    if typography.get("css_import"):
        lines.extend(["**CSS Import:**", "```css", typography.get("css_import", ""), "```", ""])

    lines.extend(
        [
            "### Spacing Variables",
            "",
            "| Token | Value | Usage |",
            "|-------|-------|-------|",
            "| `--space-xs` | `4px` / `0.25rem` | Tight gaps |",
            "| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |",
            "| `--space-md` | `16px` / `1rem` | Standard padding |",
            "| `--space-lg` | `24px` / `1.5rem` | Section padding |",
            "| `--space-xl` | `32px` / `2rem` | Large gaps |",
            "| `--space-2xl` | `48px` / `3rem` | Section margins |",
            "| `--space-3xl` | `64px` / `4rem` | Hero padding |",
            "",
            "### Shadow Depths",
            "",
            "| Level | Value | Usage |",
            "|-------|-------|-------|",
            "| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |",
            "| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |",
            "| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |",
            "| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |",
            "",
            "---",
            "",
            "## Component Specs",
            "",
            "### Buttons",
            "",
        ]
    )
    _append_code_block(
        lines,
        [
            "/* Primary Button */",
            ".btn-primary {",
            f"  background: {colors.get('cta', '#F97316')};",
            "  color: white;",
            "  padding: 12px 24px;",
            "  border-radius: 8px;",
            "  font-weight: 600;",
            "  transition: all 200ms ease;",
            "  cursor: pointer;",
            "}",
            "",
            ".btn-primary:hover {",
            "  opacity: 0.9;",
            "  transform: translateY(-1px);",
            "}",
            "",
            "/* Secondary Button */",
            ".btn-secondary {",
            "  background: transparent;",
            f"  color: {colors.get('primary', '#2563EB')};",
            f"  border: 2px solid {colors.get('primary', '#2563EB')};",
            "  padding: 12px 24px;",
            "  border-radius: 8px;",
            "  font-weight: 600;",
            "  transition: all 200ms ease;",
            "  cursor: pointer;",
            "}",
        ],
    )
    lines.extend(["### Cards", ""])
    _append_code_block(
        lines,
        [
            ".card {",
            f"  background: {colors.get('background', '#FFFFFF')};",
            "  border-radius: 12px;",
            "  padding: 24px;",
            "  box-shadow: var(--shadow-md);",
            "  transition: all 200ms ease;",
            "  cursor: pointer;",
            "}",
            "",
            ".card:hover {",
            "  box-shadow: var(--shadow-lg);",
            "  transform: translateY(-2px);",
            "}",
        ],
    )
    lines.extend(["### Inputs", ""])
    _append_code_block(
        lines,
        [
            ".input {",
            "  padding: 12px 16px;",
            "  border: 1px solid #E2E8F0;",
            "  border-radius: 8px;",
            "  font-size: 16px;",
            "  transition: border-color 200ms ease;",
            "}",
            "",
            ".input:focus {",
            f"  border-color: {colors.get('primary', '#2563EB')};",
            "  outline: none;",
            f"  box-shadow: 0 0 0 3px {colors.get('primary', '#2563EB')}20;",
            "}",
        ],
    )
    lines.extend(["### Modals", ""])
    _append_code_block(
        lines,
        [
            ".modal-overlay {",
            "  background: rgba(0, 0, 0, 0.5);",
            "  backdrop-filter: blur(4px);",
            "}",
            "",
            ".modal {",
            "  background: white;",
            "  border-radius: 16px;",
            "  padding: 32px;",
            "  box-shadow: var(--shadow-xl);",
            "  max-width: 500px;",
            "  width: 90%;",
            "}",
        ],
    )
    lines.extend(["---", "", "## Style Guidelines", "", f"**Style:** {style.get('name', 'Minimalism')}", ""])
    if style.get("keywords"):
        lines.extend([f"**Keywords:** {style.get('keywords', '')}", ""])
    if style.get("best_for"):
        lines.extend([f"**Best For:** {style.get('best_for', '')}", ""])
    if effects:
        lines.extend([f"**Key Effects:** {effects}", ""])
    lines.extend(
        [
            "### Page Pattern",
            "",
            f"**Pattern Name:** {pattern.get('name', '')}",
            "",
        ]
    )
    if pattern.get("conversion"):
        lines.append(f"- **Conversion Strategy:** {pattern.get('conversion', '')}")
    if pattern.get("cta_placement"):
        lines.append(f"- **CTA Placement:** {pattern.get('cta_placement', '')}")
    lines.extend(
        [
            f"- **Section Order:** {pattern.get('sections', '')}",
            "",
            "---",
            "",
            "## Anti-Patterns (Do NOT Use)",
            "",
        ]
    )
    for anti_pattern in [item.strip() for item in anti_patterns.split("+") if item.strip()]:
        lines.append(f"- ❌ {anti_pattern}")
    lines.extend(
        [
            "",
            "### Additional Forbidden Patterns",
            "",
            "- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)",
            "- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer",
            "- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout",
            "- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio",
            "- ❌ **Instant state changes** — Always use transitions (150-300ms)",
            "- ❌ **Invisible focus states** — Focus states must be visible for a11y",
            "",
            "---",
            "",
            "## Pre-Delivery Checklist",
            "",
            "Before delivering any UI code, verify:",
            "",
            "- [ ] No emojis used as icons (use SVG instead)",
            "- [ ] All icons from consistent icon set (Heroicons/Lucide)",
            "- [ ] `cursor-pointer` on all clickable elements",
            "- [ ] Hover states with smooth transitions (150-300ms)",
            "- [ ] Light mode: text contrast 4.5:1 minimum",
            "- [ ] Focus states visible for keyboard navigation",
            "- [ ] `prefers-reduced-motion` respected",
            "- [ ] Responsive: 375px, 768px, 1024px, 1440px",
            "- [ ] No content hidden behind fixed navbars",
            "- [ ] No horizontal scroll on mobile",
            "",
        ]
    )
    return "\n".join(lines)


def format_page_override_md(design_system: dict, page_name: str, page_query: str = None) -> str:
    project = design_system.get("project_name", "PROJECT")
    page_title = page_name.replace("-", " ").replace("_", " ").title()
    page_overrides = generate_page_overrides(page_name, page_query, design_system)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    lines = [
        f"# {page_title} Page Overrides",
        "",
        f"> **PROJECT:** {project}",
        f"> **Generated:** {timestamp}",
        f"> **Page Type:** {page_overrides.get('page_type', 'General')}",
        "",
        "> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).",
        "> Only deviations from the Master are documented here. For all other rules, refer to the Master.",
        "",
        "---",
        "",
        "## Page-Specific Rules",
        "",
    ]

    for title, key, empty_value in (
        ("Layout Overrides", "layout", "No overrides — use Master layout"),
        ("Spacing Overrides", "spacing", "No overrides — use Master spacing"),
        ("Typography Overrides", "typography", "No overrides — use Master typography"),
        ("Color Overrides", "colors", "No overrides — use Master colors"),
    ):
        lines.extend([f"### {title}", ""])
        content = page_overrides.get(key, {})
        if content:
            for item_key, value in content.items():
                lines.append(f"- **{item_key}:** {value}")
        else:
            lines.append(f"- {empty_value}")
        lines.append("")

    lines.extend(["### Component Overrides", ""])
    components = page_overrides.get("components", [])
    if components:
        for component in components:
            lines.append(f"- {component}")
    else:
        lines.append("- No overrides — use Master component specs")
    lines.extend(["", "---", "", "## Page-Specific Components", ""])

    unique_components = page_overrides.get("unique_components", [])
    if unique_components:
        for component in unique_components:
            lines.append(f"- {component}")
    else:
        lines.append("- No unique components for this page")

    lines.extend(["", "---", "", "## Recommendations", ""])
    for recommendation in page_overrides.get("recommendations", []):
        lines.append(f"- {recommendation}")
    lines.append("")
    return "\n".join(lines)
