# Module: Open Data (Transparencia)

## Description
This module provides access to public government data, specifically related to "Acuerdos Marco" (Framework Agreements) and "Peru Compras". It allows analysis of public procurement trends.

## Capabilities
- **Search**: Find tenders or products by keywords.
- **Analysis**:
  - `brand-alerts`: Monitor specific brands.
  - `rankings`: Top suppliers or products.
- **Upload**: Import official data dumps into the system (`upload`).

## Key Files
- `page.tsx`: Dashboard for open data insights.
- `[acuerdo]/page.tsx`: Details for a specific agreement type.

## Data Dependencies
- **Supabase Tables**:
  - `prioritized_products`: Items of interest.
  - `brand_alerts`: Brands to watch.
  - `competitor_products`: Analysis of competitors.

## Agent Context
- **External Data**: This module likely consumes messy public data. Parsing and standardization are key challenges.
- **Strategic Value**: Helps the company position itself better in public tenders.
