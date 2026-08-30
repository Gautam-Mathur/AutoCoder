import React from 'react';
import App, { AppProps } from 'next/app';
import Header from '../components/layout/Header';
import { AuthProvider } from '../lib/auth';
import { StripeProvider } from '../lib/stripe';

const AppWrapper: React.FC<AppProps> = ({ Component, pageProps }) => {
  return (
    <AuthProvider>
      <StripeProvider>
        <div className="app-wrapper">
          <Header />
          <main>
            <Component {...pageProps} />
          </main>
        </div>
      </StripeProvider>
    </AuthProvider>
  );
};

export default AppWrapper;