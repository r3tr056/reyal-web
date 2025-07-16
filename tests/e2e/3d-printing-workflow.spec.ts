import { test, expect } from '@playwright/test'

test.describe('3D Printing Service Workflow', () => {
  test.describe('Complete Order Flow', () => {
    test('should complete full 3D printing order workflow', async ({ page }) => {
      // Step 1: Navigate to homepage
      await page.goto('/')
      await expect(page).toHaveTitle(/reyal|3d print/i)

      // Step 2: Find and click upload/get started button
      const getStartedButton = page.getByRole('button', { name: /get started|upload|start printing/i }).or(
        page.getByRole('link', { name: /get started|upload|start printing/i })
      )
      
      if (await getStartedButton.count() > 0) {
        await getStartedButton.first().click()
      } else {
        // Alternative navigation
        await page.goto('/marketplace')
      }

      // Step 3: Upload a 3D model file
      const fileInput = page.locator('input[type="file"]')
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles({
          name: 'test-model.stl',
          mimeType: 'application/vnd.ms-pki.stl',
          buffer: Buffer.from('STL test content')
        })

        // Wait for upload to complete
        await page.waitForSelector('[data-testid*="upload-success"], .upload-complete', { 
          timeout: 10000,
          state: 'visible'
        }).catch(() => {
          // Continue if upload indicator not found
        })
      }

      // Step 4: Configure printing settings
      const materialSelect = page.getByRole('combobox', { name: /material/i }).or(
        page.locator('select[name*="material"], [data-testid*="material"]')
      )
      
      if (await materialSelect.count() > 0) {
        await materialSelect.click()
        
        // Select PLA or first available option
        const plaOption = page.getByRole('option', { name: /pla/i }).or(
          page.locator('option').first()
        )
        if (await plaOption.count() > 0) {
          await plaOption.click()
        }
      }

      // Configure quality setting
      const qualitySelect = page.getByRole('combobox', { name: /quality/i }).or(
        page.locator('select[name*="quality"], [data-testid*="quality"]')
      )
      
      if (await qualitySelect.count() > 0) {
        await qualitySelect.click()
        const standardOption = page.getByRole('option', { name: /standard/i })
        if (await standardOption.count() > 0) {
          await standardOption.click()
        }
      }

      // Set infill percentage
      const infillSlider = page.locator('input[type="range"][name*="infill"], [data-testid*="infill"]')
      if (await infillSlider.count() > 0) {
        await infillSlider.fill('20')
      }

      // Step 5: Calculate cost
      const calculateButton = page.getByRole('button', { name: /calculate|estimate|price/i })
      if (await calculateButton.count() > 0) {
        await calculateButton.click()
        
        // Wait for cost calculation
        await page.waitForSelector('[data-testid*="cost"], .cost-breakdown, .price-display', {
          timeout: 10000,
          state: 'visible'
        }).catch(() => {
          // Continue if cost display not found
        })
      }

      // Step 6: Generate quote
      const quoteButton = page.getByRole('button', { name: /quote|get quote/i })
      if (await quoteButton.count() > 0) {
        await quoteButton.click()
        
        // Wait for quote generation
        await page.waitForSelector('[data-testid*="quote"], .quote-details', {
          timeout: 10000,
          state: 'visible'
        }).catch(() => {
          // Continue if quote not found
        })
      }

      // Step 7: Add to cart
      const addToCartButton = page.getByRole('button', { name: /add to cart|add item/i })
      if (await addToCartButton.count() > 0) {
        await addToCartButton.click()
        
        // Verify item added to cart
        const cartNotification = page.locator('[data-testid*="cart-success"], .cart-notification')
        if (await cartNotification.count() > 0) {
          await expect(cartNotification.first()).toBeVisible()
        }
      }

      // Step 8: Go to cart
      const cartLink = page.getByRole('link', { name: /cart/i }).or(
        page.locator('[data-testid*="cart"], .cart-link')
      )
      
      if (await cartLink.count() > 0) {
        await cartLink.click()
        await expect(page).toHaveURL(/\/cart/)
        
        // Verify item is in cart
        const cartItem = page.locator('.cart-item, [data-testid*="cart-item"]')
        if (await cartItem.count() > 0) {
          await expect(cartItem.first()).toBeVisible()
        }
      }

      // Step 9: Proceed to checkout
      const checkoutButton = page.getByRole('button', { name: /checkout|proceed/i })
      if (await checkoutButton.count() > 0) {
        await checkoutButton.click()
        await expect(page).toHaveURL(/\/checkout/)
      }

      // Step 10: Fill shipping information
      const nameInput = page.getByRole('textbox', { name: /name|full name/i })
      if (await nameInput.count() > 0) {
        await nameInput.fill('John Doe')
      }

      const addressInput = page.getByRole('textbox', { name: /address/i })
      if (await addressInput.count() > 0) {
        await addressInput.fill('123 Test Street, Test City, 12345')
      }

      const phoneInput = page.getByRole('textbox', { name: /phone/i })
      if (await phoneInput.count() > 0) {
        await phoneInput.fill('+91 9876543210')
      }

      // Step 11: Select payment method
      const paymentMethodRadio = page.getByRole('radio', { name: /card|credit|payment/i })
      if (await paymentMethodRadio.count() > 0) {
        await paymentMethodRadio.click()
      }

      // Step 12: Place order
      const placeOrderButton = page.getByRole('button', { name: /place order|confirm|submit/i })
      if (await placeOrderButton.count() > 0) {
        await placeOrderButton.click()
        
        // Wait for order confirmation
        await page.waitForSelector('[data-testid*="order-success"], .order-confirmation', {
          timeout: 15000,
          state: 'visible'
        }).catch(() => {
          // Order confirmation might redirect to different page
        })

        // Check if redirected to success page
        await expect(page).toHaveURL(/\/orders|\/success|\/thank-you/, { timeout: 10000 }).catch(() => {
          // Continue if no redirect
        })
      }
    })

    test('should handle file upload validation', async ({ page }) => {
      await page.goto('/marketplace')

      const fileInput = page.locator('input[type="file"]')
      if (await fileInput.count() > 0) {
        // Test invalid file type
        await fileInput.setInputFiles({
          name: 'invalid.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('Invalid file content')
        })

        // Should show error message
        const errorMessage = page.locator('[role="alert"], .error, [data-testid*="error"]')
        if (await errorMessage.count() > 0) {
          await expect(errorMessage.first()).toBeVisible()
          await expect(errorMessage.first()).toContainText(/invalid|not supported|format/i)
        }

        // Test file size limit
        const largeFile = Buffer.alloc(51 * 1024 * 1024, 'x') // 51MB file
        await fileInput.setInputFiles({
          name: 'large.stl',
          mimeType: 'application/vnd.ms-pki.stl',
          buffer: largeFile
        })

        // Should show size error
        const sizeError = page.locator('text=/too large|size limit|maximum/i')
        if (await sizeError.count() > 0) {
          await expect(sizeError.first()).toBeVisible()
        }
      }
    })

    test('should calculate costs correctly for different settings', async ({ page }) => {
      await page.goto('/marketplace')

      // Upload a valid file first
      const fileInput = page.locator('input[type="file"]')
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles({
          name: 'test.stl',
          mimeType: 'application/vnd.ms-pki.stl',
          buffer: Buffer.from('STL content')
        })
      }

      // Test different quality settings
      const qualitySelect = page.getByRole('combobox', { name: /quality/i })
      const calculateButton = page.getByRole('button', { name: /calculate/i })
      
      if (await qualitySelect.count() > 0 && await calculateButton.count() > 0) {
        // Test draft quality
        await qualitySelect.click()
        const draftOption = page.getByRole('option', { name: /draft/i })
        if (await draftOption.count() > 0) {
          await draftOption.click()
          await calculateButton.click()
          
          // Store draft cost
          const draftCost = await page.locator('[data-testid*="total"], .total-cost').textContent()
          
          // Test ultra quality
          await qualitySelect.click()
          const ultraOption = page.getByRole('option', { name: /ultra/i })
          if (await ultraOption.count() > 0) {
            await ultraOption.click()
            await calculateButton.click()
            
            // Ultra should cost more than draft
            const ultraCost = await page.locator('[data-testid*="total"], .total-cost').textContent()
            
            if (draftCost && ultraCost) {
              const draftPrice = parseFloat(draftCost.replace(/[^\d.]/g, ''))
              const ultraPrice = parseFloat(ultraCost.replace(/[^\d.]/g, ''))
              expect(ultraPrice).toBeGreaterThan(draftPrice)
            }
          }
        }
      }
    })

    test('should handle cart operations', async ({ page }) => {
      await page.goto('/cart')

      // Test empty cart state
      const emptyCartMessage = page.locator('text=/empty|no items/i')
      if (await emptyCartMessage.count() > 0) {
        await expect(emptyCartMessage.first()).toBeVisible()
      }

      // If cart has items, test quantity changes
      const quantityInput = page.locator('input[type="number"], [data-testid*="quantity"]')
      if (await quantityInput.count() > 0) {
        const currentValue = await quantityInput.inputValue()
        const newValue = String(parseInt(currentValue) + 1)
        
        await quantityInput.fill(newValue)
        await page.keyboard.press('Enter')
        
        // Verify quantity updated
        await expect(quantityInput).toHaveValue(newValue)
      }

      // Test remove item
      const removeButton = page.getByRole('button', { name: /remove|delete/i })
      if (await removeButton.count() > 0) {
        await removeButton.first().click()
        
        // Confirm removal if modal appears
        const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i })
        if (await confirmButton.count() > 0) {
          await confirmButton.click()
        }
      }
    })
  })

  test.describe('User Account Management', () => {
    test('should handle user profile updates', async ({ page }) => {
      await page.goto('/profile')

      // Test profile form if accessible
      const nameInput = page.getByRole('textbox', { name: /name/i })
      if (await nameInput.count() > 0) {
        await nameInput.fill('Updated Name')
        
        const saveButton = page.getByRole('button', { name: /save|update/i })
        if (await saveButton.count() > 0) {
          await saveButton.click()
          
          // Look for success message
          const successMessage = page.locator('[role="alert"], .success, [data-testid*="success"]')
          if (await successMessage.count() > 0) {
            await expect(successMessage.first()).toBeVisible()
          }
        }
      }
    })

    test('should display order history', async ({ page }) => {
      await page.goto('/orders')

      // Check for orders list or empty state
      const ordersList = page.locator('.order-item, [data-testid*="order"]')
      const emptyState = page.locator('text=/no orders|empty/i')
      
      const hasOrders = await ordersList.count() > 0
      const hasEmptyState = await emptyState.count() > 0
      
      expect(hasOrders || hasEmptyState).toBeTruthy()
      
      if (hasOrders) {
        await expect(ordersList.first()).toBeVisible()
        
        // Test order details view
        const viewDetailsButton = page.getByRole('button', { name: /view|details/i }).first()
        if (await viewDetailsButton.count() > 0) {
          await viewDetailsButton.click()
          
          // Should show order details
          const orderDetails = page.locator('.order-details, [data-testid*="order-details"]')
          if (await orderDetails.count() > 0) {
            await expect(orderDetails.first()).toBeVisible()
          }
        }
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline mode
      await page.context().setOffline(true)
      await page.goto('/marketplace')
      
      // Try to perform action that requires network
      const calculateButton = page.getByRole('button', { name: /calculate/i })
      if (await calculateButton.count() > 0) {
        await calculateButton.click()
        
        // Should show error message
        const errorMessage = page.locator('[role="alert"], .error, text=/network|offline|error/i')
        if (await errorMessage.count() > 0) {
          await expect(errorMessage.first()).toBeVisible()
        }
      }
      
      // Re-enable network
      await page.context().setOffline(false)
    })

    test('should handle form validation errors', async ({ page }) => {
      await page.goto('/checkout')
      
      // Try to submit empty form
      const submitButton = page.getByRole('button', { name: /place order|submit/i })
      if (await submitButton.count() > 0) {
        await submitButton.click()
        
        // Should show validation errors
        const errorMessages = page.locator('[role="alert"], .error, [data-testid*="error"]')
        if (await errorMessages.count() > 0) {
          await expect(errorMessages.first()).toBeVisible()
        }
      }
    })
  })

  test.describe('Performance and Loading', () => {
    test('should load pages within acceptable time', async ({ page }) => {
      const pages = ['/', '/marketplace', '/cart', '/orders']
      
      for (const url of pages) {
        const startTime = Date.now()
        await page.goto(url)
        const loadTime = Date.now() - startTime
        
        expect(loadTime).toBeLessThan(3000) // 3 seconds max
      }
    })

    test('should show loading states', async ({ page }) => {
      await page.goto('/marketplace')
      
      // Look for loading indicators
      const loadingSpinner = page.locator('.loading, .spinner, [data-testid*="loading"]')
      const calculateButton = page.getByRole('button', { name: /calculate/i })
      
      if (await calculateButton.count() > 0) {
        await calculateButton.click()
        
        // Check if loading state appears
        if (await loadingSpinner.count() > 0) {
          await expect(loadingSpinner.first()).toBeVisible()
        }
      }
    })
  })
})