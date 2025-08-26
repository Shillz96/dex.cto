import { test, expect } from '@playwright/test'

test.describe('Campaign Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page before each test
    await page.goto('http://localhost:3000')
  })

  test('should display main page with wallet connection', async ({ page }) => {
    // Check if the main page loads
    await expect(page).toHaveTitle(/CTO Dex/)
    
    // Check for wallet connection button
    const connectButton = page.getByRole('button', { name: /connect wallet/i })
    await expect(connectButton).toBeVisible()
    
    // Check for main logo
    const logo = page.getByAltText(/logo/i)
    await expect(logo).toBeVisible()
  })

  test('should connect wallet successfully', async ({ page }) => {
    // Mock wallet connection
    await page.addInitScript(() => {
      window.mockWallet = {
        publicKey: 'test-public-key',
        connected: true,
        connecting: false,
        disconnecting: false,
        connect: () => Promise.resolve(),
        disconnect: () => Promise.resolve(),
      }
    })

    // Click connect wallet button
    const connectButton = page.getByRole('button', { name: /connect wallet/i })
    await connectButton.click()

    // Should show wallet address
    await expect(page.getByText(/test-public-key/i)).toBeVisible()
    
    // Should show disconnect button
    const disconnectButton = page.getByRole('button', { name: /disconnect/i })
    await expect(disconnectButton).toBeVisible()
  })

  test('should navigate to campaign creation', async ({ page }) => {
    // Mock wallet connection
    await page.addInitScript(() => {
      window.mockWallet = {
        publicKey: 'test-public-key',
        connected: true,
        connecting: false,
        disconnecting: false,
        connect: () => Promise.resolve(),
        disconnect: () => Promise.resolve(),
      }
    })

    // Connect wallet first
    const connectButton = page.getByRole('button', { name: /connect wallet/i })
    await connectButton.click()

    // Navigate to campaign creation
    const createButton = page.getByRole('link', { name: /create campaign/i })
    await createButton.click()

    // Should be on campaign creation page
    await expect(page).toHaveURL(/.*\/initialize.*/)
    
    // Check for campaign creation form
    await expect(page.getByText(/create new campaign/i)).toBeVisible()
    await expect(page.getByLabel(/target amount/i)).toBeVisible()
    await expect(page.getByLabel(/deadline/i)).toBeVisible()
  })

  test('should create campaign successfully', async ({ page }) => {
    // Mock wallet connection and program calls
    await page.addInitScript(() => {
      window.mockWallet = {
        publicKey: 'test-creator-key',
        connected: true,
        connecting: false,
        disconnecting: false,
        connect: () => Promise.resolve(),
        disconnect: () => Promise.resolve(),
      }
      
      window.mockProgram = {
        initCampaign: () => Promise.resolve('test-signature'),
      }
    })

    // Navigate to campaign creation
    await page.goto('http://localhost:3000/initialize/test-token')

    // Fill campaign form
    await page.getByLabel(/target amount/i).fill('1000')
    await page.getByLabel(/deadline/i).fill('2024-12-31')

    // Submit form
    const submitButton = page.getByRole('button', { name: /create campaign/i })
    await submitButton.click()

    // Should show success message
    await expect(page.getByText(/campaign created successfully/i)).toBeVisible()
  })

  test('should view campaign details', async ({ page }) => {
    // Mock campaign data
    await page.addInitScript(() => {
      window.mockCampaign = {
        creator: 'test-creator',
        targetAmount: 1000000000,
        currentAmount: 500000000,
        deadline: Date.now() + 86400000,
        status: 'Active',
        metadataUri: 'https://example.com/metadata.json',
      }
    })

    // Navigate to campaign page
    await page.goto('http://localhost:3000/campaign/test-token')

    // Check campaign information
    await expect(page.getByText(/target amount/i)).toBeVisible()
    await expect(page.getByText(/1000\.00 USDC/i)).toBeVisible()
    await expect(page.getByText(/500\.00 USDC/i)).toBeVisible()
    await expect(page.getByText(/50\.0%/i)).toBeVisible()
  })

  test('should contribute to campaign', async ({ page }) => {
    // Mock wallet and campaign data
    await page.addInitScript(() => {
      window.mockWallet = {
        publicKey: 'test-contributor',
        connected: true,
        connecting: false,
        disconnecting: false,
        connect: () => Promise.resolve(),
        disconnect: () => Promise.resolve(),
      }
      
      window.mockCampaign = {
        creator: 'test-creator',
        targetAmount: 1000000000,
        currentAmount: 500000000,
        deadline: Date.now() + 86400000,
        status: 'Active',
      }
      
      window.mockProgram = {
        contribute: () => Promise.resolve('test-signature'),
      }
    })

    // Navigate to campaign page
    await page.goto('http://localhost:3000/campaign/test-token')

    // Connect wallet
    const connectButton = page.getByRole('button', { name: /connect wallet/i })
    await connectButton.click()

    // Fill contribution amount
    const amountInput = page.getByLabel(/contribution amount/i)
    await amountInput.fill('100')

    // Submit contribution
    const contributeButton = page.getByRole('button', { name: /contribute/i })
    await contributeButton.click()

    // Should show success message
    await expect(page.getByText(/contribution successful/i)).toBeVisible()
  })

  test('should handle campaign expiration', async ({ page }) => {
    // Mock expired campaign
    await page.addInitScript(() => {
      window.mockCampaign = {
        creator: 'test-creator',
        targetAmount: 1000000000,
        currentAmount: 500000000,
        deadline: Date.now() - 86400000, // Expired
        status: 'Expired',
      }
    })

    // Navigate to campaign page
    await page.goto('http://localhost:3000/campaign/test-token')

    // Should show expired status
    await expect(page.getByText(/campaign expired/i)).toBeVisible()
    
    // Contribution should be disabled
    const contributeButton = page.getByRole('button', { name: /contribute/i })
    await expect(contributeButton).toBeDisabled()
  })

  test('should handle campaign completion', async ({ page }) => {
    // Mock completed campaign
    await page.addInitScript(() => {
      window.mockCampaign = {
        creator: 'test-creator',
        targetAmount: 1000000000,
        currentAmount: 1000000000, // Target reached
        deadline: Date.now() + 86400000,
        status: 'Completed',
        metadataUri: 'https://example.com/metadata.json',
        merchantHash: 'test-hash',
      }
    })

    // Navigate to campaign page
    await page.goto('http://localhost:3000/campaign/test-token')

    // Should show completed status
    await expect(page.getByText(/campaign completed/i)).toBeVisible()
    
    // Should show payout information
    await expect(page.getByText(/payout available/i)).toBeVisible()
  })

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network error
    await page.addInitScript(() => {
      window.mockProgram = {
        initCampaign: () => Promise.reject(new Error('Network error')),
      }
    })

    // Navigate to campaign creation
    await page.goto('http://localhost:3000/initialize/test-token')

    // Fill and submit form
    await page.getByLabel(/target amount/i).fill('1000')
    await page.getByLabel(/deadline/i).fill('2024-12-31')
    
    const submitButton = page.getByRole('button', { name: /create campaign/i })
    await submitButton.click()

    // Should show error message
    await expect(page.getByText(/failed to create campaign/i)).toBeVisible()
    
    // Should show retry option
    const retryButton = page.getByRole('button', { name: /retry/i })
    await expect(retryButton).toBeVisible()
  })

  test('should validate form inputs', async ({ page }) => {
    // Navigate to campaign creation
    await page.goto('http://localhost:3000/initialize/test-token')

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /create campaign/i })
    await submitButton.click()

    // Should show validation errors
    await expect(page.getByText(/target amount is required/i)).toBeVisible()
    await expect(page.getByText(/deadline is required/i)).toBeVisible()

    // Try invalid amounts
    await page.getByLabel(/target amount/i).fill('-100')
    await submitButton.click()
    await expect(page.getByText(/target amount must be positive/i)).toBeVisible()

    // Try past deadline
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    await page.getByLabel(/deadline/i).fill(yesterday.toISOString().split('T')[0])
    await submitButton.click()
    await expect(page.getByText(/deadline must be in the future/i)).toBeVisible()
  })

  test('should handle wallet disconnection', async ({ page }) => {
    // Mock connected wallet
    await page.addInitScript(() => {
      window.mockWallet = {
        publicKey: 'test-public-key',
        connected: true,
        connecting: false,
        disconnecting: false,
        connect: () => Promise.resolve(),
        disconnect: () => Promise.resolve(),
      }
    })

    // Navigate to campaign page
    await page.goto('http://localhost:3000/campaign/test-token')

    // Should show wallet address
    await expect(page.getByText(/test-public-key/i)).toBeVisible()

    // Disconnect wallet
    const disconnectButton = page.getByRole('button', { name: /disconnect/i })
    await disconnectButton.click()

    // Should show connect button again
    const connectButton = page.getByRole('button', { name: /connect wallet/i })
    await expect(connectButton).toBeVisible()
  })

  test('should maintain state across page navigation', async ({ page }) => {
    // Mock wallet connection
    await page.addInitScript(() => {
      window.mockWallet = {
        publicKey: 'test-public-key',
        connected: true,
        connecting: false,
        disconnecting: false,
        connect: () => Promise.resolve(),
        disconnect: () => Promise.resolve(),
      }
    })

    // Connect wallet on main page
    await page.goto('http://localhost:3000')
    const connectButton = page.getByRole('button', { name: /connect wallet/i })
    await connectButton.click()

    // Navigate to campaign page
    await page.goto('http://localhost:3000/campaign/test-token')

    // Wallet should still be connected
    await expect(page.getByText(/test-public-key/i)).toBeVisible()
    
    // Navigate back to main page
    await page.goto('http://localhost:3000')
    
    // Wallet should still be connected
    await expect(page.getByText(/test-public-key/i)).toBeVisible()
  })

  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Navigate to campaign page
    await page.goto('http://localhost:3000/campaign/test-token')

    // Check if elements are properly sized for mobile
    const contributeCard = page.getByTestId('contribute-card')
    await expect(contributeCard).toBeVisible()
    
    // Check if buttons are properly sized
    const contributeButton = page.getByRole('button', { name: /contribute/i })
    const buttonBox = await contributeButton.boundingBox()
    expect(buttonBox.width).toBeGreaterThan(44) // Minimum touch target size
    expect(buttonBox.height).toBeGreaterThan(44)
  })
})
