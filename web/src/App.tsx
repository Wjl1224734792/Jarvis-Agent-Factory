import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import useIllustrationTheme from './theme';
import AppLayout from './components/Layout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Agents = lazy(() => import('./pages/Agents'));
const Archive = lazy(() => import('./pages/Archive'));

function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#9CD3D3' }}>
      <span>加载中...</span>
    </div>
  );
}

export default function App() {
  const configProps = useIllustrationTheme();

  return (
    <ConfigProvider {...configProps}>
      <AntApp>
        <AppLayout>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/archive" element={<Archive />} />
            </Routes>
          </Suspense>
        </AppLayout>
      </AntApp>
    </ConfigProvider>
  );
}
