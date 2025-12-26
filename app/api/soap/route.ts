/**
 * =============================================================================
 * ENDPOINT SOAP - INTEGRAÇÃO SAP
 * =============================================================================
 * 
 * Este endpoint recebe requests SOAP do SAP e converte para os serviços REST internos.
 * Suporta todas as 7 operações AGT via SOAP.
 * 
 * SOAPAction Headers suportados:
 * - http://agt.gov.ao/services/facturacao/RegistarFactura
 * - http://agt.gov.ao/services/facturacao/ObterEstado
 * - http://agt.gov.ao/services/facturacao/ListarFacturas
 * - http://agt.gov.ao/services/facturacao/ConsultarFactura
 * - http://agt.gov.ao/services/facturacao/SolicitarSerie
 * - http://agt.gov.ao/services/facturacao/ListarSeries
 * - http://agt.gov.ao/services/facturacao/ValidarDocumento
 */

import { NextRequest, NextResponse } from 'next/server';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { AGTMockService } from '@/lib/server/agtMockService';
import {
  registarFacturaRequest,
  obterEstadoRequest,
  listarFacturasRequest,
  consultarFacturaRequest,
  solicitarSerieRequest,
  listarSeriesRequest,
  validarDocumentoRequest,
  zodToErrorList,
  normalizeSoftwareInfo,
} from '@/lib/schemas'
import { ZodError } from 'zod'

export const dynamic = 'force-dynamic';

// =============================================================================
// CONFIGURAÇÃO XML PARSER
// =============================================================================

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  // Manter valores como strings para evitar conversões automáticas (ex: "1" -> 1)
  // e permitir parsing controlado nas funções de conversão.
  parseTagValue: false,
  trimValues: true,
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  indentBy: '  ',
});

// =============================================================================
// NAMESPACE SOAP
// =============================================================================

const SOAP_NS = 'http://schemas.xmlsoap.org/soap/envelope/';
const AGT_NS = 'http://agt.minfin.gov.ao/facturacao/v1';

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Extrai a operação do SOAPAction header ou do body
 * Normaliza o nome para camelCase (ex: RegistarFactura -> registarFactura)
 */
function extractOperation(soapAction: string | null, body: any): string | null {
  if (soapAction) {
    const match = soapAction.match(/\/([^\/]+)$/);
    if (match) {
      const opRaw = match[1].replace(/"/g, '');
      return opRaw.charAt(0).toLowerCase() + opRaw.slice(1);
    }
  }

  // Tentar extrair do body (cobre variações de capitalização / namespaces)
  if (body?.Envelope?.Body) {
    const bodyContent = body.Envelope.Body;
    const keys = Object.keys(bodyContent || {});
    for (const k of keys) {
      if (k.toLowerCase().endsWith('request')) {
        const opName = k.slice(0, -'Request'.length);
        return opName.charAt(0).toLowerCase() + opName.slice(1);
      }
    }
  }

  return null;
}

/**
 * Extrai dados do request SOAP
 */
function extractRequestData(body: any, operation: string): any {
  const bodyContent = body?.Envelope?.Body;
  if (!bodyContent) return null;

  const requestKey = `${operation}Request`;
  // Se existir a chave exacta (camelCase), retorna-a
  if (bodyContent[requestKey]) return bodyContent[requestKey];

  // Se o body tiver um único filho, assume que é o request (cobre RegistarFacturaRequest com capitalização)
  const keys = Object.keys(bodyContent);
  if (keys.length === 1) {
    const single = bodyContent[keys[0]];
    if (single && typeof single === 'object') return single;
  }

  // Tenta encontrar qualquer filho que termine em 'Request' (case-insensitive)
  for (const k of keys) {
    if (k.toLowerCase().endsWith('request')) {
      return bodyContent[k];
    }
  }

  return bodyContent;
}

/**
 * Converte array XML para array JS (fast-xml-parser às vezes retorna objeto único)
 */
function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Converte dados SOAP para formato JSON do serviço
 */
function findField(obj: any, name: string) {
  if (!obj || typeof obj !== 'object') return undefined;
  const target = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const k of Object.keys(obj)) {
    const kn = String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (kn === target) return obj[k];
  }
  return undefined;
}

function convertSoapToJson(data: any, operation: string): any {
  switch (operation) {
    case 'registarFactura': {
      const docs = ensureArray(data.documents?.document || data.documents).map(convertDocument);
      return {
        schemaVersion: findField(data, 'schemaVersion') || data.schemaVersion || '1.0.0',
        taxRegistrationNumber: findField(data, 'taxRegistrationNumber') || data.taxRegistrationNumber,
        submissionTimeStamp: findField(data, 'submissionTimeStamp') || data.submissionTimeStamp || new Date().toISOString(),
        submissionGUID: findField(data, 'submissionGUID') || data.submissionGUID || crypto.randomUUID(),
        softwareInfo: convertSoftwareInfo(data.softwareInfo),
        numberOfEntries: (findField(data, 'numberOfEntries') || data.numberOfEntries) ? parseInt(findField(data, 'numberOfEntries') || data.numberOfEntries) : docs.length,
        documents: docs,
      };
    }

    case 'obterEstado':
      return {
        schemaVersion: findField(data, 'schemaVersion') || data.schemaVersion || '1.0.0',
        taxRegistrationNumber: findField(data, 'taxRegistrationNumber') || data.taxRegistrationNumber,
        requestID: findField(data, 'requestID') || data.requestID,
        submissionTimeStamp: findField(data, 'submissionTimeStamp') || data.submissionTimeStamp || new Date().toISOString(),
        jwsSignature: findField(data, 'jwsSignature') || data.jwsSignature || '',
        softwareInfo: convertSoftwareInfo(data.softwareInfo),
      };
      
    case 'listarFacturas':
      return {
        schemaVersion: data.schemaVersion || '1.0.0',
        taxRegistrationNumber: data.taxRegistrationNumber,
        queryStartDate: data.queryStartDate || data.startDate,
        queryEndDate: data.queryEndDate || data.endDate,
        jwsSignature: data.jwsSignature || '',
        softwareInfo: convertSoftwareInfo(data.softwareInfo),
      };
      
    case 'consultarFactura':
      return {
        schemaVersion: data.schemaVersion || '1.0.0',
        taxRegistrationNumber: data.taxRegistrationNumber,
        documentNo: data.documentNo,
        jwsSignature: data.jwsSignature || '',
        softwareInfo: convertSoftwareInfo(data.softwareInfo),
      };
      
    case 'solicitarSerie':
      return {
        schemaVersion: data.schemaVersion || '1.0.0',
        taxRegistrationNumber: data.taxRegistrationNumber,
        seriesCode: data.seriesCode,
        seriesYear: data.seriesYear,
        documentType: data.documentType,
        firstDocumentNumber: data.firstDocumentNumber,
        jwsSignature: data.jwsSignature || '',
        softwareInfo: convertSoftwareInfo(data.softwareInfo),
      };
      
    case 'listarSeries':
      return {
        schemaVersion: data.schemaVersion || '1.0.0',
        taxRegistrationNumber: data.taxRegistrationNumber,
        seriesCode: data.seriesCode,
        seriesYear: data.seriesYear,
        documentType: data.documentType,
        jwsSignature: data.jwsSignature || '',
        softwareInfo: convertSoftwareInfo(data.softwareInfo),
      };
      
    case 'validarDocumento':
      return {
        schemaVersion: data.schemaVersion || '1.0.0',
        taxRegistrationNumber: data.taxRegistrationNumber,
        documentNo: data.documentNo,
        emitterTaxRegistrationNumber: data.emitterTaxRegistrationNumber,
        action: data.action,
        rejectionReason: data.rejectionReason,
        jwsSignature: data.jwsSignature || '',
        softwareInfo: convertSoftwareInfo(data.softwareInfo),
      };
      
    default:
      return data;
  }
}

/**
 * Converte softwareInfo do formato SOAP
 */
function convertSoftwareInfo(info: any): any {
  if (!info) {
    return {
      softwareInfoDetail: {
        productId: 'SAP',
        productVersion: '1.0.0',
        softwareValidationNumber: 'AGT/2025/SAP',
      },
      jwsSoftwareSignature: '',
    };
  }
  
  return {
    softwareInfoDetail: {
      productId: info.softwareInfoDetail?.productId || info.productId || 'SAP',
      productVersion: info.softwareInfoDetail?.productVersion || info.productVersion || '1.0.0',
      softwareValidationNumber: info.softwareInfoDetail?.softwareValidationNumber || info.softwareValidationNumber || '',
    },
    jwsSoftwareSignature: info.jwsSoftwareSignature || '',
  };
}

/**
 * Converte documento do formato SOAP para JSON
 */
function convertDocument(doc: any): any {
  return {
    documentNo: doc.documentNo,
    documentType: doc.documentType,
    documentStatus: doc.documentStatus || 'N',
    documentDate: doc.documentDate,
    seriesID: doc.seriesID,
    systemEntryDate: doc.systemEntryDate || new Date().toISOString(),
    transactionID: doc.transactionID,
    customerTaxID: doc.customerTaxID,
    customerCountry: doc.customerCountry || 'AO',
    companyName: doc.companyName,
    eacCode: doc.eacCode || doc.eaccode || undefined,
    lines: ensureArray(doc.lines?.line || doc.lines).map(convertLine),
    documentTotals: convertTotals(doc.documentTotals),
    paymentReceipt: doc.paymentReceipt ? convertPaymentReceipt(doc.paymentReceipt) : undefined,
    withholdingTax: doc.withholdingTax ? ensureArray(doc.withholdingTax.tax || doc.withholdingTax).map(convertWithholding) : undefined,
    referenceInfo: doc.referenceInfo ? convertReferenceInfo(doc.referenceInfo) : undefined,
    cancelInfo: doc.cancelInfo ? convertCancelInfo(doc.cancelInfo) : undefined,
    jwsDocumentSignature: doc.jwsDocumentSignature || '',
  };
}

/**
 * Converte linha do documento
 */
function convertLine(line: any): any {
  return {
    lineNo: parseInt(line.lineNo) || 1,
    productCode: line.productCode,
    productDescription: line.productDescription,
    quantity: parseFloat(line.quantity) || 1,
    unitOfMeasure: line.unitOfMeasure || 'UN',
    unitPrice: parseFloat(line.unitPrice) || 0,
    unitPriceBase: line.unitPriceBase ? parseFloat(line.unitPriceBase) : undefined,
    taxPointDate: line.taxPointDate,
    settlementAmount: line.settlementAmount ? parseFloat(line.settlementAmount) : undefined,
    taxes: ensureArray(line.taxes?.tax || line.taxLines?.taxLine || line.taxes || line.taxLines).map(convertTaxLine),
  };
}

/**
 * Converte linha de imposto
 */
function convertTaxLine(tax: any): any {
  return {
    taxType: tax.taxType || 'IVA',
    taxCountryRegion: tax.taxCountryRegion || tax.country || 'AO',
    taxCode: tax.taxCode || 'NOR',
    taxPercentage: parseFloat(tax.taxPercentage) || 14,
    taxBase: parseFloat(tax.taxBase) || 0,
    taxAmount: parseFloat(tax.taxAmount) || 0,
    taxExemptionReason: tax.taxExemptionReason,
    taxExemptionCode: tax.taxExemptionCode,
  };
}

/**
 * Converte totais do documento
 */
function convertTotals(totals: any): any {
  const res: any = {
    taxPayable: parseFloat(totals?.taxPayable || '0') || 0,
    netTotal: parseFloat(totals?.netTotal || '0') || 0,
    grossTotal: parseFloat(totals?.grossTotal || '0') || 0,
  };

  if (totals && totals.currency) {
    if (typeof totals.currency === 'string') {
      // Interpretar string como currencyCode
      res.currency = { currencyCode: totals.currency, currencyAmount: 0, exchangeRate: 0 };
    } else if (typeof totals.currency === 'object') {
      res.currency = {
        currencyCode: totals.currency.currencyCode || totals.currency.code || undefined,
        currencyAmount: parseFloat(totals.currency.currencyAmount || '0') || 0,
        exchangeRate: parseFloat(totals.currency.exchangeRate || '0') || 0,
      };
    }
  }

  return res;
}

/**
 * Converte recibo de pagamento
 */
function convertPaymentReceipt(receipt: any): any {
  return {
    paymentMechanism: receipt.paymentMechanism || 'NU',
    paymentAmount: parseFloat(receipt.paymentAmount) || 0,
    paymentDate: receipt.paymentDate,
    sourceDocuments: ensureArray(receipt.sourceDocuments?.sourceDocument || receipt.sourceDocuments).map((sd: any) => ({
      originatingON: sd.originatingON,
      invoiceDate: sd.invoiceDate,
      description: sd.description,
    })),
  };
}

/**
 * Converte retenção na fonte
 */
function convertWithholding(wt: any): any {
  return {
    withholdingTaxType: wt.withholdingTaxType,
    withholdingTaxDescription: wt.withholdingTaxDescription,
    withholdingTaxAmount: parseFloat(wt.withholdingTaxAmount) || 0,
  };
}

/**
 * Converte informação de referência
 */
function convertReferenceInfo(ref: any): any {
  return {
    referenceNo: ref.referenceNo,
    referenceDate: ref.referenceDate,
    reason: ref.reason,
  };
}

/**
 * Converte informação de cancelamento
 */
function convertCancelInfo(cancel: any): any {
  return {
    cancelReason: cancel.cancelReason,
    cancelDate: cancel.cancelDate,
  };
}

/**
 * Constrói resposta SOAP de sucesso
 */
function buildSoapResponse(operation: string, result: any): string {
  const responseElement = `${operation}Response`;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="${SOAP_NS}" xmlns:fact="${AGT_NS}">
  <soap:Header/>
  <soap:Body>
    <fact:${responseElement}>
      ${jsonToXmlContent(result)}
    </fact:${responseElement}>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Constrói resposta SOAP de erro
 */
function buildSoapFault(code: string, message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="${SOAP_NS}">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:${code}</faultcode>
      <faultstring>${escapeXml(message)}</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Converte JSON para conteúdo XML
 */
function jsonToXmlContent(obj: any, indent: string = '      '): string {
  if (obj === null || obj === undefined) return '';
  
  if (typeof obj !== 'object') {
    return escapeXml(String(obj));
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => jsonToXmlContent(item, indent)).join('\n');
  }
  
  let xml = '';
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    
    if (Array.isArray(value)) {
      for (const item of value) {
        xml += `${indent}<fact:${key}>\n${jsonToXmlContent(item, indent + '  ')}\n${indent}</fact:${key}>\n`;
      }
    } else if (typeof value === 'object') {
      xml += `${indent}<fact:${key}>\n${jsonToXmlContent(value, indent + '  ')}\n${indent}</fact:${key}>\n`;
    } else {
      xml += `${indent}<fact:${key}>${escapeXml(String(value))}</fact:${key}>\n`;
    }
  }
  
  return xml;
}

/**
 * Escapa caracteres especiais XML
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}



// =============================================================================
// SERVIÇO MOCK (AGTMockService é um objeto, não classe)
// =============================================================================

const mockService = AGTMockService;

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * GET - Retorna o WSDL
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Se pedir ?wsdl, retorna o WSDL
  if (searchParams.has('wsdl') || searchParams.has('WSDL')) {
    try {
      const fs = await import('fs/promises')
      const path = await import('path')

      // Try a list of known WSDL filenames (fallbacks) to be resilient on deploy
      const candidates = [
        'AGT_FacturacaoElectronica_v1.wsdl',
        'AGT_FacturaService_v2.wsdl',
        'AGT_FacturaService.wsdl',
      ]
      const base = path.join(process.cwd(), 'public', 'wsdl')
      let wsdlContent: string | null = null
      let foundFile: string | null = null
      for (const c of candidates) {
        const p = path.join(base, c)
        try {
          wsdlContent = await fs.readFile(p, 'utf-8')
          foundFile = c
          break
        } catch (err) {
          // ignore and try next
        }
      }

      if (!wsdlContent) {
        // fallback para WSDL embutido em tempo de build
        try {
          const { getBuiltWsdl } = await import('@/lib/wsdl');
          const built = getBuiltWsdl();
          if (built && built.trim().length > 0) {
            return new NextResponse(built, {
              status: 200,
              headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'X-AGT-WSDL-Source': 'built-inline',
              },
            });
          }
        } catch (e) {
          // ignore and continue to throw
        }
        throw new Error('WSDL não encontrado em /public/wsdl (candidatos: ' + candidates.join(', ') + ')')
      }

      // Return the found WSDL
      return new NextResponse(wsdlContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'X-AGT-WSDL-Source': foundFile ?? 'unknown',
        },
      })
    } catch (error) {
      console.error('WSDL serve error:', (error as Error).message)
      return new NextResponse(buildSoapFault('Server', 'WSDL não encontrado'), {
        status: 500,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      })
    }
  }
  
  // Caso contrário, retorna info do serviço
  return NextResponse.json({
    service: 'AGT Facturação Electrónica SOAP Service',
    version: '1.0.0',
    wsdl: '/api/soap?wsdl',
    operations: [
      'registarFactura',
      'obterEstado',
      'listarFacturas',
      'consultarFactura',
      'solicitarSerie',
      'listarSeries',
      'validarDocumento',
    ],
    documentation: '/DOCUMENTACAO_TECNICA_COMPLETA.md',
  });
}

/**
 * POST - Processa requests SOAP
 */
export async function POST(request: NextRequest) {
  try {
    // Obter SOAPAction do header
    const soapAction = request.headers.get('SOAPAction');
    const contentType = request.headers.get('Content-Type') || '';
    
    // Validar content type
    if (!contentType.includes('xml') && !contentType.includes('soap')) {
      return new NextResponse(
        buildSoapFault('Client', 'Content-Type deve ser text/xml ou application/soap+xml'),
        {
          status: 400,
          headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        }
      );
    }
    
    // Ler e parsear XML
    const xmlBody = await request.text();
    
    if (!xmlBody || xmlBody.trim() === '') {
      return new NextResponse(
        buildSoapFault('Client', 'Body XML vazio'),
        {
          status: 400,
          headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        }
      );
    }
    
    let parsedBody: any;
    try {
      parsedBody = xmlParser.parse(xmlBody);
    } catch (parseError) {
      return new NextResponse(
        buildSoapFault('Client', 'XML inválido: ' + (parseError as Error).message),
        {
          status: 400,
          headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        }
      );
    }
    
    // Extrair operação
    const operation = extractOperation(soapAction, parsedBody);
    
    if (!operation) {
      return new NextResponse(
        buildSoapFault('Client', 'Operação não identificada. Use SOAPAction header ou elemento correcto no Body.'),
        {
          status: 400,
          headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        }
      );
    }
    
    // Extrair dados do request
    const requestData = extractRequestData(parsedBody, operation);
    
    if (!requestData) {
      return new NextResponse(
        buildSoapFault('Client', 'Dados do request não encontrados'),
        {
          status: 400,
          headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        }
      );
    }
    
    // Converter para JSON
    const jsonRequest = convertSoapToJson(requestData, operation);
    // Normalizar softwareInfo se necessário
    try { normalizeSoftwareInfo(jsonRequest) } catch (err) {}
    // Validar a estrutura com Zod conforme operação
    try {
      switch (operation) {
        case 'registarFactura':
          registarFacturaRequest.parse(jsonRequest)
          break
        case 'obterEstado':
          obterEstadoRequest.parse(jsonRequest)
          break
        case 'listarFacturas':
          listarFacturasRequest.parse(jsonRequest)
          break
        case 'consultarFactura':
          consultarFacturaRequest.parse(jsonRequest)
          break
        case 'solicitarSerie':
          solicitarSerieRequest.parse(jsonRequest)
          break
        case 'listarSeries':
          listarSeriesRequest.parse(jsonRequest)
          break
        case 'validarDocumento':
          validarDocumentoRequest.parse(jsonRequest)
          break
        default:
          break
      }
    } catch (e: any) {
      if (e instanceof ZodError) {
        const errorList = zodToErrorList(e);
        // Log details to server console to aid debugging
        try { console.error('SOAP validation failed', { operation, jsonRequest, errorList }) } catch (err) {}
        return new NextResponse(
          buildSoapFault('Client', 'E96: solicitação mal efectuada - ' + JSON.stringify(errorList)),
          {
            status: 400,
            headers: { 'Content-Type': 'application/xml; charset=utf-8' },
          }
        )
      }
    }
    
    // Executar operação
    let result: any;
    
    try {
      // Log curto do request para depuração (limitado)
      try { if (operation === 'registarFactura') console.log('SOAP jsonRequest:', JSON.stringify(jsonRequest, null, 2).slice(0, 2000)); } catch (e) {}

      switch (operation) {
        case 'registarFactura':
        case 'RegistarFactura':
          result = await mockService.registarFactura(jsonRequest);
          break;
          
        case 'obterEstado':
        case 'ObterEstado':
          result = await mockService.obterEstado(jsonRequest);
          break;
          
        case 'listarFacturas':
        case 'ListarFacturas':
          result = await mockService.listarFacturas(jsonRequest);
          break;
          
        case 'consultarFactura':
        case 'ConsultarFactura':
          result = await mockService.consultarFactura(jsonRequest);
          break;
          
        case 'solicitarSerie':
        case 'SolicitarSerie':
          result = await mockService.solicitarSerie(jsonRequest);
          break;
          
        case 'listarSeries':
        case 'ListarSeries':
          result = await mockService.listarSeries(jsonRequest);
          break;
          
        case 'validarDocumento':
        case 'ValidarDocumento':
          result = await mockService.validarDocumento(jsonRequest);
          break;
          
        default:
          return new NextResponse(
            buildSoapFault('Client', `Operação desconhecida: ${operation}`),
            {
              status: 400,
              headers: { 'Content-Type': 'application/xml; charset=utf-8' },
            }
          );
      }
    } catch (serviceError) {
      return new NextResponse(
        buildSoapFault('Server', 'Erro no serviço: ' + (serviceError as Error).message),
        {
          status: 500,
          headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        }
      );
    }
    
    // Se o serviço devolveu erro, anexa debug curto para diagnóstico
    try {
      if (result && result.httpStatus && result.httpStatus !== 200) {
        result.response = result.response || {};
        result.response._debug = { jsonRequest: JSON.parse(JSON.stringify(jsonRequest)) };
      }
    } catch (err) {}

    // Construir resposta SOAP
    const soapResponse = buildSoapResponse(operation, result);
    
    return new NextResponse(soapResponse, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
    
  } catch (error) {
    console.error('SOAP Error:', error);
    return new NextResponse(
      buildSoapFault('Server', 'Erro interno: ' + (error as Error).message),
      {
        status: 500,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      }
    );
  }
}
