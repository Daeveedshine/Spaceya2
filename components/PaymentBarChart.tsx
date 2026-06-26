import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PaymentData {
  name: string;
  amount: number;
}

export default function PaymentBarChart({ data }: { data: PaymentData[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.03)" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#444', fontSize: 9, fontWeight: '900'}} />
        <YAxis axisLine={false} tickLine={false} tick={{fill: '#444', fontSize: 9, fontWeight: '900'}} />
        <Tooltip 
          cursor={{fill: 'rgba(255,255,255,0.03)'}}
          contentStyle={{backgroundColor: '#000', border: '1px solid #333', borderRadius: '12px', padding: '12px'}}
        />
        <Bar dataKey="amount" fill="#FFF" radius={[2, 2, 0, 0]} barSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
