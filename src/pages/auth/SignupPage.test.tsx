// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { toastMock, getAuthStatusMock, sendOtpCodeMock, signupWithOtpMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  getAuthStatusMock: vi.fn(),
  sendOtpCodeMock: vi.fn(),
  signupWithOtpMock: vi.fn(),
}));

vi.mock('@/components/AppSidebar', () => ({
  AppSidebar: () => <div data-testid="sidebar" />,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/lib/otpApi', () => ({
  getAuthStatus: getAuthStatusMock,
  sendOtpCode: sendOtpCodeMock,
  signupWithOtp: signupWithOtpMock,
}));

vi.mock('@/lib/supabase', () => ({
  hasSupabaseConfig: true,
}));

import Signup from './SignupPage';

const renderSignup = async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  document.body.appendChild(container);

  await act(async () => {
    root.render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );
  });

  await act(async () => {
    await Promise.resolve();
  });

  return {
    container,
    cleanup: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const dispatchInput = async (input: HTMLInputElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

  await act(async () => {
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

const dispatchClick = async (element: HTMLElement | null) => {
  if (!element) {
    throw new Error('Missing target element for click.');
  }

  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const findButton = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll('button')).find((element) => element.textContent?.includes(label));

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button labeled "${label}".`);
  }

  return button;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('Signup', () => {
  it('shows an unavailable alert and disables account creation when signup is not ready', async () => {
    getAuthStatusMock.mockResolvedValue({
      ok: true,
      signupReady: false,
      resetReady: true,
      reasons: ['missing_supabase_admin'],
    });

    const { container, cleanup } = await renderSignup();

    expect(container.textContent).toContain('Unavailable');
    expect(container.textContent).toContain('Account creation is temporarily unavailable. Please try again later.');
    expect(findButton(container, 'Continue').disabled).toBe(true);
    expect(sendOtpCodeMock).not.toHaveBeenCalled();

    await cleanup();
  });

  it('rechecks readiness before sending OTP and blocks the request when signup becomes unavailable', async () => {
    getAuthStatusMock
      .mockResolvedValueOnce({
        ok: true,
        signupReady: true,
        resetReady: true,
        reasons: [],
      })
      .mockResolvedValueOnce({
        ok: true,
        signupReady: false,
        resetReady: true,
        reasons: ['missing_supabase_admin'],
      });

    const { container, cleanup } = await renderSignup();

    await dispatchInput(container.querySelector('#signup-username') as HTMLInputElement, 'blindchess_player');
    await dispatchInput(container.querySelector('#signup-email') as HTMLInputElement, 'player@example.com');
    await dispatchInput(container.querySelector('#signup-password') as HTMLInputElement, 'hunter2');
    await dispatchClick(findButton(container, 'Continue'));

    expect(sendOtpCodeMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Account creation unavailable',
      description: 'Account creation is temporarily unavailable. Please try again later.',
      variant: 'destructive',
    }));
    expect(container.textContent).toContain('Unavailable');

    await cleanup();
  });
});
