#!/usr/bin/env python3
"""
Run SEO Machine analysis modules against all /solutions/* pages.

Uses the actual SEO Machine Python modules (seo_quality_rater, readability_scorer,
keyword_analyzer) from the seomachine/ directory in this repo.

Usage:
  python3 scripts/seomachine-audit.py                          # all pages
  python3 scripts/seomachine-audit.py --page /solutions/submittable-alternative  # single page
  python3 scripts/seomachine-audit.py --quick                  # first 5 pages
"""

import sys
import os
import json
import re
import argparse
import subprocess
from urllib.request import urlopen, Request
from urllib.error import URLError

# Add seomachine modules to path
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEOMACHINE_MODULES = os.path.join(REPO_ROOT, '..', 'seomachine', 'data_sources', 'modules')
sys.path.insert(0, SEOMACHINE_MODULES)

from seo_quality_rater import SEOQualityRater
from readability_scorer import ReadabilityScorer
from keyword_analyzer import KeywordAnalyzer

BASE_URL = "https://gap-app-v2-git-feat-aeo-solutions-pages-karma-devs.vercel.app"
RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.seomachine-results')


def fetch_html(url):
    """Fetch HTML from URL."""
    req = Request(url, headers={'User-Agent': 'SEOMachine-Audit/1.0'})
    with urlopen(req, timeout=30) as resp:
        return resp.read().decode('utf-8')


def extract_text_content(html):
    """Extract readable text from HTML, converting to pseudo-markdown for SEO Machine modules."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'lxml')

    # Remove script, style, nav, footer
    for tag in soup.find_all(['script', 'style', 'nav', 'footer', 'header']):
        tag.decompose()

    # Extract meta info
    meta_title = ''
    title_tag = soup.find('title')
    if title_tag:
        meta_title = title_tag.get_text(strip=True)

    meta_desc = ''
    desc_tag = soup.find('meta', attrs={'name': 'description'})
    if desc_tag:
        meta_desc = desc_tag.get('content', '')

    # Convert headings to markdown-style for SEO Machine
    main = soup.find('main') or soup.find('body')
    if not main:
        return '', meta_title, meta_desc

    lines = []
    for el in main.descendants:
        if el.name in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
            level = int(el.name[1])
            text = el.get_text(strip=True)
            if text:
                lines.append(f"\n{'#' * level} {text}\n")
        elif el.name == 'p':
            text = el.get_text(strip=True)
            if text and len(text) > 10:
                lines.append(f"\n{text}\n")
        elif el.name == 'li':
            text = el.get_text(strip=True)
            if text:
                lines.append(f"- {text}")
        elif el.name == 'a' and el.get('href', '').startswith('/'):
            pass  # internal links counted separately

    content = '\n'.join(lines).strip()

    # Count links
    internal_links = len(main.find_all('a', href=re.compile(r'^/')))
    external_links = len(main.find_all('a', href=re.compile(r'^https?://')))

    return content, meta_title, meta_desc, internal_links, external_links


def get_all_slugs():
    """Get all solution slugs from the data files."""
    data_dir = os.path.join(REPO_ROOT, 'app', 'solutions', '_data')
    slugs = []

    for fname in os.listdir(data_dir):
        if not fname.endswith('.ts') or fname in ('index.ts', 'types.ts'):
            continue
        fpath = os.path.join(data_dir, fname)
        with open(fpath, 'r') as f:
            content = f.read()
        # Extract slugs from the data files
        for match in re.finditer(r'slug:\s*"([^"]+)"', content):
            slugs.append(match.group(1))

    return sorted(set(slugs))


def extract_primary_keyword(slug):
    """Derive the primary keyword from the slug."""
    # e.g. "submittable-alternative" -> "submittable alternative"
    return slug.replace('-', ' ')


def analyze_page(slug):
    """Run all SEO Machine analyzers on a single page."""
    url = f"{BASE_URL}/solutions/{slug}"
    print(f"  Fetching {url}...")

    html = fetch_html(url)
    content, meta_title, meta_desc, internal_links, external_links = extract_text_content(html)

    if not content or len(content.split()) < 20:
        return {'slug': slug, 'error': 'Insufficient content extracted'}

    primary_keyword = extract_primary_keyword(slug)

    # Custom guidelines for landing pages (not blog posts)
    landing_page_guidelines = {
        'min_word_count': 800,
        'optimal_word_count': 1200,
        'max_word_count': 3000,
        'primary_keyword_density_min': 0.5,
        'primary_keyword_density_max': 2.5,
        'secondary_keyword_density': 0.3,
        'min_internal_links': 3,
        'optimal_internal_links': 8,
        'min_external_links': 0,
        'optimal_external_links': 1,
        'meta_title_length_min': 30,
        'meta_title_length_max': 65,
        'meta_description_length_min': 120,
        'meta_description_length_max': 160,
        'min_h2_sections': 3,
        'optimal_h2_sections': 5,
        'h2_with_keyword_ratio': 0.15,
        'max_sentence_length': 25,
        'target_reading_level_min': 6,
        'target_reading_level_max': 12,
        'paragraph_sentence_min': 1,
        'paragraph_sentence_max': 4,
    }

    # 1. SEO Quality Rating
    seo_rater = SEOQualityRater(landing_page_guidelines)
    seo_result = seo_rater.rate(
        content=content,
        meta_title=meta_title,
        meta_description=meta_desc,
        primary_keyword=primary_keyword,
        internal_link_count=internal_links,
        external_link_count=external_links
    )

    # 2. Readability Score
    readability_scorer = ReadabilityScorer()
    readability_result = readability_scorer.analyze(content)

    # 3. Keyword Analysis
    keyword_analyzer = KeywordAnalyzer()
    try:
        keyword_result = keyword_analyzer.analyze(
            content=content,
            primary_keyword=primary_keyword,
            target_density=1.0
        )
    except (KeyError, Exception) as e:
        # Fallback: calculate density manually if analyzer crashes
        kw_count = content.lower().count(primary_keyword.lower())
        word_count = len(content.split())
        density = (kw_count / word_count * 100) if word_count > 0 else 0
        keyword_result = {
            'primary_keyword': {
                'keyword': primary_keyword,
                'density': round(density, 2),
                'density_status': 'optimal' if 0.5 <= density <= 2.0 else ('too_high' if density > 2.0 else 'too_low'),
                'critical_placements': {
                    'in_h1': primary_keyword.lower() in content[:500].lower(),
                    'in_first_100_words': primary_keyword.lower() in ' '.join(content.split()[:100]).lower(),
                },
            },
            'keyword_stuffing': {'risk_level': 'none'},
            'recommendations': [],
        }

    return {
        'slug': slug,
        'url': url,
        'word_count': len(content.split()),
        'meta_title': meta_title,
        'meta_title_len': len(meta_title),
        'meta_desc_len': len(meta_desc),
        'internal_links': internal_links,
        'external_links': external_links,
        'seo': {
            'overall_score': seo_result['overall_score'],
            'grade': seo_result['grade'],
            'publishing_ready': seo_result['publishing_ready'],
            'category_scores': seo_result['category_scores'],
            'critical_issues': seo_result['critical_issues'],
            'warnings': seo_result['warnings'],
        },
        'readability': {
            'overall_score': readability_result['overall_score'],
            'grade': readability_result['grade'],
            'reading_level': readability_result.get('reading_level', 'N/A'),
            'flesch_ease': readability_result.get('readability_metrics', {}).get('flesch_reading_ease', 'N/A'),
            'recommendations': readability_result.get('recommendations', []),
        },
        'keyword': {
            'density': keyword_result['primary_keyword']['density'],
            'density_status': keyword_result['primary_keyword']['density_status'],
            'stuffing_risk': keyword_result['keyword_stuffing']['risk_level'],
            'in_h1': keyword_result['primary_keyword']['critical_placements']['in_h1'],
            'in_first_100': keyword_result['primary_keyword']['critical_placements']['in_first_100_words'],
            'recommendations': keyword_result['recommendations'],
        }
    }


def main():
    parser = argparse.ArgumentParser(description='SEO Machine audit for solutions pages')
    parser.add_argument('--page', help='Single page path (e.g. /solutions/submittable-alternative)')
    parser.add_argument('--quick', action='store_true', help='Only audit first 5 pages')
    args = parser.parse_args()

    os.makedirs(RESULTS_DIR, exist_ok=True)

    if args.page:
        slug = args.page.rstrip('/').split('/')[-1]
        slugs = [slug]
    else:
        slugs = get_all_slugs()
        if args.quick:
            slugs = slugs[:5]

    print(f"SEO Machine Audit — {len(slugs)} pages")
    print(f"Base URL: {BASE_URL}")
    print(f"Modules: {SEOMACHINE_MODULES}\n")

    results = []
    errors = []

    for i, slug in enumerate(slugs):
        print(f"[{i+1}/{len(slugs)}] {slug}")
        try:
            result = analyze_page(slug)
            results.append(result)
            if 'error' not in result:
                print(f"    SEO: {result['seo']['overall_score']}/100 ({result['seo']['grade']})")
                print(f"    Readability: {result['readability']['overall_score']}/100 ({result['readability']['grade']})")
                print(f"    Keyword density: {result['keyword']['density']}% ({result['keyword']['density_status']})")
        except Exception as e:
            print(f"    ERROR: {e}")
            errors.append({'slug': slug, 'error': str(e)})

    # Save full results
    output_file = os.path.join(RESULTS_DIR, 'seomachine-audit.json')
    with open(output_file, 'w') as f:
        json.dump({'results': results, 'errors': errors}, f, indent=2, default=str)

    # Print summary table
    print(f"\n{'='*100}")
    print(f"{'Slug':<45} {'SEO':>6} {'Read':>6} {'KW%':>6} {'KW Status':<14} {'Words':>6}")
    print(f"{'-'*100}")

    sorted_results = sorted(
        [r for r in results if 'error' not in r],
        key=lambda r: r['seo']['overall_score']
    )

    for r in sorted_results:
        print(f"{r['slug']:<45} {r['seo']['overall_score']:>5.1f} {r['readability']['overall_score']:>5.0f} {r['keyword']['density']:>5.2f} {r['keyword']['density_status']:<14} {r['word_count']:>6}")

    # Averages
    if sorted_results:
        avg_seo = sum(r['seo']['overall_score'] for r in sorted_results) / len(sorted_results)
        avg_read = sum(r['readability']['overall_score'] for r in sorted_results) / len(sorted_results)
        avg_kw = sum(r['keyword']['density'] for r in sorted_results) / len(sorted_results)
        print(f"{'-'*100}")
        print(f"{'AVERAGE':<45} {avg_seo:>5.1f} {avg_read:>5.0f} {avg_kw:>5.2f}")

    # Common issues
    all_criticals = []
    all_warnings = []
    for r in sorted_results:
        for issue in r['seo']['critical_issues']:
            all_criticals.append(issue)
        for issue in r['seo']['warnings']:
            all_warnings.append(issue)

    if all_criticals:
        from collections import Counter
        print(f"\nTop Critical Issues:")
        for issue, count in Counter(all_criticals).most_common(10):
            print(f"  [{count}x] {issue}")

    if all_warnings:
        from collections import Counter
        print(f"\nTop Warnings:")
        for issue, count in Counter(all_warnings).most_common(10):
            print(f"  [{count}x] {issue}")

    print(f"\nFull results saved to: {output_file}")
    if errors:
        print(f"\n{len(errors)} pages had errors")


if __name__ == '__main__':
    main()
