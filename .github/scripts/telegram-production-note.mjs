import { pathToFileURL } from 'node:url';

const oneLine = value => String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();

export function productionNote({ surface, pr, result }) {
  if (!['iHP', 'eHP'].includes(surface)) throw new Error('Unknown production surface');
  if (!Number.isSafeInteger(pr?.number) || pr.number < 1) throw new Error('Verified PR number is required');
  if (!['success', 'failure', 'timed_out', 'action_required', 'startup_failure'].includes(result)) throw new Error('No publishable production result');
  const field = String(pr.body || '').match(/^DOT-Release-Note:[ \t]*(.+)$/m);
  let note = oneLine(oneLine(field?.[1]) || pr.title)
    .replace(/\[(?:CI[0-5]|iHP|eHP)\]/gi, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ').trim();
  // Do not promote a template placeholder or a copied attribution/link field.
  if (!note || /ChatGPT-|Conversation.Title|^<|^TODO\b/i.test(note)) throw new Error('A factual short release note is required');
  note = note.slice(0, 160).trim();
  return `${surface} · PR #${pr.number} · ${result === 'success' ? '' : 'Deploy failed: '}${note}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(productionNote({ surface: process.env.NOTIFY_SURFACE, pr: JSON.parse(process.env.PR_JSON || '{}'), result: process.env.DEPLOY_RESULT }));
}
