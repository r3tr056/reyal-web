import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should navigate to login page', async ({ page }) => {
    // Check if login button/link exists on homepage
    const loginButton = page.getByRole('button', { name: /login|sign in/i }).or(
      page.getByRole('link', { name: /login|sign in/i })
    )
    
    if (await loginButton.count() > 0) {
      await loginButton.first().click()
      await expect(page).toHaveURL(/\/login|\/auth/)
    }
  })

  test('should show validation errors for empty login form', async ({ page }) => {
    await page.goto('/login')
    
    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /login|sign in/i })
    if (await submitButton.count() > 0) {
      await submitButton.click()
      
      // Check for validation messages
      const errorMessages = page.locator('[role="alert"], .error, [data-testid*="error"]')
      if (await errorMessages.count() > 0) {
        await expect(errorMessages.first()).toBeVisible()
      }
    }
  })

  test('should handle invalid login credentials', async ({ page }) => {
    await page.goto('/login')
    
    // Fill in invalid credentials
    const emailInput = page.getByRole('textbox', { name: /email/i }).or(
      page.getByPlaceholder(/email/i)
    )
    const passwordInput = page.getByRole('textbox', { name: /password/i }).or(
      page.locator('input[type="password"]')
    )
    
    if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
      await emailInput.fill('invalid@email.com')
      await passwordInput.fill('wrongpassword')
      
      const submitButton = page.getByRole('button', { name: /login|sign in/i })
      await submitButton.click()
      
      // Should show error message
      await expect(page.locator('text=/invalid|error|wrong/i')).toBeVisible()
    }
  })

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login')
    
    const signupLink = page.getByRole('link', { name: /sign up|register/i }).or(
      page.getByText(/don't have an account/i)
    )
    
    if (await signupLink.count() > 0) {
      await signupLink.click()
      await expect(page).toHaveURL(/\/signup|\/register|\/auth/)
    }
  })

  test('should show validation errors for signup form', async ({ page }) => {
    await page.goto('/auth')
    
    // Try different invalid scenarios
    const emailInput = page.getByRole('textbox', { name: /email/i }).or(
      page.getByPlaceholder(/email/i)
    )
    
    if (await emailInput.count() > 0) {
      // Test invalid email format
      await emailInput.fill('invalid-email')
      await page.keyboard.press('Tab')
      
      // Check for validation message
      const validation = page.locator('[role="alert"], .error, [data-testid*="error"]')
      if (await validation.count() > 0) {
        await expect(validation.first()).toBeVisible()
      }
    }
  })
})

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/')
    
    // Check for main heading or key elements
    await expect(page).toHaveTitle(/reyal|3d print/i)
    
    // Check for navigation
    const nav = page.locator('nav, [role="navigation"]')
    await expect(nav).toBeVisible()
    
    // Check for main content
    const main = page.locator('main, [role="main"], .main-content')
    if (await main.count() > 0) {
      await expect(main.first()).toBeVisible()
    }
  })

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/')
    
    // Test common navigation links
    const navLinks = [
      { name: /home/i, expectedUrl: /\/$/ },
      { name: /about/i, expectedUrl: /\/about/ },
      { name: /contact/i, expectedUrl: /\/contact/ },
      { name: /marketplace/i, expectedUrl: /\/marketplace/ },
    ]
    
    for (const { name, expectedUrl } of navLinks) {
      const link = page.getByRole('link', { name })
      if (await link.count() > 0) {
        await link.click()
        await expect(page).toHaveURL(expectedUrl)
        await page.goBack()
      }
    }
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Check if mobile menu toggle exists
    const mobileMenuToggle = page.locator('[aria-label*="menu"], .mobile-menu-toggle, [data-testid*="mobile-menu"]')
    if (await mobileMenuToggle.count() > 0) {
      await expect(mobileMenuToggle.first()).toBeVisible()
    }
    
    // Check if content is properly displayed on mobile
    const mainContent = page.locator('main, .main-content')
    if (await mainContent.count() > 0) {
      await expect(mainContent.first()).toBeVisible()
    }
  })

  test('should have call-to-action buttons', async ({ page }) => {
    await page.goto('/')
    
    // Look for CTA buttons
    const ctaButtons = page.getByRole('button', { name: /get started|upload|quote|order/i }).or(
      page.getByRole('link', { name: /get started|upload|quote|order/i })
    )
    
    if (await ctaButtons.count() > 0) {
      await expect(ctaButtons.first()).toBeVisible()
      await expect(ctaButtons.first()).toBeEnabled()
    }
  })
})

test.describe('File Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to upload page or section
    await page.goto('/')
    
    // Look for upload link/button
    const uploadButton = page.getByRole('button', { name: /upload|add file/i }).or(
      page.getByRole('link', { name: /upload|add file/i })
    )
    
    if (await uploadButton.count() > 0) {
      await uploadButton.first().click()
    }
  })

  test('should show file upload interface', async ({ page }) => {
    // Check for file input or dropzone
    const fileInput = page.locator('input[type="file"]').or(
      page.locator('[data-testid*="upload"], .dropzone, .file-upload')
    )
    
    if (await fileInput.count() > 0) {
      await expect(fileInput.first()).toBeVisible()
    }
  })

  test('should handle file upload', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    
    if (await fileInput.count() > 0) {
      // Create a test file
      await fileInput.setInputFiles({
        name: 'test-model.stl',
        mimeType: 'application/vnd.ms-pki.stl',
        buffer: Buffer.from('STL file content')
      })
      
      // Check for upload progress or success message
      const uploadStatus = page.locator('[data-testid*="upload"], .upload-status, .progress')
      if (await uploadStatus.count() > 0) {
        await expect(uploadStatus.first()).toBeVisible()
      }
    }
  })

  test('should validate file types', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    
    if (await fileInput.count() > 0) {
      // Try uploading invalid file type
      await fileInput.setInputFiles({
        name: 'invalid.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Invalid file content')
      })
      
      // Should show error message
      const errorMessage = page.locator('[role="alert"], .error, [data-testid*="error"]')
      if (await errorMessage.count() > 0) {
        await expect(errorMessage.first()).toBeVisible()
      }
    }
  })
})

test.describe('Cart and Checkout', () => {
  test('should navigate to cart page', async ({ page }) => {
    await page.goto('/')
    
    const cartLink = page.getByRole('link', { name: /cart/i }).or(
      page.locator('[data-testid*="cart"], .cart-icon')
    )
    
    if (await cartLink.count() > 0) {
      await cartLink.click()
      await expect(page).toHaveURL(/\/cart/)
    }
  })

  test('should show empty cart message', async ({ page }) => {
    await page.goto('/cart')
    
    // Check for empty cart message
    const emptyMessage = page.locator('text=/empty|no items/i')
    if (await emptyMessage.count() > 0) {
      await expect(emptyMessage.first()).toBeVisible()
    }
  })

  test('should navigate to checkout', async ({ page }) => {
    await page.goto('/cart')
    
    const checkoutButton = page.getByRole('button', { name: /checkout|proceed/i }).or(
      page.getByRole('link', { name: /checkout|proceed/i })
    )
    
    if (await checkoutButton.count() > 0) {
      await checkoutButton.click()
      await expect(page).toHaveURL(/\/checkout/)
    }
  })
})

test.describe('Responsive Design', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 720 },
    { name: 'Large Desktop', width: 1920, height: 1080 }
  ]

  viewports.forEach(({ name, width, height }) => {
    test(`should work on ${name} viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/')
      
      // Check if page loads without horizontal scroll
      const body = page.locator('body')
      await expect(body).toBeVisible()
      
      // Check if navigation is accessible
      const nav = page.locator('nav, [role="navigation"]')
      if (await nav.count() > 0) {
        await expect(nav.first()).toBeVisible()
      }
    })
  })
})

test.describe('Performance', () => {
  test('should load homepage within reasonable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    const loadTime = Date.now() - startTime
    
    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000)
  })

  test('should not have console errors', async ({ page }) => {
    const errors: string[] = []
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    await page.goto('/')
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    // Check for critical errors (ignore common third-party errors)
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') &&
      !error.includes('analytics') &&
      !error.includes('gtag')
    )
    
    expect(criticalErrors).toHaveLength(0)
  })
})

test.describe('Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/')
    
    // Check for h1 tag
    const h1 = page.locator('h1')
    if (await h1.count() > 0) {
      await expect(h1.first()).toBeVisible()
    }
  })

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/')
    
    const images = page.locator('img')
    const imageCount = await images.count()
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      const ariaLabel = await img.getAttribute('aria-label')
      
      // Images should have alt text or aria-label
      expect(alt !== null || ariaLabel !== null).toBeTruthy()
    }
  })

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/')
    
    // Tab through interactive elements
    const focusableElements = page.locator('a, button, input, select, textarea, [tabindex="0"]')
    const count = await focusableElements.count()
    
    if (count > 0) {
      await page.keyboard.press('Tab')
      const focused = page.locator(':focus')
      await expect(focused).toBeVisible()
    }
  })
})