import { NextResponse } from 'next/server';
import os from 'os';

let lastCpuSample = { idle: 0, total: 0 };

function getCpuAverage() {
  const cpus = os.cpus() || [];
  if (cpus.length === 0) return { idle: 0, total: 0 };
  let idleMs = 0;
  let totalMs = 0;
  
  cpus.forEach((core) => {
    idleMs += core.times.idle;
    totalMs += core.times.user + core.times.nice + core.times.sys + core.times.idle + core.times.irq;
  });

  return { 
    idle: idleMs / cpus.length, 
    total: totalMs / cpus.length 
  };
}

// Seed the initial sample
if (lastCpuSample.total === 0) {
  lastCpuSample = getCpuAverage();
}

export async function GET() {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = Math.round((usedMem / totalMem) * 100);

    // Calculate real CPU usage percentage since last poll
    const currentSample = getCpuAverage();
    const idleDiff = currentSample.idle - lastCpuSample.idle;
    const totalDiff = currentSample.total - lastCpuSample.total;
    
    let cpuPercent = 0;
    if (totalDiff > 0) {
      cpuPercent = Math.round(100 - (100 * idleDiff) / totalDiff);
      if (cpuPercent < 0) cpuPercent = 0;
      if (cpuPercent > 100) cpuPercent = 100;
    }
    
    // Store current for next request
    lastCpuSample = currentSample;

    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    return NextResponse.json({
      memory: {
        totalGB: (totalMem / 1024 / 1024 / 1024).toFixed(1),
        usedGB: (usedMem / 1024 / 1024 / 1024).toFixed(1),
        percent: memPercent,
      },
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        speed: cpus[0]?.speed || 0,
        loadAvg,
        percent: cpuPercent,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
