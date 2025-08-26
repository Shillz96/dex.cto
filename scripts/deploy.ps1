# Solana CTO DEX Escrow Deployment Script (PowerShell)
# This script automates the deployment process for devnet and mainnet

param(
    [Parameter(Position=0)]
    [ValidateSet("build", "devnet", "mainnet", "test", "status", "help")]
    [string]$Command = "help"
)

# Configuration
$ProgramId = "CfzHBxVGRyVC6TythNtmDkXVX1k9iJQvwzBasFDDbLsY"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Function to check prerequisites
function Test-Prerequisites {
    Write-Status "Checking prerequisites..."
    
    # Check if Solana CLI is installed
    try {
        $null = Get-Command solana -ErrorAction Stop
    }
    catch {
        Write-Error "Solana CLI not found. Please install it first."
        exit 1
    }
    
    # Check if Anchor CLI is installed
    try {
        $null = Get-Command anchor -ErrorAction Stop
    }
    catch {
        Write-Error "Anchor CLI not found. Please install it first."
        exit 1
    }
    
    # Check if we're in the project directory
    if (-not (Test-Path "$ProjectRoot\Anchor.toml")) {
        Write-Error "Not in project root directory. Please run from cto.dex folder."
        exit 1
    }
    
    Write-Success "Prerequisites check passed"
}

# Function to build the program
function Build-Program {
    Write-Status "Building program..."
    
    Set-Location $ProjectRoot
    
    # Clean previous builds
    Write-Status "Cleaning previous builds..."
    anchor clean
    
    # Build program
    Write-Status "Building with Anchor..."
    anchor build
    
    # Verify build artifacts
    if (-not (Test-Path "target\deploy\cto_dex_escrow.so")) {
        Write-Error "Build failed - program binary not found"
        exit 1
    }
    
    Write-Success "Program built successfully"
}

# Function to deploy to devnet
function Deploy-Devnet {
    Write-Status "Deploying to devnet..."
    
    Set-Location $ProjectRoot
    
    # Set Solana config to devnet
    solana config set --url devnet
    
    # Deploy program
    Write-Status "Deploying program to devnet..."
    anchor deploy --provider.cluster devnet
    
    # Verify deployment
    Write-Status "Verifying deployment..."
    try {
        $null = solana program show $ProgramId --url devnet 2>$null
        Write-Success "Program deployed to devnet successfully"
    }
    catch {
        Write-Error "Program deployment verification failed"
        exit 1
    }
}

# Function to deploy to mainnet
function Deploy-Mainnet {
    Write-Status "Deploying to mainnet..."
    
    Set-Location $ProjectRoot
    
    # Set Solana config to mainnet
    solana config set --url mainnet-beta
    
    # Deploy program
    Write-Status "Deploying program to mainnet..."
    anchor deploy --provider.cluster mainnet-beta
    
    # Verify deployment
    Write-Status "Verifying deployment..."
    try {
        $null = solana program show $ProgramId --url mainnet-beta 2>$null
        Write-Success "Program deployed to mainnet successfully"
    }
    catch {
        Write-Error "Program deployment verification failed"
        exit 1
    }
}

# Function to test program functions
function Test-Program {
    Write-Status "Testing program functions..."
    
    Set-Location $ProjectRoot
    
    # Set Solana config to devnet for testing
    solana config set --url devnet
    
    Write-Status "Running program tests..."
    
    # Run Anchor tests
    try {
        anchor test --provider.cluster devnet
        Write-Success "Program tests passed"
    }
    catch {
        Write-Error "Program tests failed"
        exit 1
    }
}

# Function to show deployment status
function Show-Status {
    Write-Status "Current deployment status:"
    
    Write-Host ""
    Write-Host "Network Status:" -ForegroundColor White
    Write-Host "==============" -ForegroundColor White
    
    # Check devnet
    try {
        $null = solana program show $ProgramId --url devnet 2>$null
        Write-Host "Devnet: ✓ Deployed" -ForegroundColor Green
    }
    catch {
        Write-Host "Devnet: ✗ Not Deployed" -ForegroundColor Red
    }
    
    # Check mainnet
    try {
        $null = solana program show $ProgramId --url mainnet-beta 2>$null
        Write-Host "Mainnet: ✓ Deployed" -ForegroundColor Green
    }
    catch {
        Write-Host "Mainnet: ✗ Not Deployed" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Current Solana Config:" -ForegroundColor White
    Write-Host "======================" -ForegroundColor White
    solana config get
}

# Function to show help
function Show-Help {
    Write-Host "Solana CTO DEX Escrow Deployment Script (PowerShell)" -ForegroundColor White
    Write-Host ""
    Write-Host "Usage: .\deploy.ps1 [COMMAND]" -ForegroundColor White
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor White
    Write-Host "  build       Build the program" -ForegroundColor White
    Write-Host "  devnet      Deploy to devnet" -ForegroundColor White
    Write-Host "  mainnet     Deploy to mainnet" -ForegroundColor White
    Write-Host "  test        Test program functions" -ForegroundColor White
    Write-Host "  status      Show deployment status" -ForegroundColor White
    Write-Host "  help        Show this help message" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor White
    Write-Host "  .\deploy.ps1 build              # Build program" -ForegroundColor White
    Write-Host "  .\deploy.ps1 devnet             # Deploy to devnet" -ForegroundColor White
    Write-Host "  .\deploy.ps1 mainnet            # Deploy to mainnet" -ForegroundColor White
    Write-Host "  .\deploy.ps1 test               # Test program" -ForegroundColor White
    Write-Host "  .\deploy.ps1 status             # Show status" -ForegroundColor White
}

# Main script logic
switch ($Command) {
    "build" {
        Test-Prerequisites
        Build-Program
    }
    "devnet" {
        Test-Prerequisites
        Build-Program
        Deploy-Devnet
    }
    "mainnet" {
        Test-Prerequisites
        Build-Program
        Deploy-Mainnet
    }
    "test" {
        Test-Prerequisites
        Test-Program
    }
    "status" {
        Show-Status
    }
    "help" {
        Show-Help
    }
    default {
        Show-Help
    }
}
