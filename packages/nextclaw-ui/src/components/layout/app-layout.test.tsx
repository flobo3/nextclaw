import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppLayout } from '@/components/layout/AppLayout';
import { I18nProvider } from '@/components/providers/I18nProvider';

describe('AppLayout', () => {
  it('treats /agents as a main workspace route instead of the settings shell', () => {
    const { container } = render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/agents']}>
          <Routes>
            <Route
              path="*"
              element={(
                <AppLayout>
                  <div data-testid="agents-content">Agents Content</div>
                </AppLayout>
              )}
            />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    expect(screen.getByTestId('agents-content')).toBeTruthy();
    expect(screen.queryByTestId('settings-sidebar-header')).toBeNull();
    expect(container.querySelector('aside')).toBeNull();
  });
});
