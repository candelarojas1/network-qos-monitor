import { matchFont } from '@shopify/react-native-skia';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { CartesianChart, Line, Scatter } from 'victory-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Fuente del sistema para las etiquetas de los ejes (Skia necesita un SkFont).
const font = matchFont({ fontFamily: 'Helvetica', fontSize: 11 });

// Hasta dos series por gráfico: "a" y "b".
export type SeriesKey = 'a' | 'b';
export type Series = { key: SeriesKey; label: string; color: string };

// Cada fila: minutos desde el inicio de la sesión ("t") y el valor de cada serie (null si no hay dato).
export type ChartRow = { t: number; a: number | null; b: number | null };

type Props = {
  title: string;
  unit: string;
  data: ChartRow[];
  series: Series[];
};

// Gráfico de línea con puntos: una o dos series contra el tiempo de la sesión.
export function TimeSeriesChart({ title, unit, data, series }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <View style={styles.legend}>
        {series.map((s) => (
          <ThemedText key={s.key} type="small" style={{ color: s.color }}>
            {s.label} ({unit})
          </ThemedText>
        ))}
      </View>
      {data.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Sin datos para graficar.
        </ThemedText>
      ) : (
        <View style={styles.chart}>
          <CartesianChart
            data={data}
            xKey="t"
            yKeys={series.map((s) => s.key)}
            domainPadding={{ left: 12, right: 12, top: 16 }}
            domain={{ y: [0] }}
            xAxis={{
              font,
              labelColor: theme.textSecondary,
              lineColor: theme.backgroundSelected,
              tickCount: 5,
              formatXLabel: (v) => `${Number(v).toFixed(1)} min`,
            }}
            yAxis={[{ font, labelColor: theme.textSecondary, lineColor: theme.backgroundSelected }]}>
            {({ points }) =>
              series.map((s) => (
                <Fragment key={s.key}>
                  <Line points={points[s.key]} color={s.color} strokeWidth={2} connectMissingData />
                  <Scatter points={points[s.key]} color={s.color} radius={3} />
                </Fragment>
              ))
            }
          </CartesianChart>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  legend: { flexDirection: 'row', gap: Spacing.three },
  chart: { height: 200 },
});
