import { test, expect } from '@playwright/test'

test.describe('Homepage E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should load homepage with dark theme', async ({ page }) => {
    // Check if dark theme is applied
    const body = page.locator('body')
    await expect(body).toHaveClass(/dark/)

    // Check if main title is visible
    await expect(page.getByText('Precision Manufacturing')).toBeVisible()
    await expect(page.getByText('Made Simple')).toBeVisible()

    // Check hero buttons
    await expect(page.getByRole('button', { name: 'Upload Design' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Browse Catalog' })).toBeVisible()
  })

  test('should open upload modal when Upload Design clicked', async ({ page }) => {
    await page.getByRole('button', { name: 'Upload Design' }).click()
    
    // Check if modal opened
    await expect(page.getByText('3D Printing Workflow')).toBeVisible()
    await expect(page.getByText('Complete workflow from upload to quote generation')).toBeVisible()
  })

  test('should navigate to marketplace', async ({ page }) => {
    await page.getByRole('link', { name: 'Browse Catalog' }).click()
    
    // Should navigate to marketplace
    await expect(page).toHaveURL('/marketplace')
    await expect(page.getByText('Discover Amazing')).toBeVisible()
    await expect(page.getByText('3D Designs')).toBeVisible()
  })

  test('should display cost calculator', async ({ page }) => {
    // Check if cost calculator is visible
    await expect(page.getByText('Cost Calculator')).toBeVisible()
    await expect(page.getByText('Get accurate pricing estimates')).toBeVisible()

    // Test material selection
    await page.getByRole('combobox').first().click()
    await expect(page.getByText('Bambu PLA Basic')).toBeVisible()
  })

  test('should show navigation menu', async ({ page }) => {
    // Check header navigation
    await expect(page.getByRole('link', { name: 'REYAL' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Marketplace' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Cart' })).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check if content adapts to mobile
    await expect(page.getByText('Precision Manufacturing')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Upload Design' })).toBeVisible()
  })
})

test.describe('Authentication Flow E2E Tests', () => {
  test('should navigate to login page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Sign In' }).click()
    
    await expect(page).toHaveURL('/login')
    await expect(page.getByText('Welcome to the')).toBeVisible()
    await expect(page.getByText('Future')).toBeVisible()
  })

  test('should show sign in and sign up forms', async ({ page }) => {
    await page.goto('/login')
    
    // Check sign in tab
    await expect(page.getByText('Sign In')).toBeVisible()
    await expect(page.getByText('Sign Up')).toBeVisible()
    
    // Check form fields
    await expect(page.getByPlaceholder('Enter your email')).toBeVisible()
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible()
  })

  test('should switch between sign in and sign up', async ({ page }) => {
    await page.goto('/login')
    
    // Click sign up tab
    await page.getByText('Sign Up').click()
    await expect(page.getByPlaceholder('First name')).toBeVisible()
    await expect(page.getByPlaceholder('Last name')).toBeVisible()
    
    // Switch back to sign in
    await page.getByText('Sign In').click()
    await expect(page.getByPlaceholder('Enter your email')).toBeVisible()
  })
})

test.describe('Marketplace E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketplace')
  })

  test('should load marketplace with dark theme', async ({ page }) => {
    // Check if dark theme is applied
    await expect(page.locator('body')).toHaveClass(/dark/)
    
    // Check main elements
    await expect(page.getByText('Discover Amazing')).toBeVisible()
    await expect(page.getByText('3D Designs')).toBeVisible()
  })

  test('should show search and filters', async ({ page }) => {
    // Check search bar
    await expect(page.getByPlaceholder('Search for 3D models')).toBeVisible()
    
    // Check filter buttons
    await expect(page.getByText('All Categories')).toBeVisible()
    await expect(page.getByText('Most Popular')).toBeVisible()
    await expect(page.getByText('Filters')).toBeVisible()
  })

  test('should display product grid', async ({ page }) => {
    // Wait for products to load
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 }).catch(() => {
      // If no test IDs, look for product cards by text
    })
    
    // Check if products are displayed
    await expect(page.getByText('designs found')).toBeVisible()
  })

  test('should filter by category', async ({ page }) => {
    await page.getByText('All Categories').click()
    await page.getByText('Accessories').click()
    
    // Check if filter is applied
    await expect(page.getByText('Accessories')).toBeVisible()
  })

  test('should open filters panel', async ({ page }) => {
    await page.getByText('Filters').click()
    
    // Check if filter panel opens
    await expect(page.getByText('Price Range')).toBeVisible()
    await expect(page.getByText('Tags & Features')).toBeVisible()
  })
})

test.describe('Cart E2E Tests', () => {
  test('should navigate to cart page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Cart' }).click()
    
    await expect(page).toHaveURL('/cart')
  })

  test('should show empty cart state', async ({ page }) => {
    await page.goto('/cart')
    
    // Check empty cart message
    await expect(page.getByText('Your Cart is')).toBeVisible()
    await expect(page.getByText('Empty')).toBeVisible()
    await expect(page.getByText('Browse Catalog')).toBeVisible()
  })
})

test.describe('Orders E2E Tests', () => {
  test('should navigate to orders page', async ({ page }) => {
    await page.goto('/orders')
    
    await expect(page.getByText('My')).toBeVisible()
    await expect(page.getByText('Orders')).toBeVisible()
  })

  test('should show search and filters for orders', async ({ page }) => {
    await page.goto('/orders')
    
    // Check search functionality
    await expect(page.getByPlaceholder('Search orders by ID')).toBeVisible()
    
    // Check filter dropdown
    await expect(page.getByText('All Orders')).toBeVisible()
  })
})

test.describe('Profile E2E Tests', () => {
  test('should navigate to profile page', async ({ page }) => {
    await page.goto('/profile')
    
    await expect(page.getByText('Profile')).toBeVisible()
  })

  test('should show profile tabs', async ({ page }) => {
    await page.goto('/profile')
    
    // Check if tabs are visible
    await expect(page.getByText('Personal Info')).toBeVisible()
    await expect(page.getByText('Address')).toBeVisible()
    await expect(page.getByText('Preferences')).toBeVisible()
  })
})

test.describe('Responsive Design E2E Tests', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 }
  ]

  viewports.forEach(({ name, width, height }) => {
    test(`should be responsive on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/')
      
      // Check if main elements are visible
      await expect(page.getByText('Precision Manufacturing')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Upload Design' })).toBeVisible()
      
      // Check navigation
      await expect(page.getByRole('link', { name: 'REYAL' })).toBeVisible()
    })
  })
})

test.describe('Performance E2E Tests', () => {
  test('should load pages within performance thresholds', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    const loadTime = Date.now() - startTime
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
    
    // Check if critical elements are visible
    await expect(page.getByText('Precision Manufacturing')).toBeVisible()
  })

  test('should navigate between pages quickly', async ({ page }) => {
    await page.goto('/')
    
    const startTime = Date.now()
    await page.getByRole('link', { name: 'Marketplace' }).click()
    await expect(page.getByText('Discover Amazing')).toBeVisible()
    const navigationTime = Date.now() - startTime
    
    // Navigation should be fast
    expect(navigationTime).toBeLessThan(2000)
  })
})

test.describe('Accessibility E2E Tests', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/')
    
    // Check for h1
    await expect(page.locator('h1')).toContainText('Precision Manufacturing')
    
    // Check for proper heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    expect(headings.length).toBeGreaterThan(0)
  })

  test('should have accessible forms', async ({ page }) => {
    await page.goto('/login')
    
    // Check for form labels
    await expect(page.getByText('Email Address')).toBeVisible()
    await expect(page.getByText('Password')).toBeVisible()
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/')
    
    // Test tab navigation
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Check if focus is visible
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })
})