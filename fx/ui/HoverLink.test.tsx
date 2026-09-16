import {render, screen} from '@testing-library/react'
import {HoverLink} from './HoverLink'

describe('HoverLink', () => {
  it('renders the title as a link pointing at href', () => {
    render(<HoverLink href="/boards/123" title="My Board" />)

    const link = screen.getByRole('link', {name: 'My Board'})
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/boards/123')
  })
})
