import React from 'react';
import Head from 'next/head';
import MonitoringDashboard from '../components/MonitoringDashboard';

const MonitoringPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>System Monitoring - Dex.CTO</title>
        <meta name="description" content="Real-time system monitoring and error tracking for Dex.CTO platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <main className="min-h-screen bg-gray-50">
        <MonitoringDashboard />
      </main>
    </>
  );
};

export default MonitoringPage;
