import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    // Detect required packages from code
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;

    const requiredPackages = new Set();

    // Find all require() statements
    let match;
    while ((match = requireRegex.exec(code)) !== null) {
      const pkg = match[1];
      // Skip built-in Node.js modules
      if (!isBuiltInModule(pkg)) {
        requiredPackages.add(pkg);
      }
    }

    // Find all import statements
    while ((match = importRegex.exec(code)) !== null) {
      const pkg = match[1];
      if (!isBuiltInModule(pkg)) {
        requiredPackages.add(pkg);
      }
    }

    const packagesToInstall = Array.from(requiredPackages);

    if (packagesToInstall.length === 0) {
      return res.json({
        success: true,
        message: 'No external packages required',
        packages: [],
        installed: []
      });
    }

    // Check which packages are already installed
    const installedPackages = [];
    const packagesToInstallNow = [];

    for (const pkg of packagesToInstall) {
      try {
        require.resolve(pkg);
        installedPackages.push(pkg);
      } catch (e) {
        packagesToInstallNow.push(pkg);
      }
    }

    // Install missing packages
    const installResults = [];
    if (packagesToInstallNow.length > 0) {
      try {
        console.log(`Installing packages: ${packagesToInstallNow.join(', ')}`);
        const { stdout, stderr } = await execAsync(
          `npm install ${packagesToInstallNow.join(' ')}`,
          { cwd: process.cwd(), timeout: 60000 }
        );

        installResults.push({
          success: true,
          packages: packagesToInstallNow,
          stdout,
          stderr
        });
      } catch (error) {
        console.error('Package installation error:', error);
        return res.json({
          success: false,
          error: `Failed to install packages: ${error.message}`,
          packages: packagesToInstall,
          installed: installedPackages,
          failedToInstall: packagesToInstallNow
        });
      }
    }

    res.json({
      success: true,
      message: 'All required packages are available',
      packages: packagesToInstall,
      alreadyInstalled: installedPackages,
      newlyInstalled: packagesToInstallNow,
      installResults
    });

  } catch (error) {
    console.error('Error in install-packages:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

function isBuiltInModule(moduleName) {
  const builtInModules = [
    'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns',
    'domain', 'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'punycode',
    'querystring', 'readline', 'stream', 'string_decoder', 'timers', 'tls',
    'tty', 'url', 'util', 'v8', 'vm', 'zlib'
  ];

  // Extract base package name (e.g., 'axios/dist/axios' -> 'axios')
  const baseName = moduleName.split('/')[0];

  return builtInModules.includes(baseName);
}
