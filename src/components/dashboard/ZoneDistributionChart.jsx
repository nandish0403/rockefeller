import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { brandTokens } from '../../theme';

const COLORS = [brandTokens.risk.green, brandTokens.risk.yellow, brandTokens.risk.orange, brandTokens.risk.red];

export const ZoneDistributionChart = ({ distribution = { green: 0, yellow: 0, orange: 0, red: 0 } }) => {
  const data = [
    { name: 'Safe', value: distribution?.green || 0 },
    { name: 'Caution', value: distribution?.yellow || 0 },
    { name: 'High', value: distribution?.orange || 0 },
    { name: 'Critical', value: distribution?.red || 0 },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default ZoneDistributionChart;
