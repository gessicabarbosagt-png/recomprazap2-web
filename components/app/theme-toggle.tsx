'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start text-muted-foreground px-1"
      onClick={toggle}
      title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
    >
      {theme === 'dark'
        ? <><Sun className="h-4 w-4 mr-2" /> Modo claro</>
        : <><Moon className="h-4 w-4 mr-2" /> Modo escuro</>
      }
    </Button>
  )
}
