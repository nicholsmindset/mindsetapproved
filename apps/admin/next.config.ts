import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  // The engine is shipped as TypeScript source from the workspace.
  transpilePackages: ['@mindset/rules-engine'],
  turbopack: { root: path.resolve(process.cwd(), '../..') },
};

export default config;
