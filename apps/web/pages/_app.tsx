import type { AppProps } from 'next/app';
import { WalletConnectionProvider } from '../components/WalletConnectionProvider';
import BetaBanner from '../components/BetaBanner';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WalletConnectionProvider>
      <BetaBanner />
      <Component {...pageProps} />
    </WalletConnectionProvider>
  );
}


