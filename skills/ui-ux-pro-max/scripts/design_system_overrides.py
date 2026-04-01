#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from core import search


def detect_page_type(context: str, style_results: list) -> str:
    context_lower = context.lower()
    page_patterns = [
        (["dashboard", "admin", "analytics", "data", "metrics", "stats", "monitor", "overview"], "Dashboard / Data View"),
        (["checkout", "payment", "cart", "purchase", "order", "billing"], "Checkout / Payment"),
        (["settings", "profile", "account", "preferences", "config"], "Settings / Profile"),
        (["landing", "marketing", "homepage", "hero", "home", "promo"], "Landing / Marketing"),
        (["login", "signin", "signup", "register", "auth", "password"], "Authentication"),
        (["pricing", "plans", "subscription", "tiers", "packages"], "Pricing / Plans"),
        (["blog", "article", "post", "news", "content", "story"], "Blog / Article"),
        (["product", "item", "detail", "pdp", "shop", "store"], "Product Detail"),
        (["search", "results", "browse", "filter", "catalog", "list"], "Search Results"),
        (["empty", "404", "error", "not found", "zero"], "Empty State"),
    ]
    for keywords, page_type in page_patterns:
        if any(keyword in context_lower for keyword in keywords):
            return page_type
    if style_results:
        best_for = style_results[0].get("Best For", "").lower()
        if "dashboard" in best_for or "data" in best_for:
            return "Dashboard / Data View"
        if "landing" in best_for or "marketing" in best_for:
            return "Landing / Marketing"
    return "General"


def generate_page_overrides(page_name: str, page_query: str, design_system: dict) -> dict:
    page_lower = page_name.lower()
    query_lower = (page_query or "").lower()
    combined_context = f"{page_lower} {query_lower}"

    style_results = search(combined_context, "style", max_results=1).get("results", [])
    ux_results = search(combined_context, "ux", max_results=3).get("results", [])
    landing_results = search(combined_context, "landing", max_results=1).get("results", [])

    layout = {}
    spacing = {}
    typography = {}
    colors = {}
    components = []
    unique_components = []
    recommendations = []

    if style_results:
        style = style_results[0]
        keywords = style.get("Keywords", "")
        effects = style.get("Effects & Animation", "")
        if any(keyword in keywords.lower() for keyword in ["data", "dense", "dashboard", "grid"]):
            layout["Max Width"] = "1400px or full-width"
            layout["Grid"] = "12-column grid for data flexibility"
            spacing["Content Density"] = "High — optimize for information display"
        elif any(keyword in keywords.lower() for keyword in ["minimal", "simple", "clean", "single"]):
            layout["Max Width"] = "800px (narrow, focused)"
            layout["Layout"] = "Single column, centered"
            spacing["Content Density"] = "Low — focus on clarity"
        else:
            layout["Max Width"] = "1200px (standard)"
            layout["Layout"] = "Full-width sections, centered content"
        if effects:
            recommendations.append(f"Effects: {effects}")

    for ux in ux_results:
        category = ux.get("Category", "")
        if ux.get("Do"):
            recommendations.append(f"{category}: {ux.get('Do')}")
        if ux.get("Don't"):
            avoid_text = ux.get("Don't")
            components.append(f"Avoid: {avoid_text}")

    if landing_results:
        landing = landing_results[0]
        if landing.get("Section Order"):
            layout["Sections"] = landing.get("Section Order")
        if landing.get("Primary CTA Placement"):
            recommendations.append(f"CTA Placement: {landing.get('Primary CTA Placement')}")
        if landing.get("Color Strategy"):
            colors["Strategy"] = landing.get("Color Strategy")

    if not layout:
        layout = {"Max Width": "1200px", "Layout": "Responsive grid"}
    if not recommendations:
        recommendations = [
            "Refer to MASTER.md for all design rules",
            "Add specific overrides as needed for this page",
        ]

    return {
        "page_type": detect_page_type(combined_context, style_results),
        "layout": layout,
        "spacing": spacing,
        "typography": typography,
        "colors": colors,
        "components": components,
        "unique_components": unique_components,
        "recommendations": recommendations,
    }
