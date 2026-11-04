import '../design/fontImports';
import '../app/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LabApp } from './LabApp';
import { ErrorBoundary } from '../app/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LabApp />
    </ErrorBoundary>
  </StrictMode>,
);
