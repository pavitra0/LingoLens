import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const html = document.documentElement
    const isDarkMode = html.classList.contains('dark')
    setIsDark(isDarkMode)
  }, [])

  const toggleTheme = () => {
    const html = document.documentElement
    html.classList.toggle('dark')
    setIsDark(html.classList.contains('dark'))
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="rounded-full hover:bg-secondary transition-colors"
    >
      {isDark ? (
        <Sun className="h-5 w-5 transition-all text-yellow-100 hover:text-yellow-200" />
      ) : (
        <Moon className="h-5 w-5 transition-all text-slate-700 hover:text-slate-900" />
      )}
    </Button>
  )
}
