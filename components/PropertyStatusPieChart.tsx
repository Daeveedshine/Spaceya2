import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface StatusData {
  name: string;
  value: number;
}

const COLORS = ['#000000', '#52525b', '#71717a', '#a1a1aa'];

export default function PropertyStatusPieChart({ data }: { data: StatusData[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={70}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{backgroundColor: '#000', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px'}}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
