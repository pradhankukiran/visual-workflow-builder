import { useState, useCallback, useEffect } from 'react';
import clsx from 'clsx';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import ConfigPanel from '@/components/layout/ConfigPanel';
import WorkflowCanvas from '@/components/canvas/WorkflowCanvas';
import ExecutionLog from '@/components/execution/ExecutionLog';
import ExecutionHistory from '@/components/execution/ExecutionHistory';
import ToastContainer from '@/components/toast/ToastContainer';
import { useAppSelector } from '@/app/hooks';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const selectedNodeId = useAppSelector((state) => state.ui.selectedNodeId ?? null);
  const theme = useAppSelector((state) => state.ui.theme);

  // Register global keyboard shortcuts
  useKeyboardShortcuts();

  // Apply persisted theme to document on initial load and when theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  return (
    <div
      className={clsx(
        'flex h-screen w-screen overflow-hidden',
        'bg-[var(--color-bg)] text-[var(--color-text)]',
      )}
    >
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header />

        {/* Canvas + Execution Log */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Canvas area */}
          <main className="flex-1 relative overflow-hidden min-h-0">
            <WorkflowCanvas />
          </main>

          {/* Execution Log (collapsible bottom panel) */}
          <ExecutionLog />
          <ExecutionHistory />
        </div>
      </div>

      {/* Config Panel */}
      <ConfigPanel selectedNodeId={selectedNodeId} />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
