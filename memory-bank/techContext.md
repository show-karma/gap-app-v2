# Technical Context

## Tech Stack

The GAP App v2 is built using the following technologies:

### Frontend Framework

- **Next.js 14**: Full-stack React framework with App Router
- **React 18**: Component-based UI library
- **TypeScript**: Static typing for JavaScript

### UI and Styling

- **TailwindCSS**: Utility-first CSS framework
- **Headless UI**: Unstyled, accessible UI components
- **Radix UI**: Low-level UI primitives
- **Tremor**: React components for dashboards and analytics
- **SASS**: For custom styling where needed

### State Management

- **Zustand**: Lightweight state management
- **React Query (TanStack Query)**: Server state management
- **React Hook Form**: Form state management

### Authentication

- **Privy**: Web3 authentication provider
- **Wagmi**: React hooks for Ethereum
- **ethers.js**: Ethereum library

### Data Fetching

- **Axios**: HTTP client
- **GraphQL**: Query language for APIs
- **GraphQL Request**: Minimal GraphQL client

### Testing

- **Jest**: JavaScript testing framework
- **React Testing Library**: Component testing
- **Cypress**: End-to-end testing

### Monitoring and Analytics

- **Sentry**: Error tracking and monitoring
- **Vercel Analytics**: Usage analytics
- **Mixpanel**: User behavior analytics

### Build Tools and Utilities

- **Yarn**: Package manager
- **ESLint**: JavaScript linter
- **Husky**: Git hooks for pre-commit checks
- **Zod**: Schema validation library
- **date-fns**: Date utility library
- **clsx/tailwind-merge**: Class name utilities

## Development Environment

- **Node.js**: JavaScript runtime
- **Yarn**: Package manager
- **VS Code/Cursor**: Recommended editor
- **Git**: Version control

## Deployment Infrastructure

- **Vercel**: Primary hosting platform
- **CI/CD**: Automated deployment pipeline
- **Environment Variables**: Configuration for different environments

## External Services

- **The Graph**: Indexed blockchain data
- **Privy API**: Authentication service
- **Blockchain Networks**: Ethereum, etc.
- **AI Integration**: OpenAI for certain features

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Android Chrome)

## Performance Targets

- Initial load: < 2s
- Time to Interactive: < 3s
- Lighthouse Performance Score: > 85
- First Input Delay: < 100ms

## Security Considerations

- HTTPS-only connections
- JWT token validation
- Input sanitization (DOMPurify)
- Content Security Policy
- Safe wallet interactions
- Data encryption for sensitive information

## Accessibility Standards

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Color contrast requirements
- Semantic HTML structure

## Development Workflow

- Feature branch workflow
- Pull request reviews
- Automated testing on PRs
- Staging environment validation
- Conventional commits
- Semantic versioning
