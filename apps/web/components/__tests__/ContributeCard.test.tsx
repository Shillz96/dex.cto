import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ContributeCard } from '../ContributeCard'

// Mock the wallet context
const mockWalletContext = {
  publicKey: { toBase58: () => 'test-public-key' },
  wallet: null,
  connected: true,
  connecting: false,
  disconnecting: false,
  select: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  sendTransaction: jest.fn(),
  signTransaction: jest.fn(),
  signAllTransactions: jest.fn(),
  signMessage: jest.fn(),
}

// Mock the connection context
const mockConnectionContext = {
  connection: {
    rpcEndpoint: 'https://api.devnet.solana.com',
    commitment: 'confirmed',
  },
}

jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => mockWalletContext,
  useConnection: () => mockConnectionContext,
}))

// Mock the anchor client
const mockAnchorClient = {
  contribute: jest.fn(),
  getCampaign: jest.fn(),
}

jest.mock('../../lib/anchorClient', () => ({
  getAnchorClient: () => mockAnchorClient,
}))

describe('ContributeCard', () => {
  const defaultProps = {
    campaignAddress: 'test-campaign-address',
    payMint: 'test-pay-mint',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockAnchorClient.getCampaign.mockResolvedValue({
      targetAmount: 1000000000, // 1000 USDC
      currentAmount: 500000000,  // 500 USDC
      deadline: Date.now() + 86400000, // 24 hours from now
      status: 'Active',
    })
  })

  it('renders contribution form with campaign information', async () => {
    render(<ContributeCard {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText(/campaign information/i)).toBeInTheDocument()
      expect(screen.getByText(/target amount/i)).toBeInTheDocument()
      expect(screen.getByText(/current amount/i)).toBeInTheDocument()
      expect(screen.getByText(/deadline/i)).toBeInTheDocument()
      expect(screen.getByText(/contribution amount/i)).toBeInTheDocument()
    })
  })

  it('displays campaign amounts in USDC format', async () => {
    render(<ContributeCard {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText(/1000\.00 USDC/i)).toBeInTheDocument()
      expect(screen.getByText(/500\.00 USDC/i)).toBeInTheDocument()
    })
  })

  it('calculates and displays progress percentage', async () => {
    render(<ContributeCard {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText(/50\.0%/i)).toBeInTheDocument()
    })
  })

  it('allows user to input contribution amount', async () => {
    render(<ContributeCard {...defaultProps} />)
    
    await waitFor(() => {
      const amountInput = screen.getByLabelText(/contribution amount/i)
      expect(amountInput).toBeInTheDocument()
      
      fireEvent.change(amountInput, { target: { value: '100' } })
      expect(amountInput).toHaveValue('100')
    })
  })

  it('validates contribution amount input', async () => {
    render(<ContributeCard {...defaultProps} />)
    
    await waitFor(() => {
      const amountInput = screen.getByLabelText(/contribution amount/i)
      const contributeButton = screen.getByRole('button', { name: /contribute/i })
      
      // Test negative amount
      fireEvent.change(amountInput, { target: { value: '-50' } })
      expect(contributeButton).toBeDisabled()
      
      // Test zero amount
      fireEvent.change(amountInput, { target: { value: '0' } })
      expect(contributeButton).toBeDisabled()
      
      // Test valid amount
      fireEvent.change(amountInput, { target: { value: '100' } })
      expect(contributeButton).not.toBeDisabled()
    })
  })

  it('prevents contributing more than remaining target amount', async () => {
    render(<ContributeCard {...defaultProps} />)
    
    await waitFor(() => {
      const amountInput = screen.getByLabelText(/contribution amount/i)
      const contributeButton = screen.getByRole('button', { name: /contribute/i })
      
      // Try to contribute more than remaining (1000 - 500 = 500 USDC remaining)
      fireEvent.change(amountInput, { target: { value: '600' } })
      expect(contributeButton).toBeDisabled()
      
      // Valid contribution within remaining amount
      fireEvent.change(amountInput, { target: { value: '400' } })
      expect(contributeButton).not.toBeDisabled()
    })
  })

  it('handles contribution submission successfully', async () => {
    mockAnchorClient.contribute.mockResolvedValue('test-signature')
    
    render(<ContributeCard {...defaultProps} />)
    
    await waitFor(() => {
      const amountInput = screen.getByLabelText(/contribution amount/i)
      const contributeButton = screen.getByRole('button', { name: /contribute/i })
      
      fireEvent.change(amountInput, { target: { value: '100' } })
      fireEvent.click(contributeButton)
    })
    
    await waitFor(() => {
      expect(mockAnchorClient.contribute).toHaveBeenCalledWith(
        defaultProps.campaignAddress,
        100000000 // 100 USDC in lamports
      )
    })
  })

  it('shows loading state during contribution', async () => {
    let resolveContribute: (value: string) => void
    const contributePromise = new Promise<string>((resolve) => {
      resolveContribute = resolve
    })
    mockAnchorClient.contribute.mockReturnValue(contributePromise)
    
    render(<ContributeCard {...defaultProps} />)
    
    await waitFor(() => {
      const amountInput = screen.getByLabelText(/contribution amount/i)
      const contributeButton = screen.getByRole('button', { name: /contribute/i })
      
      fireEvent.change(amountInput, { target: { value: '100' } })
      fireEvent.click(contributeButton)
    })
    
    await waitFor(() => {
      const loadingButton = screen.getByRole('button', { name: /contributing/i })
      expect(loadingButton).toBeInTheDocument()
      expect(loadingButton).toBeDisabled()
    })
    
    // Resolve the promise
    resolveContribute!('test-signature')
  })

  it('handles contribution errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockAnchorClient.contribute.mockRejectedValue(new Error('Contribution failed'))
    
    render(<ContributeCard {...defaultProps} />)
    
    await waitFor(() => {
      const amountInput = screen.getByLabelText(/contribution amount/i)
      const contributeButton = screen.getByRole('button', { name: /contribute/i })
      
      fireEvent.change(amountInput, { target: { value: '100' } })
      fireEvent.click(contributeButton)
    })
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to contribute:', expect.any(Error))
    })
    
    consoleErrorSpy.mockRestore()
  })

  it('disables contribution for expired campaigns', async () => {
    mockAnchorClient.getCampaign.mockResolvedValue({
      targetAmount: 1000000000,
      currentAmount: 500000000,
      deadline: Date.now() - 86400000, // 24 hours ago (expired)
      status: 'Expired',
    })
    
    render(<ContributeCard {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText(/campaign expired/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /contribute/i })).toBeDisabled()
    })
  })

  it('disables contribution for completed campaigns', async () => {
    mockAnchorClient.getCampaign.mockResolvedValue({
      targetAmount: 1000000000,
      currentAmount: 1000000000, // Target reached
      deadline: Date.now() + 86400000,
      status: 'Completed',
    })
    
    render(<ContributeCard {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText(/campaign completed/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /contribute/i })).toBeDisabled()
    })
  })

  it('shows error message when campaign fetch fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockAnchorClient.getCampaign.mockRejectedValue(new Error('Failed to fetch campaign'))
    
    render(<ContributeCard {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load campaign/i)).toBeInTheDocument()
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch campaign:', expect.any(Error))
    })
    
    consoleErrorSpy.mockRestore()
  })

  it('formats deadline correctly', async () => {
    const futureDate = new Date(Date.now() + 86400000)
    mockAnchorClient.getCampaign.mockResolvedValue({
      targetAmount: 1000000000,
      currentAmount: 500000000,
      deadline: futureDate.getTime(),
      status: 'Active',
    })
    
    render(<ContributeCard {...defaultProps} />)
    
    await waitFor(() => {
      const deadlineText = screen.getByText(/deadline/i)
      expect(deadlineText).toBeInTheDocument()
      // The exact format will depend on the date formatting logic
    })
  })

  it('updates progress bar correctly', async () => {
    render(<ContributeCard {...defaultProps} />)
    
    await waitFor(() => {
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuenow', '50')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })
  })

  it('handles edge case amounts correctly', async () => {
    mockAnchorClient.getCampaign.mockResolvedValue({
      targetAmount: 1, // 0.000001 USDC
      currentAmount: 0,
      deadline: Date.now() + 86400000,
      status: 'Active',
    })
    
    render(<ContributeCard {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText(/0\.000001 USDC/i)).toBeInTheDocument()
      expect(screen.getByText(/0\.000000 USDC/i)).toBeInTheDocument()
    })
  })
})
