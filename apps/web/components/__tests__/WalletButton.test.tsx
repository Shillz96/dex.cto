import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import WalletButton from '../WalletButton'

// Mock the wallet context
const mockWalletContext = {
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
}

jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => mockWalletContext,
}))

describe('WalletButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders connect button when wallet is not connected', () => {
    render(<WalletButton />)
    
    const connectButton = screen.getByRole('button', { name: /connect wallet/i })
    expect(connectButton).toBeInTheDocument()
    expect(connectButton).toHaveClass('bg-blue-600')
  })

  it('renders disconnect button when wallet is connected', () => {
    mockWalletContext.connected = true
    mockWalletContext.publicKey = { toBase58: () => 'test-public-key' }
    
    render(<WalletButton />)
    
    const disconnectButton = screen.getByRole('button', { name: /disconnect/i })
    expect(disconnectButton).toBeInTheDocument()
    expect(disconnectButton).toHaveClass('bg-red-600')
  })

  it('shows wallet address when connected', () => {
    mockWalletContext.connected = true
    mockWalletContext.publicKey = { toBase58: () => 'test-public-key' }
    
    render(<WalletButton />)
    
    expect(screen.getByText(/test-public-key/i)).toBeInTheDocument()
  })

  it('calls connect function when connect button is clicked', async () => {
    mockWalletContext.connect.mockResolvedValue(undefined)
    
    render(<WalletButton />)
    
    const connectButton = screen.getByRole('button', { name: /connect wallet/i })
    fireEvent.click(connectButton)
    
    await waitFor(() => {
      expect(mockWalletContext.connect).toHaveBeenCalledTimes(1)
    })
  })

  it('calls disconnect function when disconnect button is clicked', async () => {
    mockWalletContext.connected = true
    mockWalletContext.publicKey = { toBase58: () => 'test-public-key' }
    mockWalletContext.disconnect.mockResolvedValue(undefined)
    
    render(<WalletButton />)
    
    const disconnectButton = screen.getByRole('button', { name: /disconnect/i })
    fireEvent.click(disconnectButton)
    
    await waitFor(() => {
      expect(mockWalletContext.disconnect).toHaveBeenCalledTimes(1)
    })
  })

  it('shows loading state when connecting', () => {
    mockWalletContext.connecting = true
    
    render(<WalletButton />)
    
    const loadingButton = screen.getByRole('button', { name: /connecting/i })
    expect(loadingButton).toBeInTheDocument()
    expect(loadingButton).toBeDisabled()
  })

  it('shows loading state when disconnecting', () => {
    mockWalletContext.connected = true
    mockWalletContext.publicKey = { toBase58: () => 'test-public-key' }
    mockWalletContext.disconnecting = true
    
    render(<WalletButton />)
    
    const loadingButton = screen.getByRole('button', { name: /disconnecting/i })
    expect(loadingButton).toBeInTheDocument()
    expect(loadingButton).toBeDisabled()
  })

  it('truncates long wallet addresses', () => {
    mockWalletContext.connected = true
    mockWalletContext.publicKey = { 
      toBase58: () => '1234567890123456789012345678901234567890123456789012345678901234567890' 
    }
    
    render(<WalletButton />)
    
    const addressElement = screen.getByText(/1234567890...1234567890/i)
    expect(addressElement).toBeInTheDocument()
  })

  it('handles connect errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockWalletContext.connect.mockRejectedValue(new Error('Connection failed'))
    
    render(<WalletButton />)
    
    const connectButton = screen.getByRole('button', { name: /connect wallet/i })
    fireEvent.click(connectButton)
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to connect wallet:', expect.any(Error))
    })
    
    consoleErrorSpy.mockRestore()
  })

  it('handles disconnect errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockWalletContext.connected = true
    mockWalletContext.publicKey = { toBase58: () => 'test-public-key' }
    mockWalletContext.disconnect.mockRejectedValue(new Error('Disconnect failed'))
    
    render(<WalletButton />)
    
    const disconnectButton = screen.getByRole('button', { name: /disconnect/i })
    fireEvent.click(disconnectButton)
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to disconnect wallet:', expect.any(Error))
    })
    
    consoleErrorSpy.mockRestore()
  })

  it('applies correct styling classes', () => {
    render(<WalletButton />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass(
      'px-4',
      'py-2',
      'rounded-lg',
      'font-medium',
      'text-white',
      'transition-colors',
      'duration-200',
      'hover:opacity-90',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2'
    )
  })

  it('applies disabled state styling when loading', () => {
    mockWalletContext.connecting = true
    
    render(<WalletButton />)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed')
  })
})
