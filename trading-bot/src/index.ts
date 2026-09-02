#!/usr/bin/env node
/** CLI : scan | replay:raw | replay:memory | memory:reset */
import { runScan } from './bot.js';
import { runReplay } from './replay.js';
import { resetMemory } from './memory.js';
import { log } from './logger.js';
import { paths } from './config.js';

const usage = `
Usage : npm run <commande>

  scan            Un passage sur les dernieres bougies reelles (decision unique, papier)
  replay:raw      Baseline honnete de la strategie, sans memoire
  replay:memory   Meme strategie filtree par la memoire, avec comparaison
  memory:reset    Vide data/ledger.csv et data/learnings.md
`;

async function main(): Promise<void> {
  const cmd = process.argv[2];
  switch (cmd) {
    case 'scan':
      await runScan();
      break;
    case 'replay:raw':
      await runReplay('raw');
      break;
    case 'replay:memory':
      await runReplay('memory');
      break;
    case 'memory:reset':
      await resetMemory();
      log.info(`Memoire remise a zero : ${paths.ledger} et ${paths.learnings} sont vides.`);
      break;
    default:
      console.log(usage);
      process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
