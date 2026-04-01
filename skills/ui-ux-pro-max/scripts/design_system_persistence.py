#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from pathlib import Path

from design_system_docs import format_master_md, format_page_override_md


def persist_design_system(
    design_system: dict,
    page: str = None,
    output_dir: str = None,
    page_query: str = None,
) -> dict:
    base_dir = Path(output_dir) if output_dir else Path.cwd()
    project_name = design_system.get("project_name", "default")
    project_slug = project_name.lower().replace(" ", "-")
    design_system_dir = base_dir / "design-system" / project_slug
    pages_dir = design_system_dir / "pages"

    design_system_dir.mkdir(parents=True, exist_ok=True)
    pages_dir.mkdir(parents=True, exist_ok=True)

    master_file = design_system_dir / "MASTER.md"
    master_file.write_text(format_master_md(design_system), encoding="utf-8")
    created_files = [str(master_file)]

    if page:
        page_file = pages_dir / f"{page.lower().replace(' ', '-')}.md"
        page_file.write_text(format_page_override_md(design_system, page, page_query), encoding="utf-8")
        created_files.append(str(page_file))

    return {
        "status": "success",
        "design_system_dir": str(design_system_dir),
        "created_files": created_files,
    }
