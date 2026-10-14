import { apiGet } from '../../../../lib/api';
import { routes, type NationalEmissionReading } from '@delta-signal/contracts';
import { pivotByYear, toCsv } from '../../../../lib/emissions';

/** Yearly emissions table as CSV (all years, Mt CO2e). */
export async function GET() {
  const readings = await apiGet<NationalEmissionReading[]>(routes.emissions.list, 900);
  return new Response(toCsv(pivotByYear(readings)), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="bangladesh-ghg-emissions.csv"',
    },
  });
}
