#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from design_system_generator import build_design_system
from design_system_persistence import persist_design_system
from design_system_terminal import format_ascii_box, format_markdown


def generate_design_system(
    query: str,
    project_name: str = None,
    output_format: str = "ascii",
    persist: bool = False,
    page: str = None,
    output_dir: str = None,
) -> str:
    design_system = build_design_system(query, project_name)
    if persist:
        persist_design_system(design_system, page, output_dir, query)
    if output_format == "markdown":
        return format_markdown(design_system)
    return format_ascii_box(design_system)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Generate Design System")
    parser.add_argument("query", help="Search query (e.g., 'SaaS dashboard')")
    parser.add_argument("--project-name", "-p", type=str, default=None, help="Project name")
    parser.add_argument("--format", "-f", choices=["ascii", "markdown"], default="ascii", help="Output format")
    args = parser.parse_args()
    print(generate_design_system(args.query, args.project_name, args.format))
