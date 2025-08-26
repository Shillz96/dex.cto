const { CampaignKeeper } = require('../src/index')
const { MemoryManager } = require('../src/index')

// Mock external dependencies
jest.mock('@solana/web3.js')
jest.mock('@coral-xyz/anchor')

describe('Load Tests', () => {
  let keeper
  let memoryManager

  beforeEach(() => {
    process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com'
    process.env.PROGRAM_ID = 'CfzHBxVGRyVC6TythNtmDkXVX1k9iJQvwzBasFDDbLsY'
    process.env.WALLET_PRIVATE_KEY = 'test-private-key'
    
    memoryManager = new MemoryManager()
    keeper = new CampaignKeeper()
  })

  describe('Concurrent Campaign Processing', () => {
    it('should handle 100 concurrent campaigns', async () => {
      const campaignCount = 100
      const mockCampaigns = Array.from({ length: campaignCount }, (_, i) => ({
        pubkey: `campaign-${i}`,
        account: {
          creator: 'test-creator',
          targetAmount: 1000000000,
          currentAmount: 1000000000,
          deadline: Date.now() + 86400000,
          status: 'Active',
          metadataUri: 'https://example.com/metadata.json',
          merchantHash: Buffer.alloc(32, i),
        },
      }))

      keeper.program.account.campaign.all = jest.fn().mockResolvedValue(mockCampaigns)
      keeper.program.methods.payout = jest.fn().mockResolvedValue('signature')

      const startTime = Date.now()
      await keeper.processAllCampaigns()
      const endTime = Date.now()

      const processingTime = endTime - startTime
      const avgTimePerCampaign = processingTime / campaignCount

      expect(processingTime).toBeLessThan(5000) // Should complete within 5 seconds
      expect(avgTimePerCampaign).toBeLessThan(50) // Average 50ms per campaign
    })

    it('should maintain performance under memory pressure', async () => {
      const largeData = { field: 'x'.repeat(10000) } // 10KB per entry
      
      // Fill memory with large data
      for (let i = 0; i < 1000; i++) {
        await memoryManager.storeMerchantData(`key-${i}`, largeData)
      }

      const startTime = Date.now()
      await memoryManager.cleanup()
      const cleanupTime = Date.now() - startTime

      expect(cleanupTime).toBeLessThan(2000) // Should complete within 2 seconds
    })
  })

  describe('High-Frequency Operations', () => {
    it('should handle rapid memory operations', async () => {
      const operationCount = 10000
      const startTime = Date.now()

      // Perform rapid store/retrieve operations
      for (let i = 0; i < operationCount; i++) {
        await memoryManager.storeMerchantData(`key-${i}`, { value: i })
        await memoryManager.getMerchantData(`key-${i}`)
      }

      const endTime = Date.now()
      const totalTime = endTime - startTime
      const opsPerSecond = operationCount / (totalTime / 1000)

      expect(opsPerSecond).toBeGreaterThan(1000) // Should handle 1000+ ops/sec
    })

    it('should maintain consistent response times', async () => {
      const responseTimes = []
      const testCount = 100

      for (let i = 0; i < testCount; i++) {
        const start = Date.now()
        await memoryManager.storeMerchantData(`key-${i}`, { value: i })
        const end = Date.now()
        responseTimes.push(end - start)
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / testCount
      const maxResponseTime = Math.max(...responseTimes)
      const minResponseTime = Math.min(...responseTimes)

      expect(avgResponseTime).toBeLessThan(10) // Average < 10ms
      expect(maxResponseTime - minResponseTime).toBeLessThan(50) // Consistent performance
    })
  })

  describe('Network Load Simulation', () => {
    it('should handle network latency gracefully', async () => {
      const latencyMs = 100
      let callCount = 0

      keeper.connection.getLatestBlockhash = jest.fn().mockImplementation(() => {
        callCount++
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              blockhash: 'test-blockhash',
              lastValidBlockHeight: 1000,
            })
          }, latencyMs)
        })
      })

      const startTime = Date.now()
      await keeper.checkSolanaHealth()
      const endTime = Date.now()

      const actualLatency = endTime - startTime
      expect(actualLatency).toBeGreaterThanOrEqual(latencyMs)
      expect(actualLatency).toBeLessThan(latencyMs + 50) // Within 50ms tolerance
    })

    it('should handle network failures with retry logic', async () => {
      let failureCount = 0
      const maxFailures = 3

      keeper.connection.getLatestBlockhash = jest.fn().mockImplementation(() => {
        failureCount++
        if (failureCount <= maxFailures) {
          throw new Error('Network failure')
        }
        return Promise.resolve({
          blockhash: 'test-blockhash',
          lastValidBlockHeight: 1000,
        })
      })

      const startTime = Date.now()
      await keeper.checkSolanaHealth()
      const endTime = Date.now()

      expect(failureCount).toBe(maxFailures + 1)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })

  describe('Memory Management Under Load', () => {
    it('should handle memory fragmentation', async () => {
      const fragmentCount = 1000
      const fragmentSize = 1000

      // Create fragmented memory pattern
      for (let i = 0; i < fragmentCount; i++) {
        const data = { id: i, data: 'x'.repeat(fragmentSize) }
        await memoryManager.storeMerchantData(`fragment-${i}`, data)
        
        if (i % 2 === 0) {
          await memoryManager.removeMerchantData(`fragment-${i}`)
        }
      }

      const memoryUsage = await memoryManager.getMemoryUsage()
      expect(memoryUsage.fragmentation).toBeLessThan(0.5) // Less than 50% fragmented
    })

    it('should perform garbage collection efficiently', async () => {
      const gcThreshold = 50 // MB
      process.env.MEMORY_MAX_SIZE_MB = gcThreshold.toString()

      // Fill memory beyond threshold
      const largeData = { field: 'x'.repeat(100000) } // 100KB per entry
      for (let i = 0; i < 1000; i++) {
        await memoryManager.storeMerchantData(`gc-test-${i}`, largeData)
      }

      const beforeGC = await memoryManager.getMemoryUsage()
      await memoryManager.cleanup()
      const afterGC = await memoryManager.getMemoryUsage()

      expect(afterGC.sizeMB).toBeLessThan(gcThreshold)
      expect(afterGC.sizeMB).toBeLessThan(beforeGC.sizeMB)
    })
  })

  describe('Concurrent User Simulation', () => {
    it('should handle multiple keeper instances', async () => {
      const instanceCount = 5
      const instances = []

      // Create multiple keeper instances
      for (let i = 0; i < instanceCount; i++) {
        const instance = new CampaignKeeper()
        instances.push(instance)
      }

      // Simulate concurrent monitoring
      const startTime = Date.now()
      const monitoringPromises = instances.map(instance => 
        instance.startMonitoring()
      )

      await Promise.all(monitoringPromises)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(3000) // Should complete within 3 seconds

      // Cleanup
      await Promise.all(instances.map(instance => instance.stopMonitoring()))
    })

    it('should prevent race conditions in shared resources', async () => {
      const concurrentOperations = 100
      const results = []

      // Simulate concurrent access to shared memory
      const concurrentPromises = Array.from({ length: concurrentOperations }, async (_, i) => {
        const key = `race-test-${i % 10}` // Only 10 unique keys
        const data = { value: i, timestamp: Date.now() }
        
        await memoryManager.storeMerchantData(key, data)
        const retrieved = await memoryManager.getMerchantData(key)
        results.push(retrieved)
        
        return retrieved
      })

      await Promise.all(concurrentPromises)

      // All operations should complete successfully
      expect(results.length).toBe(concurrentOperations)
      expect(results.every(r => r !== null)).toBe(true)
    })
  })

  describe('Performance Benchmarks', () => {
    it('should meet performance requirements', async () => {
      const benchmarks = {
        campaignProcessing: 0,
        memoryOperations: 0,
        networkLatency: 0,
      }

      // Benchmark campaign processing
      const campaignStart = Date.now()
      await keeper.processAllCampaigns()
      benchmarks.campaignProcessing = Date.now() - campaignStart

      // Benchmark memory operations
      const memoryStart = Date.now()
      for (let i = 0; i < 1000; i++) {
        await memoryManager.storeMerchantData(`bench-${i}`, { value: i })
      }
      benchmarks.memoryOperations = Date.now() - memoryStart

      // Benchmark network operations
      const networkStart = Date.now()
      await keeper.checkSolanaHealth()
      benchmarks.networkLatency = Date.now() - networkStart

      // Performance requirements
      expect(benchmarks.campaignProcessing).toBeLessThan(1000) // < 1 second
      expect(benchmarks.memoryOperations).toBeLessThan(500)   // < 500ms
      expect(benchmarks.networkLatency).toBeLessThan(200)     // < 200ms
    })

    it('should maintain performance under sustained load', async () => {
      const duration = 10000 // 10 seconds
      const startTime = Date.now()
      let operationCount = 0

      // Sustained load test
      while (Date.now() - startTime < duration) {
        await memoryManager.storeMerchantData(`sustained-${operationCount}`, {
          value: operationCount,
          timestamp: Date.now(),
        })
        operationCount++
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 1))
      }

      const opsPerSecond = operationCount / (duration / 1000)
      expect(opsPerSecond).toBeGreaterThan(100) // Should maintain 100+ ops/sec
    })
  })
})
