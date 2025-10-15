# SEC Insider Trading Platform - Copilot Instructions

## Project Overview

This is a **SaaS platform for tracking and analyzing SEC insider trading activity**. The platform monitors Form 4 filings in real-time, processes insider transactions, and provides actionable insights for both novice and experienced investors.

### Core Purpose
- Track insider buying and selling activity from SEC filings
- Help users identify significant trading patterns
- Present complex financial data in an intuitive, accessible way
- Provide real-time alerts and historical analysis

### Target Audience
- Individual investors (both beginners and experienced)
- Financial analysts
- Portfolio managers
- Anyone interested in following insider trading signals

### Key Features
- Real-time SEC Form 4 filing monitoring
- Company and insider profile pages
- Transaction filtering and search
- Market data integration (via Alpaca)
- Historical data import
- News aggregation

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with Headless UI
- **State Management**: React hooks + context
- **Data Fetching**: Server components + cached API client

### Backend (Cloudflare Workers)
- **API Gateway**: Cloudflare Workers
- **Database**: D1 (SQLite)
- **Processing**: Form 4 XML parser, Signal processor
- **Monitoring**: RSS feed monitor
- **Market Data**: Alpaca Markets API integration

### Key Services
1. **API Worker**: Main REST API for frontend
2. **Form4 Processor**: Parses and extracts data from SEC XML filings
3. **RSS Monitor**: Watches SEC RSS feed for new filings
4. **Signal Processor**: Identifies important trading patterns
5. **Historical Importer**: Bulk import past filings
6. **Auth Worker**: Better Auth implementation
7. **Alpaca Market Worker**: Real-time market data

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use async/await over promises
- Follow the project's ESLint configuration
- Use meaningful variable and function names

### Component Structure
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use composition over inheritance
- Implement proper error boundaries

### Design Philosophy
**⚠️ IMPORTANT: Always refer to `/styleguide.md` for all design decisions**

Our design language is:
- Smooth and sophisticated (Apple-inspired)
- Curved corners everywhere (rounded-xl, rounded-2xl)
- Subtle gradients and shadows
- Elegant, muted color palette
- Premium feel with micro-interactions
- Glassmorphism effects where appropriate

See `/styleguide.md` for complete design system documentation.

### Performance Considerations
- Use Next.js Image component for images
- Implement proper code splitting
- Cache API responses appropriately
- Optimize database queries
- Use React.memo for expensive renders

### Accessibility
- Use semantic HTML
- Provide ARIA labels where needed
- Ensure keyboard navigation works
- Maintain color contrast ratios
- Support screen readers

## File Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── company/[cik]/     # Company detail pages
│   │   ├── insider/           # Insider profile pages
│   │   ├── filing/            # Filing detail pages
│   │   └── components/        # Page-specific components
│   ├── components/            # Shared/reusable components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities and clients
│   │   ├── api-client.ts     # API communication
│   │   ├── cached-api-client.ts
│   │   ├── database.ts       # Type definitions
│   │   └── auth-client.ts
│   └── types/                 # TypeScript type definitions

workers/
├── api/                       # Main API worker
├── form4-processor/          # SEC filing parser
├── rss-monitor/              # RSS feed watcher
├── signal-processor/         # Trading signal detection
├── historical-importer/      # Bulk import service
├── auth/                     # Authentication service
└── alpaca-market/            # Market data integration
```

## Important Patterns

### Data Flow
1. RSS Monitor detects new SEC filing
2. Form4 Processor extracts transaction data
3. Signal Processor analyzes for importance
4. API serves data to frontend
5. Frontend displays with rich visualizations

### Transaction Importance Hierarchy
- **High**: Open market purchases (P+A) and sales (S+D) - These are actionable signals
- **Medium**: Option exercises, conversions, other acquisitions
- **Low**: Grants, awards, gifts - Compensation, not market signals

### Naming Conventions
- Components: PascalCase (e.g., `TradesDisplay.tsx`)
- Utilities: camelCase (e.g., `formatCurrency.ts`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- Types/Interfaces: PascalCase with 'I' prefix for interfaces (optional)

## Testing Approach
- Test components in isolation
- Mock API calls in tests
- Focus on user interactions
- Test error states
- Verify accessibility

## Deployment
- Frontend: Cloudflare Pages
- Workers: Cloudflare Workers
- Database: Cloudflare D1
- DNS/CDN: Cloudflare

## When Adding New Features

1. **Check the styleguide.md first** - Ensure design consistency
2. Consider mobile responsiveness from the start
3. Think about loading and error states
4. Add proper TypeScript types
5. Consider accessibility
6. Test with real data
7. Optimize for performance
8. Document complex logic

## Common Pitfalls to Avoid

- Don't use inline styles - use Tailwind classes
- Don't fetch data in useEffect - use React Server Components
- Don't ignore null/undefined checks
- Don't hardcode API URLs - use environment variables
- Don't use yellow colors - See styleguide.md for approved palette
- Don't use sharp corners - Everything should be rounded (rounded-xl minimum)
- Don't skip loading states - Users should always see feedback

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [SEC EDGAR Documentation](https://www.sec.gov/edgar)
- [Project Style Guide](./styleguide.md) - **READ THIS FOR ALL DESIGN DECISIONS**

## Getting Help

When you need assistance:
1. Check the styleguide.md for design questions
2. Review existing similar components
3. Check the API documentation in workers/api/
4. Review SEC Form 4 structure in workers/form4-processor/
5. Test with different transaction types

---

**Remember**: This is a financial data platform that needs to be both powerful and approachable. Always prioritize clarity and usability while maintaining a premium, professional appearance.
