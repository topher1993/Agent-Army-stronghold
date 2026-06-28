import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const packageLock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8')) as {
  version: string;
  packages: Record<string, { version?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>;
};

// P2 fix #4: top-level dependency declarations must be exact semver pins,
// not floating tags ("latest") or semver ranges ("^"/"~"). Stronghold is a
// guarded local control plane; surprise dependency drift is a safety risk.
const exactSemver = /^\d+\.\d+\.\d+$/;

function allDeclaredDeps() {
  return {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
}

describe('P2 semver dependency policy', () => {
  it('pins every top-level dependency to an exact semver version instead of latest/ranges', () => {
    const offenders = Object.entries(allDeclaredDeps())
      .filter(([, version]) => !exactSemver.test(version))
      .map(([name, version]) => `${name}@${version}`);

    expect(offenders).toEqual([]);
  });

  it('keeps Stronghold on the locked React 18 stack', () => {
    expect(packageJson.dependencies?.react).toMatch(/^18\./);
    expect(packageJson.dependencies?.['react-dom']).toMatch(/^18\./);
    expect(packageJson.devDependencies?.['@types/react']).toMatch(/^18\./);
    expect(packageJson.devDependencies?.['@types/react-dom']).toMatch(/^18\./);
  });

  it('keeps package-lock root metadata synchronized with package.json', () => {
    const rootPackage = packageLock.packages[''];

    expect(packageLock.version).toBe(packageJson.version);
    expect(rootPackage.version).toBe(packageJson.version);
    expect(rootPackage.dependencies).toEqual(packageJson.dependencies);
    expect(rootPackage.devDependencies).toEqual(packageJson.devDependencies);
  });
});
