# Schneider Electric Distributor App - Pitch Plan

## Overview

A web application that presents ecommerce performance data, insights and instructional content for Schneider Electric's global network of ~6,000 distributor websites. The app enables SE to help their distributors improve their online presence to more effectively promote and sell SE products.

Two role-based views provide tailored experiences for Distributors (self-improvement focused) and SE Admins (network oversight and management).

---

## Roles

### Distributor
- Views their own website performance data and metrics
- Receives actionable insights and recommendations
- Accesses video tutorials and guides on improving their online presence
- Sees their ranking/percentile vs peers (anonymised)
- Tracks progress over time

### Schneider Electric Admin
- Views aggregate performance scoreboard across all 6,000 distributors
- Filters and segments by region, tier, product category
- Drills down into individual distributor performance
- Identifies top performers and those needing support
- Exports data and generates reports

---

## App Sections

### 1. Overall Distributor Score (Dashboard Home)

A composite score combining all metrics into a single benchmark per distributor.

**Distributor View:**
- Overall score (e.g. out of 100) with breakdown by category
- Trend over time (monthly/quarterly)
- Peer comparison - percentile ranking (anonymised)
- Top 3 priority actions to improve score
- Progress tracker against previous period

**Admin View:**
- Scoreboard/leaderboard of all distributors
- Distribution chart showing score spread across network
- Filter by region, country, tier, product category
- Highlight distributors needing attention (below threshold)
- Top improvers and top performers

**Key Metrics:**
- Composite score weighting across all categories
- Score trend direction (improving/declining/stable)
- Category breakdown (SEO, Speed, PDP Quality, etc.)

---

### 2. SEO Performance

Evaluating how well distributor sites rank for SE product-related search terms.

**Key Screens & Metrics:**
- Keyword rankings for core SE product terms
- Organic traffic trends (if data available)
- Technical SEO health score (meta tags, schema markup, indexability, sitemap, robots.txt)
- Backlink profile overview
- Page-level SEO audit (title tags, meta descriptions, H1 structure, alt text)
- Internal linking quality for SE product pages
- Local SEO signals (Google Business Profile, local citations)

**Insights & Recommendations:**
- Missing or duplicate meta tags
- Schema markup opportunities (Product, Review, FAQ)
- Priority keywords to target
- Quick-win SEO fixes

---

### 3. AI Overview (AIO) Readiness

Evaluating how well distributor sites are positioned for AI-generated search results (Google AI Overviews, ChatGPT, Perplexity etc.)

**Key Screens & Metrics:**
- AIO appearance tracking - is the distributor being cited in AI-generated answers?
- Content structure score - use of FAQ sections, structured data, clear Q&A format
- Authority signals - E-E-A-T indicators (expertise, experience, authority, trust)
- Content depth score - how comprehensive are product/category descriptions?
- Featured snippet capture rate

**Insights & Recommendations:**
- Content restructuring suggestions for AIO eligibility
- FAQ opportunities per product category
- Structured data implementation gaps

---

### 4. Site Speed & Performance

Core Web Vitals and general page load performance.

**Key Screens & Metrics:**
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- Interaction to Next Paint (INP)
- Time to First Byte (TTFB)
- Overall PageSpeed score (mobile and desktop)
- Page weight and resource breakdown (images, JS, CSS)
- Comparison vs industry benchmarks

**Insights & Recommendations:**
- Image optimisation opportunities
- Render-blocking resource identification
- Hosting/server performance notes
- Priority fixes ranked by impact

---

### 5. Product Detail Page (PDP) Quality

Evaluating how well SE products are presented on distributor sites.

**Key Screens & Metrics:**
- PDP completeness score (per product and aggregate)
- Product description quality and length
- Image quality and quantity (are SE-provided assets being used?)
- Technical specifications/datasheets present
- Pricing visibility
- Stock/availability information displayed
- Cross-sell and upsell presence (related SE products)
- Customer reviews/ratings integration

**Insights & Recommendations:**
- Missing product information flags
- Image quality/resolution issues
- Opportunities to add richer product content
- Comparison against best-in-class distributor examples

---

### 6. Brand Presentation & Compliance

How well distributors represent the Schneider Electric brand on their sites.

**Key Screens & Metrics:**
- Brand compliance score
- Logo usage - correct SE logos, placement, sizing
- Brand colour and typography adherence
- SE brand messaging presence (taglines, value propositions)
- Co-branding guidelines adherence
- SE product categorisation/navigation quality
- Dedicated SE manufacturer/brand page quality

**Insights & Recommendations:**
- Brand guideline violations flagged
- Missing brand assets
- Best practice examples from top-scoring distributors
- Brand asset download links/resources

---

### 7. Product Catalogue Coverage

What proportion of the SE product range is represented on each distributor site.

**Key Screens & Metrics:**
- % of SE catalogue listed
- Missing SKUs/product families
- Outdated or discontinued products still listed
- New product adoption speed (time from SE launch to distributor listing)
- Product category coverage breakdown

**Insights & Recommendations:**
- Priority products to add (based on demand/margin)
- Discontinued products to remove
- New product alerts and listing guides

---

### 8. Mobile Experience

Quality of the distributor site experience on mobile devices.

**Key Screens & Metrics:**
- Mobile PageSpeed score
- Mobile usability score (tap targets, font sizes, viewport config)
- Responsive design quality rating
- Mobile vs desktop traffic split
- Mobile conversion path assessment

**Insights & Recommendations:**
- Mobile-specific UX issues
- Touch target sizing problems
- Content/layout issues on smaller screens

---

### 9. Conversion Readiness

How effectively the distributor site converts visitors into enquiries or sales.

**Key Screens & Metrics:**
- Call-to-action visibility and quality
- Enquiry/contact form presence and ease of use
- Basket/checkout flow assessment (where applicable)
- Contact information prominence (phone, email, chat)
- Trust signals (certifications, accreditations, reviews)
- Quote request functionality

**Insights & Recommendations:**
- CTA improvement suggestions
- Form optimisation tips
- Trust signal opportunities

---

### 10. Learning Hub

Video tutorials and educational content to help distributors improve.

**Key Screens:**
- Video library categorised by topic (SEO, Speed, PDP, Brand, etc.)
- Recommended videos based on distributor's weakest areas
- Progress tracking (videos watched/completed)
- Step-by-step guides and checklists
- Best practice case studies from top-performing distributors

---

## Data Considerations

- **Data Sources:** TBC - SE data feeds, site crawling/auditing, Google APIs (PageSpeed, Search Console), third-party SEO tools
- **Refresh Frequency:** TBC - real-time, daily, weekly, monthly depending on metric type
- **Historical Data:** Minimum 12 months for trend analysis
- **Distributor Site Identification:** How are the 6,000 sites catalogued and maintained?
- **Privacy/Consent:** Any data sharing agreements needed with distributors

---

## Technical Considerations

- **Platform:** Web application (responsive, mobile-friendly)
- **Authentication:** Role-based access (Distributor vs Admin)
- **Scalability:** Must handle 6,000+ sites with potential for growth
- **Localisation:** Global distributor network may require multi-language support
- **API Architecture:** Data ingestion from multiple sources
- **Reporting:** Export capabilities for Admin users (CSV, PDF)

---

## Next Steps

- [ ] Confirm section priorities with SE
- [ ] Define data sources and availability
- [ ] Wireframe key screens per section
- [ ] Build interactive prototype for pitch
- [ ] Prepare demo data set
