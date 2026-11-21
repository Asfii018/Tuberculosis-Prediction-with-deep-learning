import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartEntry = {
  date: string;
  normal: number;
  tuberculosis: number;
};

function AnalysisChart({ data }: { data: ChartEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        barGap={5}
        margin={{ top: 8, right: 4, left: -22, bottom: 0 }}
      >
        <CartesianGrid stroke="#eef2f6" vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "#8290a1" }}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "#8290a1" }}
        />
        <Tooltip cursor={{ fill: "#f6f9fc" }} />
        <Bar dataKey="normal" name="Normal" fill="#64a890" radius={[4, 4, 0, 0]} />
        <Bar
          dataKey="tuberculosis"
          name="Tuberculosis"
          fill="#d89a6b"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default AnalysisChart;
