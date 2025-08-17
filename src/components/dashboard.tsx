
'use client';

import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import type { DentalCase } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useMemo } from 'react';
import { Users, ClipboardCheck } from 'lucide-react';


const ToothIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9.34 2.126a3.5 3.5 0 0 1 5.32 0l.223.245a3.5 3.5 0 0 1 .53 4.28l-1.22 2.032a2 2 0 0 0-.28 1.634l.394 2.368a2 2 0 0 1-1.033 2.29l-1.575.908a2 2 0 0 1-2.228 0l-1.574-.908a2 2 0 0 1-1.033-2.29l.394-2.368a2 2 0 0 0-.28-1.634L7.4 6.65a3.5 3.5 0 0 1 .53-4.28l.223-.245Z" />
      <path d="M20 12l-1.55 4.34a2 2 0 0 1-1.8 1.36h-9.3a2 2 0 0 1-1.8-1.36L4 12" />
      <path d="M16 18a4 4 0 0 0-8 0" />
    </svg>
  );

interface DashboardProps {
  cases: DentalCase[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];

export default function Dashboard({ cases }: DashboardProps) {
  const stats = useMemo(() => {
    if (!cases) return {
        totalTeeth: 0,
        casesByDentist: [],
        materialUsage: [],
        teethByMaterial: [],
    };

    const casesByDentist = cases.reduce((acc, c) => {
      acc[c.dentistName] = (acc[c.dentistName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const materialUsage = cases.reduce((acc, c) => {
        const materials = c.material.split(',').map(m => m.trim()).filter(m => m);
        materials.forEach(material => {
            acc[material] = (acc[material] || 0) + 1;
        });
        return acc;
    }, {} as Record<string, number>);

    const teethByMaterial = cases.reduce((acc, c) => {
        const toothCountInCase = c.toothNumbers.split(',').filter(t => t.trim() !== '').length;
        const materials = c.material.split(',').map(m => m.trim()).filter(m => m);
        materials.forEach(material => {
            acc[material] = (acc[material] || 0) + toothCountInCase;
        });
        return acc;
    }, {} as Record<string, number>);
    
    const totalTeeth = cases.reduce((sum, c) => {
        const toothCount = c.toothNumbers.split(',').filter(t => t.trim() !== '').length;
        return sum + toothCount;
    }, 0);


    return {
        totalTeeth,
        casesByDentist: Object.entries(casesByDentist).map(([name, value]) => ({ name, cases: value })),
        materialUsage: Object.entries(materialUsage).map(([name, value]) => ({ name, count: value })),
        teethByMaterial: Object.entries(teethByMaterial).map(([name, value]) => ({ name, units: value })),
    }

  }, [cases]);


  if (cases.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Units</CardTitle>
                <ToothIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats.totalTeeth}</div>
                <p className="text-xs text-muted-foreground">Across all cases</p>
            </CardContent>
        </Card>
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Cases per Dentist</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stats.casesByDentist}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="cases" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Case Count by Material</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                     <BarChart data={stats.materialUsage} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={80} fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]}/>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
         <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle>Unit Count by Material</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                     <BarChart data={stats.teethByMaterial} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={80} fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="units" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]}/>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    </div>
  );
}
