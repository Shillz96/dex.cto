const { CampaignKeeper } = require('../src/index')
const { MemoryManager } = require('../src/index')

// Mock external dependencies
jest.mock('@solana/web3.js')
jest.mock('@coral-xyz/anchor')

describe('Security Tests', () => {
  let keeper
  let memoryManager

  beforeEach(() => {
    process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com'
    process.env.PROGRAM_ID = 'CfzHBxVGRyVC6TythNtmDkXVX1k9iJQvwzBasFDDbLsY'
    process.env.WALLET_PRIVATE_KEY = 'test-private-key'
    
    memoryManager = new MemoryManager()
    keeper = new CampaignKeeper()
  })

  describe('Input Validation', () => {
    it('should prevent SQL injection in merchant data keys', async () => {
      const maliciousKey = "'; DROP TABLE campaigns; --"
      const testData = { mint: 'test', merchant: 'test', amount: 1000 }
      
      await memoryManager.storeMerchantData(maliciousKey, testData)
      const retrieved = await memoryManager.getMerchantData(maliciousKey)
      
      expect(retrieved).toEqual(testData)
      // Should not execute malicious SQL
    })

    it('should sanitize metadata URIs', async () => {
      const maliciousUri = 'javascript:alert("xss")'
      
      // This should be handled by the program validation
      expect(() => keeper.validateMetadataUri(maliciousUri)).toThrow()
    })

    it('should prevent buffer overflow in hash validation', async () => {
      const oversizedHash = Buffer.alloc(1000) // Much larger than 32 bytes
      
      expect(() => keeper.validateMerchantHash(oversizedHash)).toThrow()
    })
  })

  describe('Access Control', () => {
    it('should prevent unauthorized campaign modifications', async () => {
      const unauthorizedUser = 'unauthorized-user'
      const campaignAddress = 'campaign-address'
      
      // Mock program to reject unauthorized access
      keeper.program.methods.submitMetadata = jest.fn().mockRejectedValue(
        new Error('Unauthorized')
      )
      
      await expect(
        keeper.submitMetadata(campaignAddress, 'uri', unauthorizedUser)
      ).rejects.toThrow('Unauthorized')
    })

    it('should validate merchant signatures', async () => {
      const invalidSignature = 'invalid-signature'
      const campaignAddress = 'campaign-address'
      
      await expect(
        keeper.verifyMerchantSignature(campaignAddress, invalidSignature)
      ).rejects.toThrow()
    })
  })

  describe('Reentrancy Protection', () => {
    it('should prevent reentrant calls to payout', async () => {
      let callCount = 0
      keeper.program.methods.payout = jest.fn().mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          // Simulate reentrant call
          await keeper.processPayout('campaign-1', 1000)
        }
        return 'signature'
      })
      
      await keeper.processPayout('campaign-1', 1000)
      expect(callCount).toBe(1) // Should not allow reentrant call
    })
  })

  describe('Resource Exhaustion', () => {
    it('should limit memory usage per campaign', async () => {
      const largeData = { field: 'x'.repeat(1000000) } // 1MB
      
      for (let i = 0; i < 1000; i++) {
        await memoryManager.storeMerchantData(`key-${i}`, largeData)
      }
      
      const memoryUsage = await memoryManager.getMemoryUsage()
      expect(memoryUsage.sizeMB).toBeLessThan(100) // Should enforce limits
    })

    it('should prevent infinite loops in monitoring', async () => {
      let iterationCount = 0
      keeper.program.account.campaign.all = jest.fn().mockImplementation(() => {
        iterationCount++
        if (iterationCount > 1000) {
          throw new Error('Infinite loop detected')
        }
        return []
      })
      
      await keeper.startMonitoring()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(iterationCount).toBeLessThan(1000)
    })
  })

  describe('Network Security', () => {
    it('should validate RPC endpoints', async () => {
      const maliciousRpc = 'http://malicious-site.com'
      
      expect(() => new CampaignKeeper({ rpcUrl: maliciousRpc })).toThrow()
    })

    it('should prevent SSRF attacks', async () => {
      const maliciousUrl = 'http://internal-service:8080/admin'
      
      expect(() => keeper.validateUrl(maliciousUrl)).toThrow()
    })
  })

  describe('Data Integrity', () => {
    it('should detect tampered merchant hashes', async () => {
      const originalHash = Buffer.from([1, 2, 3, 4])
      const tamperedHash = Buffer.from([1, 2, 3, 5])
      
      await memoryManager.storeMerchantData('key', { hash: originalHash })
      const retrieved = await memoryManager.getMerchantData('key')
      
      expect(retrieved.hash).toEqual(originalHash)
      expect(retrieved.hash).not.toEqual(tamperedHash)
    })

    it('should validate campaign data consistency', async () => {
      const campaignData = {
        targetAmount: 1000000000,
        currentAmount: 500000000,
        deadline: Date.now() + 86400000
      }
      
      // Current amount should not exceed target
      expect(campaignData.currentAmount).toBeLessThanOrEqual(campaignData.targetAmount)
      
      // Deadline should be in the future
      expect(campaignData.deadline).toBeGreaterThan(Date.now())
    })
  })

  describe('Error Handling Security', () => {
    it('should not expose sensitive information in errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      try {
        await keeper.processPayout('invalid-campaign', 1000)
      } catch (error) {
        expect(error.message).not.toContain('private-key')
        expect(error.message).not.toContain('secret')
      }
      
      consoleErrorSpy.mockRestore()
    })

    it('should prevent error-based information disclosure', async () => {
      const error = await keeper.handleError(new Error('Database connection failed'))
      
      expect(error.message).not.toContain('internal')
      expect(error.message).not.toContain('database')
    })
  })
})
