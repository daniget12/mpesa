'use client';

import React, { useState } from 'react';
import { MiniAppProvider } from '@/context/MiniAppContext';
import { MainApp } from '@/components/MainApp';
import { WebsiteHome } from '@/components/WebsiteHome';

export default function Home() {
  const [surfaceMode, setSurfaceMode] = useState<'miniapp' | 'website'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'website') {
        return 'website';
      }
    }
    return 'miniapp';
  });

  return (
    <MiniAppProvider>
      {surfaceMode === 'miniapp' ? (
        <MainApp onSwitchToWebsite={() => setSurfaceMode('website')} />
      ) : (
        <WebsiteHome onSwitchToMiniApp={() => setSurfaceMode('miniapp')} />
      )}
    </MiniAppProvider>
  );
}
