import { NextApiRequest, NextApiResponse } from 'next';
import { Connection } from '@solana/web3.js';
import { healthChecker, errorMonitor, gracefulDegradation } from '../../lib/errorHandling';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get basic system info
    const systemInfo = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    };

    // Check Solana connection health
    let solanaHealth = { status: 'unknown', details: {} };
    try {
      const connection = new Connection(
        process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
        'confirmed'
      );
      
      const health = await connection.getHealth();
      const slot = await connection.getSlot();
      const blockTime = await connection.getBlockTime(slot);
      
      solanaHealth = {
        status: health === 'ok' ? 'healthy' : 'unhealthy',
        details: {
          health,
          slot,
          blockTime: blockTime ? new Date(blockTime * 1000).toISOString() : null,
          rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com'
        }
      };
    } catch (error) {
      solanaHealth = {
        status: 'error',
        details: { error: error.message }
      };
    }

    // Check program health
    let programHealth = { status: 'unknown', details: {} };
    try {
      const programId = process.env.NEXT_PUBLIC_PROGRAM_ID;
      if (programId) {
        programHealth = {
          status: 'healthy',
          details: {
            programId,
            exists: true
          }
        };
      } else {
        programHealth = {
          status: 'unhealthy',
          details: { error: 'Program ID not configured' }
        };
      }
    } catch (error) {
      programHealth = {
        status: 'error',
        details: { error: error.message }
      };
    }

    // Get error monitoring stats
    const errorStats = {
      totalAlerts: errorMonitor.getAlerts().length,
      criticalAlerts: errorMonitor.getAlerts('CRITICAL').length,
      highAlerts: errorMonitor.getAlerts('HIGH').length,
      mediumAlerts: errorMonitor.getAlerts('MEDIUM').length,
      lowAlerts: errorMonitor.getAlerts('LOW').length,
      recentAlerts: errorMonitor.getAlerts().slice(-5) // Last 5 alerts
    };

    // Get graceful degradation status
    const degradationStatus = {
      isDegraded: gracefulDegradation.isServiceDegraded(),
      lastReset: 'N/A' // Could be enhanced to track actual reset times
    };

    // Perform comprehensive health check
    const healthCheckResult = await healthChecker.performHealthCheck();

    // Compile overall health status
    const overallHealth = {
      status: 'healthy',
      checks: {
        system: 'healthy',
        solana: solanaHealth.status,
        program: programHealth.status,
        errors: errorStats.totalAlerts === 0 ? 'healthy' : 'degraded',
        degradation: degradationStatus.isDegraded ? 'degraded' : 'healthy'
      }
    };

    // Determine overall status
    const unhealthyChecks = Object.values(overallHealth.checks).filter(status => status !== 'healthy');
    if (unhealthyChecks.includes('error')) {
      overallHealth.status = 'unhealthy';
    } else if (unhealthyChecks.length > 0) {
      overallHealth.status = 'degraded';
    }

    // Prepare response
    const response = {
      status: overallHealth.status,
      timestamp: systemInfo.timestamp,
      uptime: systemInfo.uptime,
      checks: {
        system: {
          status: overallHealth.checks.system,
          details: systemInfo
        },
        solana: {
          status: overallHealth.checks.solana,
          details: solanaHealth.details
        },
        program: {
          status: overallHealth.checks.program,
          details: programHealth.details
        },
        errors: {
          status: overallHealth.checks.errors,
          details: errorStats
        },
        degradation: {
          status: overallHealth.checks.degradation,
          details: degradationStatus
        }
      },
      summary: {
        totalChecks: Object.keys(overallHealth.checks).length,
        healthyChecks: Object.values(overallHealth.checks).filter(status => status === 'healthy').length,
        degradedChecks: Object.values(overallHealth.checks).filter(status => status === 'degraded').length,
        unhealthyChecks: Object.values(overallHealth.checks).filter(status => status === 'error').length
      }
    };

    // Set appropriate HTTP status code
    const statusCode = overallHealth.status === 'healthy' ? 200 : 
                      overallHealth.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(response);

  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
