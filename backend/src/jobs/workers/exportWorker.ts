import { Job } from 'bullmq';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { ExportJobPayload } from '../../lib/queue';
import { putObjectBuffer } from '../../lib/s3';
import { isS3Configured } from '../../lib/scan';

const prisma = new PrismaClient();

export async function handleExportJob(job: Job<ExportJobPayload>) {
  const { jobId, format, dataset } = job.data;
  await prisma.exportJob.update({ where: { id: jobId }, data: { status: 'running' } });
  try {
    const rows = await loadDataset(dataset);
    let buffer: Buffer;
    let contentType: string;
    let ext: string;
    if (format === 'xlsx') {
      buffer = await toExcel(dataset, rows);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      ext = 'xlsx';
    } else {
      buffer = await toPdf(dataset, rows);
      contentType = 'application/pdf';
      ext = 'pdf';
    }
    let fileKey: string;
    if (isS3Configured()) {
      fileKey = `exports/${jobId}.${ext}`;
      await putObjectBuffer(fileKey, buffer, contentType);
    } else {
      const dir = join(process.cwd(), 'storage', 'exports');
      mkdirSync(dir, { recursive: true });
      const path = join(dir, `${jobId}.${ext}`);
      writeFileSync(path, buffer);
      fileKey = `local:${path}`;
    }
    await prisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'complete', fileKey },
    });
  } catch (err) {
    await prisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'failed', error: err instanceof Error ? err.message : 'export failed' },
    });
    throw err;
  }
}

async function loadDataset(dataset: string): Promise<Record<string, unknown>[]> {
  if (dataset === 'teams') {
    const teams = await prisma.team.findMany({ include: { leader: true, problemStatement: true } });
    return teams.map((t) => ({
      teamCode: t.teamCode,
      name: t.name,
      institute: t.institute,
      theme: t.theme,
      status: t.status,
      leader: t.leader.email,
      ps: t.problemStatement?.code ?? '',
    }));
  }
  if (dataset === 'submissions') {
    const ideas = await prisma.ideaSubmission.findMany({ include: { team: true, problemStatement: true } });
    return ideas.map((i) => ({
      team: i.team.teamCode,
      ps: i.problemStatement.code,
      status: i.status,
      version: i.version,
      lockedAt: i.lockedAt?.toISOString() ?? '',
    }));
  }
  const evals = await prisma.stageResult.findMany({ include: { team: true, stage: true } });
  return evals.map((e) => ({
    team: e.team.teamCode,
    stage: e.stage.name,
    score: Number(e.weightedScore),
    rank: e.rank,
    published: e.published,
  }));
}

async function toExcel(name: string, rows: Record<string, unknown>[]) {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(name);
  if (!rows.length) {
    sheet.addRow(['empty']);
  } else {
    const headers = Object.keys(rows[0]);
    sheet.addRow(headers);
    for (const row of rows) sheet.addRow(headers.map((h) => row[h] as ExcelJS.CellValue));
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

async function toPdf(name: string, rows: Record<string, unknown>[]) {
  return new Promise<Buffer>((resolve) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.fontSize(18).text('SIH Team & Project Management Portal', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor('#334155').text(`Export dataset: ${name}`);
    doc.fontSize(9).text(`Generated ${new Date().toISOString()}`);
    doc.moveDown();
    doc.fillColor('#0f172a');
    if (!rows.length) {
      doc.text('No rows.');
      doc.end();
      return;
    }
    const headers = Object.keys(rows[0]);
    doc.fontSize(9).text(headers.join('  |  '));
    doc.moveDown(0.4);
    for (const row of rows.slice(0, 400)) {
      const line = headers.map((h) => String(row[h] ?? '')).join('  |  ');
      doc.fontSize(8).text(line, { width: 520 });
    }
    doc.end();
  });
}
