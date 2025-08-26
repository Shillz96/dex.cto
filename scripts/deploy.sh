#!/bin/bash

# Solana CTO DEX Escrow Deployment Script
# This script automates the deployment process for devnet and mainnet

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROGRAM_ID="CfzHBxVGRyVC6TythNtmDkXVX1k9iJQvwzBasFDDbLsY"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Solana CLI is installed
    if ! command -v solana &> /dev/null; then
        print_error "Solana CLI not found. Please install it first."
        exit 1
    fi
    
    # Check if Anchor CLI is installed
    if ! command -v anchor &> /dev/null; then
        print_error "Anchor CLI not found. Please install it first."
        exit 1
    fi
    
    # Check if we're in the project directory
    if [[ ! -f "$PROJECT_ROOT/Anchor.toml" ]]; then
        print_error "Not in project root directory. Please run from cto.dex folder."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to build the program
build_program() {
    print_status "Building program..."
    
    cd "$PROJECT_ROOT"
    
    # Clean previous builds
    print_status "Cleaning previous builds..."
    anchor clean
    
    # Build program
    print_status "Building with Anchor..."
    anchor build
    
    # Verify build artifacts
    if [[ ! -f "target/deploy/cto_dex_escrow.so" ]]; then
        print_error "Build failed - program binary not found"
        exit 1
    fi
    
    print_success "Program built successfully"
}

# Function to deploy to devnet
deploy_devnet() {
    print_status "Deploying to devnet..."
    
    cd "$PROJECT_ROOT"
    
    # Set Solana config to devnet
    solana config set --url devnet
    
    # Deploy program
    print_status "Deploying program to devnet..."
    anchor deploy --provider.cluster devnet
    
    # Verify deployment
    print_status "Verifying deployment..."
    if solana program show "$PROGRAM_ID" --url devnet &> /dev/null; then
        print_success "Program deployed to devnet successfully"
    else
        print_error "Program deployment verification failed"
        exit 1
    fi
}

# Function to deploy to mainnet
deploy_mainnet() {
    print_status "Deploying to mainnet..."
    
    cd "$PROJECT_ROOT"
    
    # Set Solana config to mainnet
    solana config set --url mainnet-beta
    
    # Deploy program
    print_status "Deploying program to mainnet..."
    anchor deploy --provider.cluster mainnet-beta
    
    # Verify deployment
    print_status "Verifying deployment..."
    if solana program show "$PROGRAM_ID" --url mainnet-beta &> /dev/null; then
        print_success "Program deployed to mainnet successfully"
    else
        print_error "Program deployment verification failed"
        exit 1
    fi
}

# Function to test program functions
test_program() {
    print_status "Testing program functions..."
    
    cd "$PROJECT_ROOT"
    
    # Set Solana config to devnet for testing
    solana config set --url devnet
    
    print_status "Running program tests..."
    
    # Run Anchor tests
    if anchor test --provider.cluster devnet; then
        print_success "Program tests passed"
    else
        print_error "Program tests failed"
        exit 1
    fi
}

# Function to show deployment status
show_status() {
    print_status "Current deployment status:"
    
    echo ""
    echo "Network Status:"
    echo "=============="
    
    # Check devnet
    if solana program show "$PROGRAM_ID" --url devnet &> /dev/null; then
        echo -e "Devnet: ${GREEN}✓ Deployed${NC}"
    else
        echo -e "Devnet: ${RED}✗ Not Deployed${NC}"
    fi
    
    # Check mainnet
    if solana program show "$PROGRAM_ID" --url mainnet-beta &> /dev/null; then
        echo -e "Mainnet: ${GREEN}✓ Deployed${NC}"
    else
        echo -e "Mainnet: ${RED}✗ Not Deployed${NC}"
    fi
    
    echo ""
    echo "Current Solana Config:"
    echo "======================"
    solana config get
}

# Function to show help
show_help() {
    echo "Solana CTO DEX Escrow Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build       Build the program"
    echo "  devnet      Deploy to devnet"
    echo "  mainnet     Deploy to mainnet"
    echo "  test        Test program functions"
    echo "  status      Show deployment status"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 build              # Build program"
    echo "  $0 devnet             # Deploy to devnet"
    echo "  $0 mainnet            # Deploy to mainnet"
    echo "  $0 test               # Test program"
    echo "  $0 status             # Show status"
}

# Main script logic
main() {
    case "${1:-help}" in
        "build")
            check_prerequisites
            build_program
            ;;
        "devnet")
            check_prerequisites
            build_program
            deploy_devnet
            ;;
        "mainnet")
            check_prerequisites
            build_program
            deploy_mainnet
            ;;
        "test")
            check_prerequisites
            test_program
            ;;
        "status")
            show_status
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"
