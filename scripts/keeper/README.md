# Campaign Keeper Script

A Node.js script that automates campaign management for the CTO DEX Escrow program.

## Features

- **Automated Campaign Monitoring**: Continuously monitors campaigns for automation opportunities
- **DEX Screener Integration**: Executes purchases through DEX Screener
- **Smart Payout Management**: Automatically processes payouts when conditions are met
- **Comprehensive Error Handling**: Retry logic, circuit breakers, and error monitoring
- **Health Monitoring**: Real-time health checks for all system components
- **Memory Management**: TTL-based cleanup, persistent storage, and garbage collection

## Memory Management Features

The keeper script now includes advanced memory management to prevent memory leaks and ensure optimal performance:

### TTL-based Cleanup
- Automatic expiration of merchant data after configurable time period
- Prevents accumulation of stale data in memory
- Configurable via `DATA_TTL` environment variable

### Memory Usage Monitoring
- Real-time memory usage tracking
- Automatic garbage collection when memory threshold is reached
- Memory health checks integrated with overall system health monitoring

### Persistent Storage
- Merchant data is automatically saved to disk
- Survives script restarts and crashes
- Configurable storage path via `PERSISTENT_STORAGE_PATH`

### Garbage Collection
- Automatic cleanup of expired and old data
- Configurable cleanup intervals
- Memory threshold-based cleanup triggers

## Environment Variables

### Required
- `KEEPER_PRIVATE_KEY`: Private key for the keeper wallet
- `PROGRAM_ID`: Solana program ID for the escrow contract

### Optional
- `KEEPER_RPC_URL`: RPC endpoint (defaults to devnet)
- `POLL_INTERVAL_MS`: Polling interval in milliseconds (default: 30000)
- `NODE_ENV`: Environment (development/production)
- `USE_MOCK_DEX`: Use mock DEX client for testing (default: false)

### Memory Management
- `MAX_MEMORY_USAGE`: Maximum memory usage in bytes (default: 100MB)
- `MEMORY_CLEANUP_INTERVAL`: Cleanup interval in milliseconds (default: 5 minutes)
- `DATA_TTL`: Time-to-live for merchant data in milliseconds (default: 24 hours)
- `PERSISTENT_STORAGE_PATH`: Path for persistent storage file (default: ./keeper-storage.json)

### DEX Screener
- `DEX_SCREENER_TIMEOUT`: Timeout for DEX Screener requests (default: 30000)
- `DEX_GMAIL_EMAIL`: Gmail account for DEX Screener
- `DEX_GMAIL_PASSWORD`: Gmail password for DEX Screener
- `DEX_AUTO_LOGIN`: Auto-login to DEX Screener (default: false)

### Monitoring
- `ALERT_WEBHOOK_URL`: Webhook URL for sending alerts
- `WEB_BASE_URL`: Base URL for campaign links (default: https://dexcto.io)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run the keeper:
```bash
npm start
```

## Memory Management Configuration

### Default Settings
- **Max Memory**: 100MB
- **Cleanup Interval**: 5 minutes
- **Data TTL**: 24 hours
- **Storage Path**: ./keeper-storage.json

### Customization
You can customize memory management behavior by setting environment variables:

```bash
# Set maximum memory to 200MB
export MAX_MEMORY_USAGE=209715200

# Set cleanup interval to 10 minutes
export MEMORY_CLEANUP_INTERVAL=600000

# Set data TTL to 12 hours
export DATA_TTL=43200000

# Set custom storage path
export PERSISTENT_STORAGE_PATH=/var/keeper/storage.json
```

## Monitoring and Health Checks

The keeper includes comprehensive health monitoring:

- **Connection Health**: Solana RPC connection status
- **Program Health**: Escrow program accessibility
- **DEX Client Health**: DEX Screener client status
- **Memory Health**: Memory usage and cleanup status

Health checks run automatically every 5 minutes and can trigger alerts when issues are detected.

## Error Handling and Recovery

- **Retry Logic**: Exponential backoff with jitter for failed operations
- **Circuit Breaker**: Automatic failure detection and service protection
- **Error Monitoring**: Real-time error tracking with configurable alert levels
- **Graceful Degradation**: Automatic fallback mechanisms when services fail

## Graceful Shutdown

The keeper handles shutdown signals gracefully:
- Saves persistent storage
- Cleans up memory
- Stops monitoring loops
- Exits cleanly

Supported signals: `SIGINT`, `SIGTERM`, `SIGQUIT`

## File Structure

```
scripts/keeper/
├── src/
│   ├── index.js              # Main keeper script
│   └── dexScreenerClient.js  # DEX Screener integration
├── package.json              # Dependencies
├── README.md                 # This file
└── .env                      # Environment configuration
```

## Troubleshooting

### Memory Issues
- Check memory usage with health monitoring
- Adjust `MAX_MEMORY_USAGE` if needed
- Verify cleanup intervals are appropriate
- Check for memory leaks in custom code

### Storage Issues
- Verify write permissions for storage path
- Check disk space availability
- Review storage file format and corruption

### Performance Issues
- Monitor memory usage patterns
- Adjust cleanup intervals
- Review data TTL settings
- Check for excessive data accumulation

## Development

For development and testing:
```bash
# Use mock DEX client
export USE_MOCK_DEX=true

# Enable debug logging
export NODE_ENV=development

# Run with custom memory settings
export MAX_MEMORY_USAGE=52428800  # 50MB
export MEMORY_CLEANUP_INTERVAL=60000  # 1 minute
export DATA_TTL=3600000  # 1 hour
```
