'use client'

import { ResponsiveContainer, BarChart, Bar, CartesianGrid, Tooltip, XAxis, YAxis, Legend } from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export type ChartFacturasMesData = {
  month: string
  count: number
  revenue?: number
}

type ChartFacturasMesProps = {
  data: ChartFacturasMesData[]
}

export function ChartFacturasMes({ data }: ChartFacturasMesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Facturas por mês</CardTitle>
        <CardDescription>Distribuição de documentos emitidos</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
            <Legend />
            <Bar dataKey="count" fill="hsl(var(--primary))" name="Facturas" radius={[4, 4, 0, 0]} />
            {data.some((item) => typeof item.revenue === 'number') && (
              <Bar dataKey="revenue" fill="hsl(var(--secondary))" name="Receita" radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
