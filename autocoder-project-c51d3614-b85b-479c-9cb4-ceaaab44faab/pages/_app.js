import React from 'react';
import App from 'next/app';
import ProviderWrapper from '../components/ProviderWrapper';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <ProviderWrapper>
      <Component {...pageProps} />
    </ProviderWrapper>
  );
}

export default MyApp;