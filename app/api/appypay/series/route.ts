/**
 * =============================================================================
 * API ROUTE - APPYPAY SÉRIES
 * =============================================================================
 * 
 * Gestão de séries fiscais AppyPay.
 * - GET: Lista séries
 * - POST: Cria nova série
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAppyPayProvider } from '@/lib/providers/appypay';
import type { CreateSeriesRequest } from '@/lib/providers/types';

export const dynamic = 'force-dynamic';

/**
 * GET - Lista séries fiscais
 */
export async function GET(request: NextRequest) {
  try {
    const provider = getAppyPayProvider();
    const series = await provider.listSeries();
    
    return NextResponse.json({
      success: true,
      series,
      count: series.length,
    });
  } catch (error) {
    console.error('[API AppyPay Series] Erro ao listar:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      series: [],
    }, { status: 500 });
  }
}

/**
 * POST - Cria nova série fiscal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar payload
    const year = body.year || new Date().getFullYear();
    const documentType = body.documentType || 'FT';
    
    const createRequest: CreateSeriesRequest = {
      year,
      documentType,
      establishmentNumber: body.establishmentNumber || 'SEDE',
      contingencyIndicator: body.contingencyIndicator || 'N',
    };
    
    console.log('[API AppyPay Series] Criando série:', createRequest);
    
    const provider = getAppyPayProvider();
    const result = await provider.createSeries(createRequest);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        seriesCode: result.seriesCode,
        message: `Série ${result.seriesCode} criada com sucesso`,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Erro ao criar série',
        rawResponse: result.rawResponse,
      }, { status: 400 });
    }
  } catch (error) {
    console.error('[API AppyPay Series] Erro ao criar:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}
