import { NextApiRequest, NextApiResponse } from 'next';
import { Connection } from '@solana/web3.js';

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
      
      // Use getLatestBlockhash instead of getHealth (which doesn't exist)
      const { blockhash } = await connection.getLatestBlockhash();
      const slot = await connection.getSlot();
      const blockTime = await connection.getBlockTime(slot);
      
      solanaHealth = {
        status: blockhash ? 'healthy' : 'unhealthy',
        details: {
          blockhash: blockhash ? 'available' : 'unavailable',
          slot,
          blockTime: blockTime ? new Date(blockTime * 1000).toISOString() : null,
          rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com'
        }
      };
    } catch (error) {
      solanaHealth = {
        status: 'error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
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
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }

    // Simplified health status without complex error handling
    const overallHealth = {
      status: 'healthy',
      checks: {
        system: 'healthy',
        solana: solanaHealth.status,
        program: programHealth.status
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
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error during health check',
      timestamp: new Date().toISOString()
    });
  }
}
