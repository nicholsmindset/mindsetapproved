import source from '../../../data/starter-rules.json';
import { compileBundle, loadRules, rowsFromSource, type RuleSource, type Rules } from '../src';

export const bundle = compileBundle({ ...rowsFromSource(source as RuleSource), generatedAt: '2026-11-20T00:00:00Z' });
export const rules: Rules = loadRules(bundle);
