import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock Next.js image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  },
}))

// Mock Solana wallet adapter
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    publicKey: null,
    wallet: null,
    connected: false,
    connecting: false,
    disconnecting: false,
    select: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    sendTransaction: jest.fn(),
    signTransaction: jest.fn(),
    signAllTransactions: jest.fn(),
    signMessage: jest.fn(),
  }),
  WalletProvider: ({ children }) => children,
}))

// Mock Solana web3
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getLatestBlockhash: jest.fn().mockResolvedValue({
      blockhash: 'test-blockhash',
      lastValidBlockHeight: 1000,
    }),
    confirmTransaction: jest.fn().mockResolvedValue({
      value: { err: null },
    }),
  })),
  PublicKey: jest.fn().mockImplementation((key) => ({
    toBase58: () => key || 'test-public-key',
    toString: () => key || 'test-public-key',
  })),
  Transaction: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    sign: jest.fn(),
    serialize: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
  })),
  SystemProgram: {
    transfer: jest.fn().mockReturnValue({
      programId: 'test-program-id',
      keys: [],
      data: new Uint8Array([1, 2, 3]),
    }),
  },
}))

// Mock Anchor client
jest.mock('@coral-xyz/anchor', () => ({
  Program: jest.fn().mockImplementation(() => ({
    methods: {
      initCampaign: jest.fn().mockReturnValue({
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
      payout: jest.fn().mockReturnValue({
        accounts: jest.fn().mockReturnValue({
          rpc: jest.fn().mockResolvedValue('test-signature'),
        }),
      }),
      refund: jest.fn().mockReturnValue({
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
          metadataUri: null,
          merchantHash: null,
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
  web3: {
    Keypair: jest.fn().mockImplementation(() => ({
      publicKey: 'test-public-key',
      secretKey: new Uint8Array([1, 2, 3]),
    })),
  },
}))

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

global.matchMedia = jest.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}))

// Mock window.fetch
global.fetch = jest.fn()

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return
    }
    originalConsoleError.call(console, ...args)
  }
  
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('Warning: componentWillReceiveProps'))
    ) {
      return
    }
    originalConsoleWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})
