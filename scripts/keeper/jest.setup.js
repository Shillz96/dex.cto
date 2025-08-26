// Jest setup file for keeper script tests

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  console.log = jest.fn()
  console.error = jest.fn()
  console.warn = jest.fn()
})

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

// Global test utilities
global.testUtils = {
  // Create mock campaign data
  createMockCampaign: (overrides = {}) => ({
    creator: 'test-creator',
    targetAmount: 1000000000,
    currentAmount: 500000000,
    deadline: Date.now() + 86400000,
    status: 'Active',
    metadataUri: 'https://example.com/metadata.json',
    merchantHash: Buffer.alloc(32, 1),
    ...overrides,
  }),

  // Create mock merchant data
  createMockMerchantData: (overrides = {}) => ({
    mint: 'test-mint',
    merchant: 'test-merchant',
    amount: 1000000000,
    timestamp: Date.now(),
    ...overrides,
  }),

  // Wait for a specified time
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock environment variables
  mockEnv: (vars) => {
    const original = {}
    Object.keys(vars).forEach(key => {
      original[key] = process.env[key]
      process.env[key] = vars[key]
    })
    return () => {
      Object.keys(vars).forEach(key => {
        if (original[key] !== undefined) {
          process.env[key] = original[key]
        } else {
          delete process.env[key]
        }
      })
    }
  },

  // Create mock Solana connection
  createMockConnection: () => ({
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
    close: jest.fn(),
  }),

  // Create mock Anchor program
  createMockProgram: () => ({
    methods: {
      payout: jest.fn().mockReturnValue({
        accounts: jest.fn().mockReturnValue({
          rpc: jest.fn().mockResolvedValue('test-signature'),
        }),
      }),
      contribute: jest.fn().mockReturnValue({
        accounts: jest.fn().mockReturnValue({
          rpc: jest.fn().mockResolvedValue('test-signature'),
        }),
      }),
      submitMetadata: jest.fn().mockReturnValue({
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
          currentAmount: 500000000,
          deadline: Date.now() + 86400000,
          status: 'Active',
          metadataUri: 'https://example.com/metadata.json',
          merchantHash: Buffer.alloc(32, 1),
        }),
        all: jest.fn().mockResolvedValue([]),
      },
    },
  }),

  // Create mock health monitor
  createMockHealthMonitor: () => ({
    start: jest.fn(),
    stop: jest.fn(),
    getStatus: jest.fn().mockReturnValue({
      overall: 'healthy',
      solana: { status: 'healthy', responseTime: 100 },
      program: { status: 'healthy', responseTime: 50 },
      memory: { status: 'healthy', usage: 50 },
      lastCheck: Date.now(),
    }),
    on: jest.fn(),
    emit: jest.fn(),
  }),

  // Create mock circuit breaker
  createMockCircuitBreaker: () => ({
    isOpen: jest.fn().mockReturnValue(false),
    onSuccess: jest.fn(),
    onFailure: jest.fn(),
    reset: jest.fn(),
  }),

  // Create mock memory manager
  createMockMemoryManager: () => ({
    storeMerchantData: jest.fn().mockResolvedValue(undefined),
    getMerchantData: jest.fn().mockResolvedValue(null),
    removeMerchantData: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn().mockResolvedValue(undefined),
    getMemoryUsage: jest.fn().mockResolvedValue({
      sizeMB: 10,
      fragmentation: 0.1,
      entryCount: 100,
    }),
    getAllKeys: jest.fn().mockResolvedValue([]),
    getTTL: jest.fn().mockResolvedValue(3600000), // 1 hour
    saveToDisk: jest.fn().mockResolvedValue(undefined),
    loadFromDisk: jest.fn().mockResolvedValue(undefined),
  }),

  // Create mock DEX Screener client
  createMockDexScreenerClient: () => ({
    getTokenInfo: jest.fn().mockResolvedValue({
      name: 'Test Token',
      symbol: 'TEST',
      priceUsd: '1.50',
      volume24h: '1000000',
      liquidity: { usd: '500000' },
    }),
  }),

  // Performance testing utilities
  performance: {
    // Measure execution time of a function
    measure: async (fn, iterations = 1) => {
      const times = []
      for (let i = 0; i < iterations; i++) {
        const start = Date.now()
        await fn()
        const end = Date.now()
        times.push(end - start)
      }
      
      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const min = Math.min(...times)
      const max = Math.max(...times)
      
      return { avg, min, max, times }
    },

    // Benchmark multiple functions
    benchmark: async (functions, iterations = 1) => {
      const results = {}
      for (const [name, fn] of Object.entries(functions)) {
        results[name] = await global.testUtils.performance.measure(fn, iterations)
      }
      return results
    },
  },

  // Network simulation utilities
  network: {
    // Simulate network latency
    simulateLatency: (ms) => {
      return new Promise(resolve => setTimeout(resolve, ms))
    },

    // Simulate network failure
    simulateFailure: (failureRate = 0.1) => {
      if (Math.random() < failureRate) {
        throw new Error('Simulated network failure')
      }
      return Promise.resolve()
    },

    // Simulate slow network
    simulateSlowNetwork: (baseLatency = 100, variance = 50) => {
      const latency = baseLatency + (Math.random() - 0.5) * variance
      return global.testUtils.network.simulateLatency(latency)
    },
  },

  // Memory testing utilities
  memory: {
    // Get current memory usage
    getUsage: () => {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        return process.memoryUsage()
      }
      return { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 }
    },

    // Simulate memory pressure
    simulateMemoryPressure: async (targetMB = 100) => {
      const chunks = []
      const chunkSize = 1024 * 1024 // 1MB
      const targetBytes = targetMB * 1024 * 1024
      
      while (global.testUtils.memory.getUsage().heapUsed < targetBytes) {
        chunks.push(Buffer.alloc(chunkSize))
        await global.testUtils.wait(1) // Small delay
      }
      
      return chunks
    },
  },
}

// Global test configuration
global.testConfig = {
  timeout: 30000,
  retries: 3,
  parallel: false,
}

// Setup global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})
