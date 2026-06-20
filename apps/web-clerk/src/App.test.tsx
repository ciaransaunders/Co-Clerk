import React from 'react';
import { render, screen } from '@testing-library/react';
import ClerkApp from './App';

describe('ClerkApp User Interface', () => {
  it('renders the login page when unauthenticated', () => {
    render(<ClerkApp />);
    expect(screen.getByText('CoClerk')).toBeInTheDocument();
    expect(screen.getByText(/Clerk Desktop Login/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });
});
