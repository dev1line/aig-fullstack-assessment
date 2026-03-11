import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewForm } from './ReviewForm';

describe('ReviewForm', () => {
  it('renders textarea and submit button', () => {
    render(<ReviewForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/review text/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /analyze/i }),
    ).toBeInTheDocument();
  });

  it('shows character count', () => {
    render(<ReviewForm onSubmit={vi.fn()} />);
    expect(screen.getByText(/0\/500 characters/)).toBeInTheDocument();
  });

  it('validates empty submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ReviewForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /analyze/i }));
    expect(screen.getByRole('status')).toHaveTextContent(
      /review text is required/i,
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with trimmed text', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ReviewForm onSubmit={onSubmit} />);
    await user.type(
      screen.getByLabelText(/review text/i),
      '  Great service!  ',
    );
    await user.click(screen.getByRole('button', { name: /analyze/i }));
    expect(onSubmit).toHaveBeenCalledWith('Great service!');
  });

  it('disables submit when disabled prop is true', () => {
    render(<ReviewForm onSubmit={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: /analyze/i })).toBeDisabled();
  });

  it('shows error and disables button when over 500 characters', () => {
    render(<ReviewForm onSubmit={vi.fn()} />);
    const textarea = screen.getByLabelText(/review text/i);
    fireEvent.change(textarea, { target: { value: 'x'.repeat(501) } });
    expect(screen.getByRole('status')).toHaveTextContent(
      /must be at most 500 characters/i,
    );
    expect(textarea).toHaveClass('input-error');
    expect(screen.getByRole('button', { name: /analyze/i })).toBeDisabled();
  });

  it('shows error message when onSubmit rejects', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<ReviewForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/review text/i), 'Good');
    await user.click(screen.getByRole('button', { name: /analyze/i }));
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/network error/i);
  });

  it('shows generic error when non-Error is thrown', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue('string error');
    render(<ReviewForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/review text/i), 'Good');
    await user.click(screen.getByRole('button', { name: /analyze/i }));
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/something went wrong/i);
  });
});
