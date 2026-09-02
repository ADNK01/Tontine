/** Logs horodates et lisibles en terminal. */
const ts = (): string => new Date().toISOString().replace('T', ' ').slice(0, 19);

export const log = {
  info: (msg: string): void => console.log(`[${ts()}] ${msg}`),
  step: (tag: string, msg: string): void => console.log(`[${ts()}] ${tag.padEnd(9)} | ${msg}`),
  warn: (msg: string): void => console.log(`[${ts()}] ATTENTION | ${msg}`),
  error: (msg: string): void => console.error(`[${ts()}] ERREUR    | ${msg}`),
  blank: (): void => console.log(''),
  title: (msg: string): void => {
    console.log('');
    console.log('='.repeat(78));
    console.log(msg);
    console.log('='.repeat(78));
  },
};
