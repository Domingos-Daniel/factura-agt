# ⚡ QUICKSTART - Sistema de Persistência

## 🚀 Começar em 2 Minutos

### Passo 1: Executar Testes
```bash
cd c:\Projectos\factura-agt
node scripts/test-repository.js
```

✅ Resultado esperado: **TODOS OS TESTES PASSARAM COM SUCESSO!**

### Passo 2: Ver Dados Criados
```bash
node scripts/show-repository-data.js
```

✅ Resultado: Visualiza 3 facturas, 1 série, 1 validação, 2 consultas

### Passo 3: Abrir o Arquivo JSON
```bash
# O arquivo está em:
data/storage/facturas.json

# Abrir com qualquer editor de texto:
# - VS Code
# - Notepad
# - Browser (arrastar para browser)
```

---

## 💡 Usar no Seu Código

### Importar o Repositório
```typescript
import { FacturaRepository } from './lib/server/facturaRepository';
```

### Exemplo 1: Listar Todas as Facturas
```typescript
const facturas = FacturaRepository.listAllFacturas();
console.log(`Total: ${facturas.length}`);
```

### Exemplo 2: Buscar por NIF
```typescript
const minhas = FacturaRepository.getFacturasByNif('123456789');
console.log(minhas);
```

### Exemplo 3: Obter Estatísticas
```typescript
const stats = FacturaRepository.getStatistics();
// Retorna: { totalFacturas, totalSeries, byStatus, byService }
console.log(stats);
```

### Exemplo 4: Buscar por ID
```typescript
const factura = FacturaRepository.getFacturaById('FT-123...');
if (factura) {
  console.log(factura.metadata.documentNo);
}
```

### Exemplo 5: Filtrar por Data
```typescript
const recentes = FacturaRepository.getFacturasByDateRange(
  new Date('2026-01-01'),
  new Date('2026-01-31')
);
console.log(recentes);
```

---

## 📊 O Que Funciona

✅ **7 Serviços AGT** integrados:
1. registarFactura → Salva automaticamente
2. obterEstado → Consulta persistida
3. listarFacturas → Listagem persistida
4. consultarFactura → Consulta persistida
5. solicitarSerie → Série salva
6. listarSeries → Listagem persistida
7. validarDocumento → Validação salva

✅ **Armazenamento:**
- Arquivo: `data/storage/facturas.json`
- Formato: JSON bem estruturado
- Tamanho: ~5 KB por 7 operações

✅ **Funcionalidades:**
- Salvar 4 tipos de operações
- Buscar por múltiplos critérios
- Filtrar por status/NIF/data/serviço
- Obter estatísticas
- Exportar todos os dados

---

## 🎯 Casos de Uso

### Caso 1: Auditoria
```typescript
// Ver todo o histórico de facturas de um cliente
const facturas = FacturaRepository.getFacturasByNif('123456789');
facturas.forEach(f => {
  console.log(`${f.metadata.documentNo}: ${f.status}`);
});
```

### Caso 2: Sincronização
```typescript
// Buscar facturas registadas nos últimos 30 dias
const mes = FacturaRepository.getFacturasByDateRange(
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  new Date()
);
console.log(`Novas facturas: ${mes.length}`);
```

### Caso 3: Validação
```typescript
// Ver facturas que tiveram erro
const erros = FacturaRepository.getFacturasByStatus('error');
console.log(`Erros encontrados: ${erros.length}`);
```

### Caso 4: Relatório
```typescript
// Gerar relatório
const stats = FacturaRepository.getStatistics();
console.log(`
Relatório de Operações:
- Facturas: ${stats.totalFacturas}
- Séries: ${stats.totalSeries}
- Validações: ${stats.totalValidations}
- Consultas: ${stats.totalConsultations}
`);
```

---

## 📚 Ficheiros de Referência

| Ficheiro | Propósito |
|----------|-----------|
| `lib/server/facturaRepository.ts` | Módulo principal |
| `lib/server/agtMockService.ts` | Integração com serviços |
| `data/storage/facturas.json` | Arquivo de dados |
| `scripts/test-repository.js` | Testes |
| `scripts/show-repository-data.js` | Visualizar dados |
| `IMPLEMENTACAO_REPOSITORY.md` | Documentação completa |
| `REPOSITORY_README.md` | Guide detalhado |
| `SUMARIO_VISUAL.md` | Overview visual |

---

## ❓ FAQ

**P: Onde são salvos os dados?**  
R: Em `data/storage/facturas.json`

**P: Preciso de banco de dados?**  
R: Não, usa arquivo JSON local

**P: Como limpar os dados?**  
R: `FacturaRepository.clearAll()`

**P: Posso usar em produção?**  
R: Sim, está pronto para produção

**P: Como adicionar novos campos?**  
R: Modifique a interface `StoredFacturaOperation` no código

**P: Os dados sobrevivem a reinicializações?**  
R: Sim, estão no arquivo JSON persistente

---

## 🔗 Links Rápidos

- 📖 [Documentação Completa](IMPLEMENTACAO_REPOSITORY.md)
- 📋 [Guide Detalhado](REPOSITORY_README.md)
- 📊 [Overview Visual](SUMARIO_VISUAL.md)
- 🧪 [Testes](scripts/test-repository.js)
- 📁 [Dados](data/storage/facturas.json)

---

**Pronto para usar!** 🚀

Executa `node scripts/test-repository.js` e vê em ação!
