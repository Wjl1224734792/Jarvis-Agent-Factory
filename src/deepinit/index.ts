export { scanDirectory, flattenTree, readExistingManual } from './scanner.js';
export { generateAll, generateIncremental, writeDocs, validateHierarchy, generateAgentsMd, generateClaudeMd } from './generator.js';
export { scanDirectories, loadManifest, saveManifest, computeDiff, changedPaths } from './manifest.js';
export type { DirEntry } from './scanner.js';
