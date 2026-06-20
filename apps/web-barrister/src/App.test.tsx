import React from 'react';
import { render, screen } from '@testing-library/react';
import BarristerApp from './App';

describe('BarristerApp User Interface', () => {
  it('renders the login page when unauthenticated', () => {
    render(<BarristerApp />);
    expect(screen.getByText('CoClerk')).toBeInTheDocument();
    expect(screen.getByText(/Barrister Mobile Login/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });
});
