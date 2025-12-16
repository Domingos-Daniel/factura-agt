import { readFileSync } from 'fs';
import { join } from 'path';

// Tenta carregar o WSDL do diretório public/wsdl em tempo de build
function loadWsdl(): string | null {
  const candidates = [
    'AGT_FacturacaoElectronica_v1.wsdl',
    'AGT_FacturaService_v2.wsdl',
    'AGT_FacturaService.wsdl',
  ];
  const base = join(process.cwd(), 'public', 'wsdl');
  for (const c of candidates) {
    try {
      const p = join(base, c);
      const content = readFileSync(p, 'utf-8');
      if (content && content.trim().length > 0) return content;
    } catch (err) {
      // ignore and try next
    }
  }
  return null;
}

const BUILT_WSDL = loadWsdl();

export function getBuiltWsdl(): string | null {
  return BUILT_WSDL;
}

export default BUILT_WSDL;