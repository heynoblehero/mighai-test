import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export default async function handler(req, res) {
  const { action } = req.query;

  if (action === 'check') {
    return handleCheckUpdates(req, res);
  } else if (action === 'update' && req.method === 'POST') {
    return handlePerformUpdate(req, res);
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

async function handleCheckUpdates(req, res) {
  try {
    const debug = {
      workingDir: process.cwd(),
      gitInstalled: false,
      isGitRepo: false
    };

    // Check if git is installed
    try {
      const { stdout: gitVersion } = await execAsync('git --version');
      debug.gitInstalled = true;
      debug.gitVersion = gitVersion.trim();
    } catch (error) {
      debug.gitError = error.message;
    }

    // Check if we're in a git repository
    let isGitRepo = false;
    try {
      await execAsync('git rev-parse --git-dir');
      isGitRepo = true;
      debug.isGitRepo = true;
    } catch (error) {
      debug.gitRepoError = error.message;
      return res.status(200).json({
        success: true,
        updateInfo: {
          hasUpdate: false,
          message: `Not a git repository. Git installed: ${debug.gitInstalled}. Working dir: ${debug.workingDir}`,
          currentVersion: 'unknown',
          latestVersion: 'unknown',
          debug
        }
      });
    }

    // Get current commit hash
    const { stdout: currentCommit } = await execAsync('git rev-parse HEAD');
    const currentHash = currentCommit.trim();

    // Fetch latest from origin
    try {
      await execAsync('git fetch origin');
    } catch (error) {
      console.log('Could not fetch from origin:', error.message);
    }

    // Get latest commit hash from origin/main
    let latestHash;
    try {
      const { stdout: latestCommit } = await execAsync('git rev-parse origin/main');
      latestHash = latestCommit.trim();
    } catch (error) {
      // Try origin/master if main doesn't exist
      try {
        const { stdout: latestCommit } = await execAsync('git rev-parse origin/master');
        latestHash = latestCommit.trim();
      } catch (masterError) {
        return res.status(500).json({
          success: false,
          error: 'Could not determine latest version from remote repository'
        });
      }
    }

    // Check if update is available
    const hasUpdate = currentHash !== latestHash;
    
    let changelog = '';
    if (hasUpdate) {
      try {
        const { stdout } = await execAsync(`git log --oneline ${currentHash}..${latestHash}`);
        changelog = stdout.trim().split('\n').slice(0, 5).join('; ');
      } catch (error) {
        changelog = 'Changelog unavailable';
      }
    }

    return res.status(200).json({
      success: true,
      updateInfo: {
        hasUpdate,
        currentVersion: currentHash.substring(0, 7),
        latestVersion: latestHash.substring(0, 7),
        changelog: changelog || null,
        message: hasUpdate ? 'Update available' : 'Platform is up to date'
      }
    });

  } catch (error) {
    console.error('Error checking for updates:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check for updates: ' + error.message
    });
  }
}

async function handlePerformUpdate(req, res) {
  // Set up streaming response
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendLog = (message) => {
    const logData = JSON.stringify({ log: message }) + '\n';
    res.write(logData);
  };

  const sendStatus = (status) => {
    const statusData = JSON.stringify({ status }) + '\n';
    res.write(statusData);
  };

  const sendError = (error) => {
    const errorData = JSON.stringify({ error }) + '\n';
    res.write(errorData);
  };

  try {
    sendLog('🚀 Starting platform update...');
    sendStatus('updating');

    // Check if we're in a git repository
    try {
      await execAsync('git rev-parse --git-dir');
    } catch (error) {
      sendError('Not a git repository. Cannot perform automatic updates.');
      return res.end();
    }

    // Stash any local changes
    sendLog('💾 Stashing local changes...');
    try {
      await execAsync('git stash push -m "Pre-update stash $(date)"');
      sendLog('✅ Local changes stashed');
    } catch (error) {
      sendLog('ℹ️  No local changes to stash');
    }

    // Fetch latest changes
    sendLog('📡 Fetching latest changes from repository...');
    await execAsync('git fetch origin');
    sendLog('✅ Latest changes fetched');

    // Determine main branch
    let mainBranch = 'main';
    try {
      await execAsync('git rev-parse origin/main');
    } catch (error) {
      mainBranch = 'master';
    }

    // Pull latest changes
    sendLog(`🔄 Pulling latest changes from origin/${mainBranch}...`);
    await execAsync(`git reset --hard origin/${mainBranch}`);
    sendLog('✅ Code updated successfully');

    // Install/update dependencies
    sendLog('📦 Installing dependencies...');
    await execAsync('npm ci');
    sendLog('✅ Dependencies updated');

    // Build the application
    sendLog('🏗️  Building application...');
    try {
      await execAsync('npm run build');
      sendLog('✅ Application built successfully');
    } catch (error) {
      sendLog('⚠️  Build step skipped or failed - will use existing build');
    }

    // Restart services if we're in a Docker environment
    sendLog('🔄 Restarting services...');
    try {
      // Try to restart Docker containers if docker-compose is available
      const dockerComposeFile = path.join(process.cwd(), 'docker-compose.prod.yml');
      const fs = require('fs');
      
      if (fs.existsSync(dockerComposeFile)) {
        await execAsync('docker-compose -f docker-compose.prod.yml restart app');
        sendLog('✅ Docker services restarted');
      } else {
        sendLog('ℹ️  No docker-compose.prod.yml found, skipping container restart');
      }
    } catch (error) {
      sendLog('⚠️  Could not restart Docker services: ' + error.message);
    }

    // Try to restart PM2 if available
    try {
      await execAsync('pm2 reload all');
      sendLog('✅ PM2 processes reloaded');
    } catch (error) {
      sendLog('ℹ️  PM2 not available, skipping process reload');
    }

    sendLog('🎉 Platform update completed successfully!');
    sendLog('📍 Your application should now be running the latest version');
    sendStatus('success');

    // Send Telegram notification for successful platform update
    try {
      const { stdout: newVersion } = await execAsync('git rev-parse HEAD');
      
      // Import telegramNotifier here to avoid initialization issues
      const { default: telegramNotifier } = await import('../../../lib/telegram.js');
      
      await telegramNotifier.sendNotification('platformUpdate', {
        fromVersion: 'Previous version',
        toVersion: newVersion.trim().substring(0, 7),
        status: 'Success'
      });
    } catch (telegramError) {
      console.error('Failed to send Telegram notification:', telegramError);
      // Don't fail the entire update if Telegram notification fails
    }

  } catch (error) {
    console.error('Update error:', error);
    sendLog('❌ Update failed: ' + error.message);
    sendError('Update failed: ' + error.message);
    sendStatus('error');
  }

  res.end();
}

export const config = {
  api: {
    responseLimit: false,
  },
};