// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  toastMock,
  getAuthStatusMock,
  resolveIdentifierToEmailMock,
  sendPasswordResetOtpMock,
  resetPasswordWithOtpMock,
  signInWithPasswordMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  getAuthStatusMock: vi.fn(),
  resolveIdentifierToEmailMock: vi.fn(),
  sendPasswordResetOtpMock: vi.fn(),
  resetPasswordWithOtpMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
}));

vi.mock('@/components/AppSidebar', () => ({
  AppSidebar: () => <div data-testid="sidebar" />,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/lib/otpApi', () => ({
  getAuthStatus: getAuthStatusMock,
  resolveIdentifierToEmail: resolveIdentifierToEmailMock,
  sendPasswordResetOtp: sendPasswordResetOtpMock,
  resetPasswordWithOtp: resetPasswordWithOtpMock,
}));

vi.mock('@/lib/supabase', () => ({
  hasSupabaseConfig: true,
  supabase: {
    auth: {
      signInWithPassword: signInWithPasswordMock,
    },
  },
}));

import Login from './LoginPage';

const renderLogin = async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  document.body.appendChild(container);

  await act(async () => {
    root.render(
      <MemoryRouter>
        <Login />
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

const findButton = (container: HTMLElement, label: string, tagName = 'button') => {
  const button = Array.from(container.querySelectorAll(tagName)).find((element) => element.textContent?.includes(label));

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

describe('Login forgot-password readiness', () => {
  it('keeps normal login usable while disabling forgot-password OTP when reset is unavailable', async () => {
    getAuthStatusMock.mockResolvedValue({
      ok: true,
      signupReady: true,
      resetReady: false,
      reasons: ['missing_supabase_admin'],
    });

    const { container, cleanup } = await renderLogin();

    expect(findButton(container, 'Sign In').disabled).toBe(false);

    await dispatchClick(findButton(container, 'Forgot password?'));

    expect(container.textContent).toContain('Unavailable');
    expect(container.textContent).toContain('Password reset is temporarily unavailable. Please try again later.');
    expect(findButton(container, 'Send Code').disabled).toBe(true);
    expect(sendPasswordResetOtpMock).not.toHaveBeenCalled();

    await cleanup();
  });

  it('rechecks readiness before sending a reset OTP and blocks the request when reset becomes unavailable', async () => {
    getAuthStatusMock
      .mockResolvedValueOnce({
        ok: true,
        signupReady: true,
        resetReady: true,
        reasons: [],
      })
      .mockResolvedValueOnce({
        ok: true,
        signupReady: true,
        resetReady: false,
        reasons: ['missing_supabase_admin'],
      });

    const { container, cleanup } = await renderLogin();

    await dispatchClick(findButton(container, 'Forgot password?'));
    await dispatchInput(container.querySelector('#forgot-identifier') as HTMLInputElement, 'blindchess_player');
    await dispatchClick(findButton(container, 'Send Code'));

    expect(resolveIdentifierToEmailMock).not.toHaveBeenCalled();
    expect(sendPasswordResetOtpMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Password reset unavailable',
      description: 'Password reset is temporarily unavailable. Please try again later.',
      variant: 'destructive',
    }));

    await cleanup();
  });
});
