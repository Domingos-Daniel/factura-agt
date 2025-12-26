/**
 * =============================================================================
 * ENDPOINT WSDL IMPORT - Para SAP/SoapUI/Postman
 * =============================================================================
 * 
 * URL: GET /api/wsdl
 * 
 * Comportamentos:
 * - Browser (HTML): Exibe página com instruções de importação para SAP/SoapUI
 * - SOAP Client (Accept: xml/soap): Retorna WSDL puro (application/xml)
 * - curl -H "Accept: application/xml": Retorna WSDL puro
 * - SAP PI/PO: Aponta para este URL e importa diretamente
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBuiltWsdl } from '@/lib/wsdl';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache por 1 hora

/**
 * GET /api/wsdl
 * Retorna WSDL ou página de instrução conforme Accept header
 */
export async function GET(request: NextRequest) {
  const accept = request.headers.get('Accept') || 'text/html';
  const wsdlContent = getBuiltWsdl();

  if (!wsdlContent) {
    // WSDL não disponível
    const errorHtml = `
      <!DOCTYPE html>
      <html lang="pt-PT">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>AGT WSDL - Erro</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #333; }
            .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 4px; color: #c00; }
          </style>
        </head>
        <body>
          <h1>❌ WSDL não disponível</h1>
          <div class="error">
            <p>O ficheiro WSDL não foi encontrado no sistema.</p>
            <p>Por favor, contacte o suporte técnico.</p>
          </div>
        </body>
      </html>
    `;
    return new NextResponse(errorHtml, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Se cliente pediu XML/SOAP, retorna WSDL puro
  if (accept.includes('xml') || accept.includes('soap') || accept.includes('*/*')) {
    return new NextResponse(wsdlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': 'inline; filename="AGT_FacturacaoElectronica_v1.wsdl"',
        'Cache-Control': 'public, max-age=3600',
        'X-WSDL-Provider': 'AGT-Middleware',
        'X-WSDL-Version': '1.0.0',
      },
    });
  }

  // Para browser (HTML), exibe página de instrução
  const htmlPage = `
    <!DOCTYPE html>
    <html lang="pt-PT">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AGT Facturação Electrónica - WSDL Import</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 { font-size: 32px; margin-bottom: 10px; }
          .header p { font-size: 16px; opacity: 0.9; }
          .content { padding: 40px 30px; }
          .wsdl-url {
            background: #f5f5f5;
            border: 2px solid #ddd;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 14px;
            word-break: break-all;
            color: #333;
          }
          .copy-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 10px;
            transition: background 0.3s;
          }
          .copy-btn:hover { background: #764ba2; }
          .section {
            margin: 30px 0;
          }
          .section h2 {
            font-size: 20px;
            margin-bottom: 15px;
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
          }
          .instruction {
            background: #f9f9f9;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
          }
          .instruction strong { color: #667eea; }
          .step {
            margin: 15px 0;
            padding-left: 30px;
            position: relative;
          }
          .step::before {
            content: attr(data-step);
            position: absolute;
            left: 0;
            top: 0;
            background: #667eea;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
          }
          .code-block {
            background: #282c34;
            color: #abb2bf;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            font-family: 'Monaco', monospace;
            font-size: 13px;
            line-height: 1.5;
          }
          .download-section {
            background: #f0f9ff;
            border: 2px solid #0ea5e9;
            padding: 20px;
            border-radius: 4px;
            margin: 20px 0;
          }
          .download-btn {
            display: inline-block;
            background: #0ea5e9;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            text-decoration: none;
            font-weight: bold;
            margin-right: 10px;
            transition: background 0.3s;
          }
          .download-btn:hover { background: #0284c7; }
          .info-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
            color: #92400e;
          }
          .success-box {
            background: #dcfce7;
            border-left: 4px solid #22c55e;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
            color: #166534;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          th {
            background: #f5f5f5;
            font-weight: bold;
          }
          tr:hover { background: #fafafa; }
          .footer {
            background: #f5f5f5;
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔗 AGT Facturação Electrónica</h1>
            <p>WSDL Import Service - Integração SAP/PI/PO/SoapUI</p>
          </div>

          <div class="content">
            <!-- WSDL URL -->
            <div class="section">
              <h2>📋 URL do WSDL</h2>
              <p>Use esta URL para importar o WSDL diretamente no SAP, SoapUI ou qualquer SOAP client:</p>
              <div class="wsdl-url" id="wsdlUrl">https://factura-agt.vercel.app/api/wsdl</div>
              <button class="copy-btn" onclick="copyToClipboard()">📋 Copiar URL</button>
            </div>

            <!-- Download Direto -->
            <div class="download-section">
              <h3>📥 Download Direto</h3>
              <p>Ou baixe o ficheiro WSDL directamente:</p>
              <a href="/wsdl/AGT_FacturacaoElectronica_v1.wsdl" class="download-btn" download>Baixar WSDL</a>
              <a href="?format=xml" class="download-btn">Ver XML</a>
            </div>

            <!-- Instruções SAP PI/PO -->
            <div class="section">
              <h2>🔧 Importar no SAP PI/PO</h2>
              <div class="instruction">
                <strong>Pré-requisito:</strong> Ter acesso ao SAP PI/PO ou CPI (Cloud Platform Integration).
              </div>
              <ol>
                <li class="step" data-step="1">
                  <strong>Abrir SAP PI/PO</strong><br>
                  Aceda a: System Landscape → Integration Packages → Create / Edit
                </li>
                <li class="step" data-step="2">
                  <strong>New SOAP Receiver / Web Service</strong><br>
                  Vá a: Communication → Receivers → New
                </li>
                <li class="step" data-step="3">
                  <strong>Cole a URL do WSDL</strong><br>
                  <div class="code-block">https://factura-agt.vercel.app/api/wsdl</div>
                </li>
                <li class="step" data-step="4">
                  <strong>Importar e Configurar</strong><br>
                  O sistema detecta as 7 operações (registarFactura, obterEstado, etc.)
                </li>
                <li class="step" data-step="5">
                  <strong>Mapear Campos SAP → AGT</strong><br>
                  Configure o mapeamento de estrutura de dados conforme necessário.
                </li>
              </ol>
            </div>

            <!-- Instruções SoapUI -->
            <div class="section">
              <h2>🧪 Importar no SoapUI</h2>
              <ol>
                <li class="step" data-step="1"><strong>Abrir SoapUI</strong> e criar novo SOAP Project</li>
                <li class="step" data-step="2"><strong>Colar URL:</strong> <code>https://factura-agt.vercel.app/api/wsdl</code></li>
                <li class="step" data-step="3"><strong>Clicar em OK</strong> — o projeto é importado com as 7 operações</li>
                <li class="step" data-step="4"><strong>Testar operações</strong> (ex: registarFactura, obterEstado, etc.)</li>
              </ol>
            </div>

            <!-- Instruções Postman -->
            <div class="section">
              <h2>📮 Importar no Postman</h2>
              <div class="instruction">
                Postman suporta WSDL/SOAP via plugin ou conversão:
              </div>
              <ol>
                <li class="step" data-step="1"><strong>New → Request</strong></li>
                <li class="step" data-step="2"><strong>Method: POST</strong></li>
                <li class="step" data-step="3"><strong>URL:</strong> <code>https://factura-agt.vercel.app/api/soap</code></li>
                <li class="step" data-step="4">
                  <strong>Headers:</strong>
                  <div class="code-block">Content-Type: text/xml
SOAPAction: https://factura-agt.vercel.app/facturacao/v1/registarFactura</div>
                </li>
                <li class="step" data-step="5">
                  <strong>Body (raw XML)</strong> — use exemplos da documentação
                </li>
              </ol>
            </div>

            <!-- Operações -->
            <div class="section">
              <h2>📌 7 Operações Disponíveis</h2>
              <table>
                <thead>
                  <tr>
                    <th>Operação</th>
                    <th>SOAPAction</th>
                    <th>Propósito</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>registarFactura</strong></td>
                    <td>RegistarFactura</td>
                    <td>Submeter facturas (max 30/lote)</td>
                  </tr>
                  <tr>
                    <td><strong>obterEstado</strong></td>
                    <td>ObterEstado</td>
                    <td>Consultar validação por requestID</td>
                  </tr>
                  <tr>
                    <td><strong>listarFacturas</strong></td>
                    <td>ListarFacturas</td>
                    <td>Listar facturas (período)</td>
                  </tr>
                  <tr>
                    <td><strong>consultarFactura</strong></td>
                    <td>ConsultarFactura</td>
                    <td>Detalhe de um documento</td>
                  </tr>
                  <tr>
                    <td><strong>solicitarSerie</strong></td>
                    <td>SolicitarSerie</td>
                    <td>Pedir nova série numeração</td>
                  </tr>
                  <tr>
                    <td><strong>listarSeries</strong></td>
                    <td>ListarSeries</td>
                    <td>Listar séries existentes</td>
                  </tr>
                  <tr>
                    <td><strong>validarDocumento</strong></td>
                    <td>ValidarDocumento</td>
                    <td>Confirmar/rejeitar documento</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Info -->
            <div class="section">
              <h2>ℹ️ Informações Técnicas</h2>
              <div class="info-box">
                <strong>🔐 Segurança:</strong> Assinaturas JWS RS256 + autenticação JWT (conforme configuração)
              </div>
              <div class="info-box">
                <strong>📊 Conformidade:</strong> Decreto Executivo 683/25 • Decreto Presidencial 71/25
              </div>
              <div class="success-box">
                <strong>✅ Status:</strong> Sistema pronto para testes com mock service. Quando AGT ativar o portal, altere apenas a configuração do endpoint.
              </div>
            </div>

            <!-- Documentação -->
            <div class="section">
              <h2>📚 Documentação Completa</h2>
              <p>Para exemplos detalhados de requests/responses, confira:</p>
              <ul style="margin-left: 20px; margin-top: 10px;">
                <li><strong>Markdown:</strong> <code>/DOCUMENTACAO_TECNICA_COMPLETA.md</code></li>
                <li><strong>WSDL Completo:</strong> <code>/api/wsdl</code> (este endpoint)</li>
                <li><strong>Tipos TypeScript:</strong> <code>lib/types/agt-official.ts</code></li>
                <li><strong>Mock Service:</strong> <code>lib/server/agtMockService.ts</code></li>
              </ul>
            </div>
          </div>

          <div class="footer">
            <p>AGT Facturação Electrónica Middleware v1.0.0 • Construído com Next.js 14</p>
            <p style="margin-top: 10px; font-size: 12px; opacity: 0.7;">Para suporte: contacte o departamento técnico</p>
          </div>
        </div>

        <script>
          function copyToClipboard() {
            const url = document.getElementById('wsdlUrl').textContent;
            navigator.clipboard.writeText(url).then(() => {
              alert('✅ URL copiada para clipboard!\\n\\n' + url);
            }).catch(() => {
              alert('URL: ' + url);
            });
          }
        </script>
      </body>
    </html>
  `;

  return new NextResponse(htmlPage, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
