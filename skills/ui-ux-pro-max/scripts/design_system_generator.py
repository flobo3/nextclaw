#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import json

from core import DATA_DIR, search

REASONING_FILE = "ui-reasoning.csv"

SEARCH_CONFIG = {
    "product": {"max_results": 1},
    "style": {"max_results": 3},
    "color": {"max_results": 2},
    "landing": {"max_results": 2},
    "typography": {"max_results": 2},
}


class DesignSystemGenerator:
    """Generates design system recommendations from aggregated searches."""

    def __init__(self):
        self.reasoning_data = self._load_reasoning()

    def _load_reasoning(self) -> list:
        filepath = DATA_DIR / REASONING_FILE
        if not filepath.exists():
            return []
        with open(filepath, "r", encoding="utf-8") as handle:
            return list(csv.DictReader(handle))

    def _multi_domain_search(self, query: str, style_priority: list = None) -> dict:
        results = {}
        for domain, config in SEARCH_CONFIG.items():
            if domain == "style" and style_priority:
                priority_query = " ".join(style_priority[:2])
                results[domain] = search(f"{query} {priority_query}", domain, config["max_results"])
                continue
            results[domain] = search(query, domain, config["max_results"])
        return results

    def _find_reasoning_rule(self, category: str) -> dict:
        category_lower = category.lower()
        for rule in self.reasoning_data:
            if rule.get("UI_Category", "").lower() == category_lower:
                return rule
        for rule in self.reasoning_data:
            ui_category = rule.get("UI_Category", "").lower()
            if ui_category in category_lower or category_lower in ui_category:
                return rule
        for rule in self.reasoning_data:
            ui_category = rule.get("UI_Category", "").lower()
            keywords = ui_category.replace("/", " ").replace("-", " ").split()
            if any(keyword in category_lower for keyword in keywords):
                return rule
        return {}

    def _apply_reasoning(self, category: str) -> dict:
        rule = self._find_reasoning_rule(category)
        if not rule:
            return {
                "pattern": "Hero + Features + CTA",
                "style_priority": ["Minimalism", "Flat Design"],
                "color_mood": "Professional",
                "typography_mood": "Clean",
                "key_effects": "Subtle hover transitions",
                "anti_patterns": "",
                "decision_rules": {},
                "severity": "MEDIUM",
            }

        decision_rules = {}
        try:
            decision_rules = json.loads(rule.get("Decision_Rules", "{}"))
        except json.JSONDecodeError:
            decision_rules = {}

        return {
            "pattern": rule.get("Recommended_Pattern", ""),
            "style_priority": [item.strip() for item in rule.get("Style_Priority", "").split("+")],
            "color_mood": rule.get("Color_Mood", ""),
            "typography_mood": rule.get("Typography_Mood", ""),
            "key_effects": rule.get("Key_Effects", ""),
            "anti_patterns": rule.get("Anti_Patterns", ""),
            "decision_rules": decision_rules,
            "severity": rule.get("Severity", "MEDIUM"),
        }

    def _select_best_match(self, results: list, priority_keywords: list) -> dict:
        if not results:
            return {}
        if not priority_keywords:
            return results[0]

        for priority in priority_keywords:
            priority_lower = priority.lower().strip()
            for result in results:
                style_name = result.get("Style Category", "").lower()
                if priority_lower in style_name or style_name in priority_lower:
                    return result

        scored = []
        for result in results:
            result_text = str(result).lower()
            score = 0
            for keyword in priority_keywords:
                keyword_lower = keyword.lower().strip()
                if keyword_lower in result.get("Style Category", "").lower():
                    score += 10
                elif keyword_lower in result.get("Keywords", "").lower():
                    score += 3
                elif keyword_lower in result_text:
                    score += 1
            scored.append((score, result))
        scored.sort(key=lambda item: item[0], reverse=True)
        return scored[0][1] if scored and scored[0][0] > 0 else results[0]

    @staticmethod
    def _extract_results(search_result: dict) -> list:
        return search_result.get("results", [])

    def generate(self, query: str, project_name: str = None) -> dict:
        product_result = search(query, "product", 1)
        product_results = product_result.get("results", [])
        category = product_results[0].get("Product Type", "General") if product_results else "General"

        reasoning = self._apply_reasoning(category)
        search_results = self._multi_domain_search(query, reasoning.get("style_priority", []))
        search_results["product"] = product_result

        style_results = self._extract_results(search_results.get("style", {}))
        color_results = self._extract_results(search_results.get("color", {}))
        typography_results = self._extract_results(search_results.get("typography", {}))
        landing_results = self._extract_results(search_results.get("landing", {}))

        best_style = self._select_best_match(style_results, reasoning.get("style_priority", []))
        best_color = color_results[0] if color_results else {}
        best_typography = typography_results[0] if typography_results else {}
        best_landing = landing_results[0] if landing_results else {}

        style_effects = best_style.get("Effects & Animation", "")
        combined_effects = style_effects or reasoning.get("key_effects", "")

        return {
            "project_name": project_name or query.upper(),
            "category": category,
            "pattern": {
                "name": best_landing.get("Pattern Name", reasoning.get("pattern", "Hero + Features + CTA")),
                "sections": best_landing.get("Section Order", "Hero > Features > CTA"),
                "cta_placement": best_landing.get("Primary CTA Placement", "Above fold"),
                "color_strategy": best_landing.get("Color Strategy", ""),
                "conversion": best_landing.get("Conversion Optimization", ""),
            },
            "style": {
                "name": best_style.get("Style Category", "Minimalism"),
                "type": best_style.get("Type", "General"),
                "effects": style_effects,
                "keywords": best_style.get("Keywords", ""),
                "best_for": best_style.get("Best For", ""),
                "performance": best_style.get("Performance", ""),
                "accessibility": best_style.get("Accessibility", ""),
            },
            "colors": {
                "primary": best_color.get("Primary (Hex)", "#2563EB"),
                "secondary": best_color.get("Secondary (Hex)", "#3B82F6"),
                "cta": best_color.get("CTA (Hex)", "#F97316"),
                "background": best_color.get("Background (Hex)", "#F8FAFC"),
                "text": best_color.get("Text (Hex)", "#1E293B"),
                "notes": best_color.get("Notes", ""),
            },
            "typography": {
                "heading": best_typography.get("Heading Font", "Inter"),
                "body": best_typography.get("Body Font", "Inter"),
                "mood": best_typography.get("Mood/Style Keywords", reasoning.get("typography_mood", "")),
                "best_for": best_typography.get("Best For", ""),
                "google_fonts_url": best_typography.get("Google Fonts URL", ""),
                "css_import": best_typography.get("CSS Import", ""),
            },
            "key_effects": combined_effects,
            "anti_patterns": reasoning.get("anti_patterns", ""),
            "decision_rules": reasoning.get("decision_rules", {}),
            "severity": reasoning.get("severity", "MEDIUM"),
        }


def build_design_system(query: str, project_name: str = None) -> dict:
    return DesignSystemGenerator().generate(query, project_name)
