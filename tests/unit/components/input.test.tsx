import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'

describe('Input Component', () => {
  it('should render with default styles', () => {
    render(<Input placeholder="Enter text" />)
    
    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeInTheDocument()
    expect(input).toHaveClass(
      'flex', 'h-10', 'w-full', 'rounded-md', 'border', 'border-input', 
      'bg-background', 'px-3', 'py-2', 'text-base'
    )
  })

  it('should handle different input types', () => {
    const types = ['text', 'email', 'password', 'number', 'tel', 'url']
    
    types.forEach((type) => {
      const { unmount } = render(<Input type={type as any} data-testid={`input-${type}`} />)
      const input = screen.getByTestId(`input-${type}`)
      expect(input).toHaveAttribute('type', type)
      unmount()
    })
  })

  it('should handle value changes', async () => {
    const user = userEvent.setup()
    const handleChange = jest.fn()
    
    render(<Input onChange={handleChange} placeholder="Type here" />)
    
    const input = screen.getByPlaceholderText('Type here')
    await user.type(input, 'Hello World')
    
    expect(handleChange).toHaveBeenCalled()
    expect(input).toHaveValue('Hello World')
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled placeholder="Disabled input" />)
    
    const input = screen.getByPlaceholderText('Disabled input')
    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
  })

  it('should render with custom className', () => {
    render(<Input className="custom-input" placeholder="Custom styled" />)
    
    const input = screen.getByPlaceholderText('Custom styled')
    expect(input).toHaveClass('custom-input')
  })

  it('should forward ref correctly', () => {
    const ref = jest.fn()
    render(<Input ref={ref} placeholder="Ref input" />)
    
    expect(ref).toHaveBeenCalled()
  })

  it('should handle required attribute', () => {
    render(<Input required placeholder="Required input" />)
    
    const input = screen.getByPlaceholderText('Required input')
    expect(input).toBeRequired()
  })

  it('should handle min and max values for number inputs', () => {
    render(<Input type="number" min={0} max={100} placeholder="Number input" />)
    
    const input = screen.getByPlaceholderText('Number input')
    expect(input).toHaveAttribute('min', '0')
    expect(input).toHaveAttribute('max', '100')
  })

  it('should handle focus and blur events', async () => {
    const user = userEvent.setup()
    const handleFocus = jest.fn()
    const handleBlur = jest.fn()
    
    render(<Input onFocus={handleFocus} onBlur={handleBlur} placeholder="Focus test" />)
    
    const input = screen.getByPlaceholderText('Focus test')
    
    await user.click(input)
    expect(handleFocus).toHaveBeenCalledTimes(1)
    
    await user.tab()
    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it('should handle default value', () => {
    render(<Input defaultValue="Default text" placeholder="Default input" />)
    
    const input = screen.getByPlaceholderText('Default input')
    expect(input).toHaveValue('Default text')
  })

  it('should handle controlled value', () => {
    const ControlledInput = () => {
      const [value, setValue] = React.useState('initial')
      return (
        <Input 
          value={value} 
          onChange={(e) => setValue(e.target.value)}
          placeholder="Controlled input"
        />
      )
    }
    
    render(<ControlledInput />)
    
    const input = screen.getByPlaceholderText('Controlled input')
    expect(input).toHaveValue('initial')
  })

  it('should handle file input correctly', () => {
    render(<Input type="file" accept=".jpg,.png" data-testid="file-input" />)
    
    const input = screen.getByTestId('file-input')
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAttribute('accept', '.jpg,.png')
    expect(input).toHaveClass('file:border-0', 'file:bg-transparent', 'file:text-sm')
  })

  it('should spread additional props', () => {
    render(
      <Input 
        data-testid="props-input" 
        aria-label="Test input"
        maxLength={50}
        pattern="[0-9]*"
        placeholder="Props input"
      />
    )
    
    const input = screen.getByTestId('props-input')
    expect(input).toHaveAttribute('aria-label', 'Test input')
    expect(input).toHaveAttribute('maxLength', '50')
    expect(input).toHaveAttribute('pattern', '[0-9]*')
  })
})