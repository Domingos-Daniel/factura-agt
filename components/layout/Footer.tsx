'use client'

import { Shield, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function Footer() {
  const currentYear = new Date().getFullYear()
  
  // Detectar ambiente
  const environment = process.env.NEXT_PUBLIC_AGT_ENVIRONMENT || 'mock'
  const envInfo = {
    mock: { label: 'DEMO', color: 'bg-gray-500', desc: 'Ambiente de Demonstração' },
    hml: { label: 'HML', color: 'bg-yellow-500', desc: 'Ambiente de Homologação' },
    prod: { label: 'PRODUÇÃO', color: 'bg-green-600', desc: 'Ambiente de Produção' }
  }[environment] || { label: 'MOCK', color: 'bg-gray-500', desc: 'Ambiente Local' }

  return (
    <footer className="border-t border-border/50 bg-muted/30 backdrop-blur-sm mt-auto">
      <div className="container px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                SafeFacturas
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                v1.0
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground text-center md:text-left">
              Sistema de Faturação Eletrónica para AGT Angola
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Ambiente Ativo:</span>
              <Badge className={`${envInfo.color} text-white text-[10px] px-2 py-0.5 h-5`}>
                {envInfo.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              © {currentYear} SafeFacturas. Todos os direitos reservados.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border/30 flex flex-col md:flex-row items-center justify-center md:justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <a 
              href="https://www.agt.minfin.gov.ao" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              AGT Angola
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-border">|</span>
            <span>Desenvolvido para conformidade fiscal</span>
          </div>
          <div className="text-center">
            <span className="text-muted-foreground/60">{envInfo.desc}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
