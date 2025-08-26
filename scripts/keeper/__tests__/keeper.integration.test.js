const { CampaignKeeper } = require('../src/index')
const { MemoryManager } = require('../src/index')
const { DexScreenerClient } = require('../src/dexScreenerClient')

// Mock external dependencies
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getLatestBlockhash: jest.fn().mockResolvedValue({
      blockhash: 'test-blockhash',
      lastValidBlockHeight: 1000,
    }),
    confirmTransaction: jest.fn().mockResolvedValue({
      value: { err: null },
    }),
    getAccountInfo: jest.fn().mockResolvedValue({
      data: Buffer.from('test-data'),
      owner: 'test-owner',
      lamports: 1000000,
    }),
  })),
  PublicKey: jest.fn().mockImplementation((key) => ({
    toBase58: () => key || 'test-public-key',
    toString: () => key || 'test-public-key',
  })),
  Keypair: jest.fn().mockImplementation(() => ({
    publicKey: 'test-public-key',
    secretKey: Buffer.from([1, 2, 3, 4]),
  })),
}))

jest.mock('@coral-xyz/anchor', () => ({
  Program: jest.fn().mockImplementation(() => ({
    methods: {
      payout: jest.fn().mockReturnValue({
        accounts: jest.fn().mockReturnValue({
          rpc: jest.fn().mockResolvedValue('test-signature'),
        }),
      }),
    },
    account: {
      campaign: {
        fetch: jest.fn().mockResolvedValue({
          creator: 'test-creator',
          targetAmount: 1000000000,
          currentAmount: 1000000000,
          deadline: Date.now() + 86400000,
          status: 'Active',
          metadataUri: 'https://example.com/metadata.json',
          merchantHash: Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]),
        }),
      },
    },
  })),
  AnchorProvider: jest.fn().mockImplementation(() => ({
    connection: {
      getLatestBlockhash: jest.fn().mockResolvedValue({
        blockhash: 'test-blockhash',
        lastValidBlockHeight: 1000,
      }),
      confirmTransaction: jest.fn().mockResolvedValue({
        value: { err: null },
      }),
    },
    wallet: {
      publicKey: 'test-public-key',
      signTransaction: jest.fn(),
      signAllTransactions: jest.fn(),
    },
  })),
}))

describe('CampaignKeeper Integration Tests', () => {
  let keeper
  let memoryManager
  let dexScreenerClient

  beforeEach(() => {
    // Reset environment variables
    process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com'
    process.env.PROGRAM_ID = 'CfzHBxVGRyVC6TythNtmDkXVX1k9iJQvwzBasFDDbLsY'
    process.env.WALLET_PRIVATE_KEY = 'test-private-key'
    process.env.MEMORY_TTL_HOURS = '24'
    process.env.MEMORY_MAX_SIZE_MB = '100'
    process.env.MEMORY_GC_INTERVAL_MINUTES = '30'
    
    // Initialize components
    memoryManager = new MemoryManager()
    dexScreenerClient = new DexScreenerClient()
    keeper = new CampaignKeeper()
    
    // Clear mocks
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Cleanup
    if (keeper.healthMonitor) {
      keeper.healthMonitor.stop()
    }
    if (memoryManager) {
      memoryManager.cleanup()
    }
  })

  describe('Initialization and Configuration', () => {
    it('should initialize with default configuration', () => {
      expect(keeper).toBeDefined()
      expect(keeper.connection).toBeDefined()
      expect(keeper.program).toBeDefined()
      expect(keeper.memoryManager).toBeDefined()
      expect(keeper.healthMonitor).toBeDefined()
    })

    it('should load configuration from environment variables', () => {
      expect(keeper.config.rpcUrl).toBe('https://api.devnet.solana.com')
      expect(keeper.config.programId).toBe('CfzHBxVGRyVC6TythNtmDkXVX1k9iJQvwzBasFDDbLsY')
    })

    it('should handle missing environment variables gracefully', () => {
      delete process.env.SOLANA_RPC_URL
      delete process.env.PROGRAM_ID
      
      expect(() => new CampaignKeeper()).toThrow()
    })
  })

  describe('Memory Management Integration', () => {
    it('should store and retrieve merchant data with TTL', async () => {
      const testData = {
        mint: 'test-mint',
        merchant: 'test-merchant',
        amount: 1000000000,
        timestamp: Date.now(),
      }

      // Store data
      await memoryManager.storeMerchantData('test-key', testData)
      
      // Retrieve data
      const retrieved = await memoryManager.getMerchantData('test-key')
      expect(retrieved).toEqual(testData)
      
      // Check TTL
      const ttl = await memoryManager.getTTL('test-key')
      expect(ttl).toBeGreaterThan(0)
    })

    it('should automatically clean up expired data', async () => {
      const testData = {
        mint: 'test-mint',
        merchant: 'test-merchant',
        amount: 1000000000,
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
      }

      // Store expired data
      await memoryManager.storeMerchantData('expired-key', testData)
      
      // Force cleanup
      await memoryManager.cleanup()
      
      // Data should be removed
      const retrieved = await memoryManager.getMerchantData('expired-key')
      expect(retrieved).toBeNull()
    })

    it('should persist data to disk and survive restarts', async () => {
      const testData = {
        mint: 'test-mint',
        merchant: 'test-merchant',
        amount: 1000000000,
        timestamp: Date.now(),
      }

      // Store data
      await memoryManager.storeMerchantData('persistent-key', testData)
      
      // Save to disk
      await memoryManager.saveToDisk()
      
      // Create new instance (simulating restart)
      const newMemoryManager = new MemoryManager()
      await newMemoryManager.loadFromDisk()
      
      // Data should still be available
      const retrieved = await newMemoryManager.getMerchantData('persistent-key')
      expect(retrieved).toEqual(testData)
      
      // Cleanup
      newMemoryManager.cleanup()
    })

    it('should handle memory limits and garbage collection', async () => {
      // Set small memory limit
      process.env.MEMORY_MAX_SIZE_MB = '1'
      
      const largeData = {
        mint: 'test-mint',
        merchant: 'test-merchant',
        amount: 1000000000,
        timestamp: Date.now(),
        // Add large data to exceed memory limit
        largeField: 'x'.repeat(1000000),
      }

      // Store multiple large entries
      for (let i = 0; i < 10; i++) {
        await memoryManager.storeMerchantData(`key-${i}`, largeData)
      }
      
      // Force garbage collection
      await memoryManager.cleanup()
      
      // Some data should be removed due to memory limits
      const remainingKeys = await memoryManager.getAllKeys()
      expect(remainingKeys.length).toBeLessThan(10)
    })
  })

  describe('DEX Screener Integration', () => {
    it('should fetch token information successfully', async () => {
      const mockResponse = {
        pairs: [{
          baseToken: { name: 'Test Token', symbol: 'TEST' },
          priceUsd: '1.50',
          volume24h: '1000000',
          liquidity: { usd: '500000' },
        }],
      }

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const tokenInfo = await dexScreenerClient.getTokenInfo('test-mint')
      
      expect(tokenInfo).toBeDefined()
      expect(tokenInfo.name).toBe('Test Token')
      expect(tokenInfo.symbol).toBe('TEST')
      expect(tokenInfo.priceUsd).toBe('1.50')
    })

    it('should handle DEX Screener API errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'))

      const tokenInfo = await dexScreenerClient.getTokenInfo('test-mint')
      
      expect(tokenInfo).toBeNull()
    })

    it('should handle malformed API responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'response' }),
      })

      const tokenInfo = await dexScreenerClient.getTokenInfo('test-mint')
      
      expect(tokenInfo).toBeNull()
    })
  })

  describe('Campaign Monitoring Integration', () => {
    it('should monitor campaigns and detect completion', async () => {
      // Mock campaign data
      const mockCampaigns = [
        {
          pubkey: 'campaign-1',
          account: {
            creator: 'test-creator',
            targetAmount: 1000000000,
            currentAmount: 1000000000, // Target reached
            deadline: Date.now() + 86400000,
            status: 'Active',
            metadataUri: 'https://example.com/metadata.json',
            merchantHash: Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]),
          },
        },
      ]

      // Mock program account fetching
      keeper.program.account.campaign.fetch = jest.fn().mockResolvedValue(
        mockCampaigns[0].account
      )

      // Mock payout method
      keeper.program.methods.payout = jest.fn().mockReturnValue({
        accounts: jest.fn().mockReturnValue({
          rpc: jest.fn().mockResolvedValue('test-signature'),
        }),
      })

      // Start monitoring
      await keeper.startMonitoring()

      // Wait for monitoring cycle
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check if payout was attempted
      expect(keeper.program.methods.payout).toHaveBeenCalled()
    })

    it('should handle network failures during monitoring', async () => {
      // Mock network failure
      keeper.connection.getLatestBlockhash = jest.fn().mockRejectedValue(
        new Error('Network Error')
      )

      // Start monitoring
      await keeper.startMonitoring()

      // Wait for monitoring cycle
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should handle error gracefully without crashing
      expect(keeper.healthMonitor.getStatus().overall).toBe('degraded')
    })

    it('should retry failed operations with exponential backoff', async () => {
      let callCount = 0
      keeper.program.methods.payout = jest.fn().mockImplementation(() => {
        callCount++
        if (callCount < 3) {
          throw new Error('Temporary failure')
        }
        return {
          accounts: jest.fn().mockReturnValue({
            rpc: jest.fn().mockResolvedValue('test-signature'),
          }),
        }
      })

      // Start monitoring
      await keeper.startMonitoring()

      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 500))

      // Should have retried multiple times
      expect(callCount).toBeGreaterThan(1)
    })
  })

  describe('Health Monitoring Integration', () => {
    it('should track system health metrics', async () => {
      const healthStatus = keeper.healthMonitor.getStatus()
      
      expect(healthStatus).toHaveProperty('overall')
      expect(healthStatus).toHaveProperty('solana')
      expect(healthStatus).toHaveProperty('program')
      expect(healthStatus).toHaveProperty('memory')
      expect(healthStatus).toHaveProperty('lastCheck')
    })

    it('should detect and report degraded performance', async () => {
      // Mock slow response
      keeper.connection.getLatestBlockhash = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              blockhash: 'test-blockhash',
              lastValidBlockHeight: 1000,
            })
          }, 1000) // 1 second delay
        })
      })

      // Wait for health check
      await new Promise(resolve => setTimeout(resolve, 200))

      const healthStatus = keeper.healthMonitor.getStatus()
      expect(healthStatus.solana.status).toBe('degraded')
    })

    it('should trigger alerts for critical failures', async () => {
      const mockAlert = jest.fn()
      keeper.healthMonitor.on('alert', mockAlert)

      // Mock critical failure
      keeper.connection.getLatestBlockhash = jest.fn().mockRejectedValue(
        new Error('Critical Network Failure')
      )

      // Wait for health check
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(mockAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'CRITICAL',
          message: expect.stringContaining('Critical Network Failure'),
        })
      )
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should implement circuit breaker pattern', async () => {
      // Mock repeated failures
      keeper.program.methods.payout = jest.fn().mockRejectedValue(
        new Error('Persistent failure')
      )

      // Start monitoring
      await keeper.startMonitoring()

      // Wait for circuit breaker to activate
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Circuit breaker should be open
      expect(keeper.circuitBreaker.isOpen()).toBe(true)
    })

    it('should recover from circuit breaker state', async () => {
      // Mock recovery
      keeper.program.methods.payout = jest.fn().mockResolvedValue('success')

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Circuit breaker should be closed
      expect(keeper.circuitBreaker.isOpen()).toBe(false)
    })

    it('should log errors with proper context', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      // Trigger an error
      keeper.program.methods.payout = jest.fn().mockRejectedValue(
        new Error('Test error')
      )

      await keeper.startMonitoring()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error during campaign monitoring'),
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent campaigns', async () => {
      const mockCampaigns = Array.from({ length: 10 }, (_, i) => ({
        pubkey: `campaign-${i}`,
        account: {
          creator: 'test-creator',
          targetAmount: 1000000000,
          currentAmount: 1000000000,
          deadline: Date.now() + 86400000,
          status: 'Active',
          metadataUri: 'https://example.com/metadata.json',
          merchantHash: Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]),
        },
      }))

      // Mock program to return multiple campaigns
      keeper.program.account.campaign.all = jest.fn().mockResolvedValue(mockCampaigns)

      const startTime = Date.now()
      await keeper.startMonitoring()
      await new Promise(resolve => setTimeout(resolve, 500))
      const endTime = Date.now()

      // Should process all campaigns within reasonable time
      expect(endTime - startTime).toBeLessThan(1000)
    })

    it('should maintain performance under memory pressure', async () => {
      // Fill memory with data
      const largeData = {
        mint: 'test-mint',
        merchant: 'test-merchant',
        amount: 1000000000,
        timestamp: Date.now(),
        largeField: 'x'.repeat(100000), // 100KB per entry
      }

      for (let i = 0; i < 100; i++) {
        await memoryManager.storeMerchantData(`key-${i}`, largeData)
      }

      // Performance should not degrade significantly
      const startTime = Date.now()
      await memoryManager.cleanup()
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })

  describe('Graceful Shutdown', () => {
    it('should stop monitoring gracefully', async () => {
      await keeper.startMonitoring()
      
      // Verify monitoring is active
      expect(keeper.isMonitoring).toBe(true)
      
      // Stop monitoring
      await keeper.stopMonitoring()
      
      // Verify monitoring is stopped
      expect(keeper.isMonitoring).toBe(false)
    })

    it('should save memory state before shutdown', async () => {
      const testData = {
        mint: 'test-mint',
        merchant: 'test-merchant',
        amount: 1000000000,
        timestamp: Date.now(),
      }

      await memoryManager.storeMerchantData('shutdown-test', testData)
      
      // Simulate shutdown
      await keeper.stopMonitoring()
      
      // Data should be persisted
      const savedData = await memoryManager.getMerchantData('shutdown-test')
      expect(savedData).toEqual(testData)
    })

    it('should close connections properly', async () => {
      const mockClose = jest.fn()
      keeper.connection.close = mockClose
      
      await keeper.stopMonitoring()
      
      expect(mockClose).toHaveBeenCalled()
    })
  })
})
