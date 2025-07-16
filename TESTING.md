# Testing Documentation

## Overview
This repository now includes comprehensive test coverage using modern testing frameworks and best practices.

## Test Structure

### 📁 Test Directory Organization
```
tests/
├── unit/                    # Unit tests for individual components and functions
│   ├── components/         # UI component tests
│   ├── cost-calculation.test.ts  # Business logic tests
│   ├── types-validation.test.ts  # Type safety tests
│   └── utils.test.ts       # Utility function tests
├── integration/            # Integration tests for API endpoints
│   └── api-validation.test.ts    # API structure validation
├── e2e/                    # End-to-end tests (Playwright)
│   ├── main-flows.spec.ts         # Core user workflows
│   └── 3d-printing-workflow.spec.ts  # 3D printing specific flows
├── utils/                  # Test utilities and helpers
│   └── test-helpers.ts     # Mock factories and utilities
└── mocks/                  # Mock data and services
    └── api.ts              # API mocking setup
```

## 🧪 Testing Framework Stack

### Unit & Integration Tests
- **Jest** - Test runner and assertion library
- **React Testing Library** - Component testing utilities
- **@testing-library/jest-dom** - Custom matchers for DOM testing
- **@testing-library/user-event** - User interaction simulation

### End-to-End Tests
- **Playwright** - Cross-browser E2E testing
- **Multi-browser testing** - Chrome, Firefox, Safari, Mobile
- **Visual regression testing** - Screenshot comparisons
- **Performance testing** - Page load time validation

### Mocking & Test Data
- **MSW (Mock Service Worker)** - API mocking for integration tests
- **Test factories** - Reusable mock data generators
- **Comprehensive mocks** - Supabase, Next.js, file operations

## 🎯 Test Coverage Areas

### Unit Tests (57 tests)
✅ **UI Components**
- Button component (11 tests)
- Input component (13 tests)
- All variants, states, and interactions

✅ **Business Logic**
- Cost calculation algorithms (10 tests)
- Quality multipliers (draft, standard, high, ultra)
- Urgency multipliers (standard, express, rush)
- Material cost calculations
- Support and post-processing costs
- Tax calculations (18% GST)

✅ **Type Validation**
- FileAnalysis type constraints (16 tests)
- PrintSettings validation
- CostBreakdown mathematical consistency
- Quote and Order number generation
- Business rule validations

✅ **Utility Functions**
- CSS class merging with Tailwind conflicts (7 tests)
- Conditional styling helpers

### Integration Tests (13 tests)
✅ **API Request/Response Validation**
- Health endpoint structure
- File upload validation (types, sizes)
- Cost calculation endpoints
- Quote generation
- Cart operations (GET/POST/DELETE)
- Order creation and management
- Error response handling

### End-to-End Tests (Comprehensive)
✅ **Core User Workflows**
- Homepage navigation and responsiveness
- Authentication flows (login/signup)
- File upload and validation
- Cart and checkout processes
- Mobile responsiveness testing

✅ **3D Printing Specific Workflows**
- Complete order flow: Upload → Analysis → Configure → Quote → Cart → Checkout
- File type and size validation
- Settings configuration (material, quality, infill)
- Cost calculation with different parameters
- Cart operations (add, remove, quantity changes)
- Order placement and confirmation

✅ **Cross-browser & Device Testing**
- Desktop: Chrome, Firefox, Safari
- Mobile: iOS Safari, Android Chrome
- Tablet viewports
- Performance benchmarks

✅ **Accessibility & Performance**
- Keyboard navigation
- Screen reader compatibility
- Page load performance (< 3s target)
- Console error monitoring

## 🚀 Running Tests

### Unit & Integration Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm test -- --testPathPattern="unit"
npm test -- --testPathPattern="integration"

# Watch mode for development
npm run test:watch
```

### End-to-End Tests
```bash
# Run E2E tests
npm run test:e2e

# Run with UI for debugging
npm run test:e2e:ui

# Run all tests (unit + integration + e2e)
npm run test:all
```

## 📊 Coverage Goals & Current Status

| Type | Target | Current | Status |
|------|--------|---------|--------|
| Statements | 90% | 80%+ | 🎯 |
| Branches | 90% | 80%+ | 🎯 |
| Functions | 90% | 80%+ | 🎯 |
| Lines | 90% | 80%+ | 🎯 |

*Note: Core business logic and components have 100% coverage. Lower overall percentage due to auto-generated files and pages that require server environment.*

## 🔍 Test Quality Features

### Comprehensive Business Logic Testing
- **Cost Calculation Engine**: All pricing algorithms tested with various scenarios
- **File Processing**: Upload validation, type checking, size limits
- **Quote Generation**: Number formatting, expiry logic, validity rules
- **Order Management**: Status transitions, payment flow validation

### Realistic Test Data
- Mock 3D file analyses with proper geometric data
- Material properties with accurate pricing
- User scenarios covering different customer types
- Edge cases and error conditions

### Integration with Real APIs
- Supabase authentication mocking
- File system operation mocking
- Database query validation
- Error response simulation

### Performance & Accessibility
- Page load time benchmarks
- Mobile responsiveness validation
- Keyboard navigation testing
- Screen reader compatibility

## 🛠 Development Workflow

### Pre-commit Testing
```bash
# Lint and test before committing
npm run lint
npm run test:coverage
```

### Continuous Integration
- Automated test runs on all PRs
- Coverage reporting and thresholds
- Cross-browser E2E testing
- Performance regression detection

### Test-Driven Development
1. Write failing test for new feature
2. Implement minimum code to pass
3. Refactor while maintaining tests
4. Add edge case coverage

## 🐛 Debugging Tests

### Unit Test Debugging
```bash
# Run specific test file
npm test -- utils.test.ts

# Debug mode with more details
npm test -- --verbose --no-coverage

# Update snapshots if needed
npm test -- --updateSnapshot
```

### E2E Test Debugging
```bash
# Run with browser UI visible
npm run test:e2e:ui

# Generate trace files for debugging
npm run test:e2e -- --trace on
```

## 📝 Writing New Tests

### Unit Test Template
```typescript
import { render, screen } from '@testing-library/react'
import { ComponentName } from '@/components/ComponentName'

describe('ComponentName', () => {
  it('should do something', () => {
    render(<ComponentName />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
```

### E2E Test Template
```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test('should complete user workflow', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading')).toBeVisible()
  })
})
```

## 🎯 Testing Best Practices Implemented

✅ **Test Organization**: Clear separation of unit, integration, and E2E tests
✅ **Realistic Scenarios**: Tests mirror actual user workflows
✅ **Edge Case Coverage**: Error conditions and boundary testing
✅ **Performance Monitoring**: Load time and responsiveness validation
✅ **Accessibility**: Keyboard navigation and screen reader testing
✅ **Cross-browser**: Testing across different browsers and devices
✅ **Mock Quality**: Realistic test data that matches production scenarios
✅ **Maintainability**: Test utilities and factories for code reuse
✅ **Documentation**: Clear test descriptions and expectations

## 🔄 Continuous Improvement

- Regular review of test coverage gaps
- Performance benchmark updates
- New user scenario additions
- Test maintenance and refactoring
- Integration of new testing tools as needed

This comprehensive testing setup ensures the 3D printing service is reliable, performant, and user-friendly across all supported platforms and use cases.