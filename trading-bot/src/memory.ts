/**
 * Memoire deux fichiers :
 *   data/ledger.csv     -> journal machine des trades et des skips reels
 *   data/learnings.md   -> lecons en francais clair, tirees uniquement de resultats reels
 *
 * Regles : aucune perte fictive, aucune bougie inventee, aucun echec force.
 * On n'ecrit que ce qui s'est reellement produit dans un replay ou un scan papier.
 */
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { paths } from './config.js';
import type { LedgerRow, Outcome } from './types.js';

export const LEDGER_HEADER = 'timestamp,symbol,action,price,quantity,reason,mode,outcome,pnl';

const csvEscape = (v: string): string => `"${v.replace(/"/g, '""')}"`;

async function ensureFiles(): Promise<void> {
  await mkdir(path.dirname(paths.ledger), { recursive: true });
  if (!existsSync(paths.ledger)) await writeFile(paths.ledger, LEDGER_HEADER + '\n', 'utf8');
  if (!existsSync(paths.learnings)) {
    await writeFile(
      paths.learnings,
      '# Lecons du bot\n\n' +
        "Ce fichier n'est rempli qu'a partir de resultats reels de replay ou de paper-trading.\n" +
        'Aucune lecon n\'est inventee. Vide = pas encore assez d\'historique.\n\n',
      'utf8',
    );
  }
}

export async function appendLedgerRow(row: LedgerRow): Promise<void> {
  await ensureFiles();
  const line = [
    row.timestamp,
    row.symbol,
    row.action,
    row.price.toString(),
    row.quantity.toString(),
    csvEscape(row.reason),
    row.mode,
    row.outcome,
    row.pnl.toFixed(2),
  ].join(',');
  await appendFile(paths.ledger, line + '\n', 'utf8');
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i] as string;
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

export async function readLedger(): Promise<LedgerRow[]> {
  if (!existsSync(paths.ledger)) return [];
  const text = await readFile(paths.ledger, 'utf8');
  return text
    .split('\n')
    .slice(1)
    .filter((l) => l.trim() !== '')
    .map((l) => {
      const f = parseCsvLine(l);
      return {
        timestamp: f[0] ?? '',
        symbol: f[1] ?? '',
        action: (f[2] ?? 'HOLD') as LedgerRow['action'],
        price: Number(f[3] ?? 0),
        quantity: Number(f[4] ?? 0),
        reason: f[5] ?? '',
        mode: f[6] ?? '',
        outcome: (f[7] ?? 'FLAT') as Outcome,
        pnl: Number(f[8] ?? 0),
      };
    });
}

export async function readLearnings(): Promise<string> {
  if (!existsSync(paths.learnings)) return '';
  return readFile(paths.learnings, 'utf8');
}

/** Ecrit une lecon si elle n'est pas deja presente (evite les doublons a chaque replay). */
export async function appendLearning(setupKey: string, lesson: string): Promise<boolean> {
  await ensureFiles();
  const current = await readLearnings();
  const marker = `<!-- setup:${setupKey} -->`;
  if (current.includes(marker)) {
    const rewritten = current.replace(new RegExp(`${marker}[^\\n]*\\n(?:- .*\\n)*`), `${marker}\n- ${lesson}\n`);
    await writeFile(paths.learnings, rewritten, 'utf8');
    return false;
  }
  await appendFile(paths.learnings, `\n## ${setupKey}\n${marker}\n- ${lesson}\n`, 'utf8');
  return true;
}

export async function resetMemory(): Promise<void> {
  await mkdir(path.dirname(paths.ledger), { recursive: true });
  await writeFile(paths.ledger, LEDGER_HEADER + '\n', 'utf8');
  await writeFile(
    paths.learnings,
    '# Lecons du bot\n\n' +
      "Ce fichier n'est rempli qu'a partir de resultats reels de replay ou de paper-trading.\n" +
      'Aucune lecon n\'est inventee. Vide = pas encore assez d\'historique.\n\n',
    'utf8',
  );
}

export const memoryFilesExist = (): boolean => existsSync(paths.ledger) && existsSync(paths.learnings);
