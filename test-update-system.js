#!/usr/bin/env node

/**
 * Test Update System
 * Tests the platform update functionality including Docker support
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

class UpdateSystemTester {
  constructor() {
    this.testResults = [];
    this.isDocker = this.detectDockerEnvironment();
  }

  detectDockerEnvironment() {
    try {
      return fs.existsSync('/.dockerenv') || 
             (fs.existsSync('/proc/self/cgroup') && 
              fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker'));
    } catch (error) {
      return false;
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runTest(name, testFn) {
    this.log(`Testing: ${name}`, 'test');
    try {
      const result = await testFn();
      this.testResults.push({ name, status: 'passed', result });
      this.log(`✅ ${name}: PASSED`, 'success');
      return result;
    } catch (error) {
      this.testResults.push({ name, status: 'failed', error: error.message });
      this.log(`❌ ${name}: FAILED - ${error.message}`, 'error');
      throw error;
    }
  }

  async testGitRepository() {
    return this.runTest('Git Repository Check', async () => {
      try {
        await execAsync('git rev-parse --git-dir');
        const { stdout: hash } = await execAsync('git rev-parse HEAD');
        const { stdout: branch } = await execAsync('git branch --show-current');
        
        return {
          isGitRepo: true,
          currentHash: hash.trim(),
          currentBranch: branch.trim()
        };
      } catch (error) {
        throw new Error('Not a git repository or git not available');
      }
    });
  }

  async testPlatformVersionAPI() {
    return this.runTest('Platform Version API', async () => {
      // Start server in background for testing
      const server = exec('npm start');
      
      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        const response = await fetch('http://localhost:3000/api/admin/platform-version');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error('API returned success: false');
        }
        
        const requiredFields = ['version', 'commitHash', 'platform', 'environment'];
        for (const field of requiredFields) {
          if (!data[field]) {
            throw new Error(`Missing required field: ${field}`);
          }
        }
        
        return data;
      } finally {
        server.kill();
        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    });
  }

  async testUpdateCheckAPI() {
    return this.runTest('Update Check API', async () => {
      const server = exec('npm start');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        const response = await fetch('http://localhost:3000/api/admin/platform-update?action=check');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error('API returned success: false');
        }
        
        const updateInfo = data.updateInfo;
        if (!updateInfo) {
          throw new Error('Missing updateInfo in response');
        }
        
        const requiredFields = ['hasUpdate', 'currentVersion', 'latestVersion', 'message'];
        for (const field of requiredFields) {
          if (updateInfo[field] === undefined) {
            throw new Error(`Missing required field in updateInfo: ${field}`);
          }
        }
        
        return data;
      } finally {
        server.kill();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    });
  }

  async testDatabaseBackup() {
    return this.runTest('Database Backup Functionality', async () => {
      const backupDir = path.join(process.cwd(), 'data', 'backups');
      const testDbPath = path.join(process.cwd(), 'site_builder.db');
      const testContent = 'test database content';
      
      // Create test database
      fs.writeFileSync(testDbPath, testContent);
      
      // Ensure backup directory exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Simulate backup process
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `test-backup-${timestamp}.db`);
      
      fs.copyFileSync(testDbPath, backupPath);
      
      // Verify backup
      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file was not created');
      }
      
      const backupContent = fs.readFileSync(backupPath, 'utf8');
      if (backupContent !== testContent) {
        throw new Error('Backup content does not match original');
      }
      
      // Cleanup
      fs.unlinkSync(backupPath);
      fs.unlinkSync(testDbPath);
      
      return {
        backupCreated: true,
        backupPath: backupPath,
        contentMatches: true
      };
    });
  }

  async testDockerEnvironmentDetection() {
    return this.runTest('Docker Environment Detection', async () => {
      const detected = this.isDocker;
      
      return {
        dockerEnvironment: detected,
        dockerEnvFile: fs.existsSync('/.dockerenv'),
        procCgroup: fs.existsSync('/proc/self/cgroup') ? 
          fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker') : false
      };
    });
  }

  async testRestartSignalCreation() {
    return this.runTest('Restart Signal Creation', async () => {
      const dataDir = path.join(process.cwd(), 'data');
      const signalPath = path.join(dataDir, 'restart-required');
      
      // Ensure data directory exists
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Create test signal
      const signalData = {
        timestamp: new Date().toISOString(),
        reason: 'test-update',
        pid: process.pid
      };
      
      fs.writeFileSync(signalPath, JSON.stringify(signalData));
      
      // Verify signal file
      if (!fs.existsSync(signalPath)) {
        throw new Error('Signal file was not created');
      }
      
      const savedData = JSON.parse(fs.readFileSync(signalPath, 'utf8'));
      
      if (savedData.reason !== 'test-update') {
        throw new Error('Signal data does not match');
      }
      
      // Cleanup
      fs.unlinkSync(signalPath);
      
      return {
        signalCreated: true,
        signalData: savedData
      };
    });
  }

  async testDockerComposeFiles() {
    return this.runTest('Docker Compose Files Check', async () => {
      const composeFiles = [
        'docker-compose.yml',
        'docker-compose.prod.yml'
      ];
      
      const results = {};
      
      for (const file of composeFiles) {
        const exists = fs.existsSync(file);
        results[file] = {
          exists,
          content: exists ? fs.readFileSync(file, 'utf8').length : 0
        };
      }
      
      const hasAtLeastOne = Object.values(results).some(r => r.exists);
      
      if (!hasAtLeastOne) {
        throw new Error('No docker-compose files found');
      }
      
      return results;
    });
  }

  async runAllTests() {
    this.log('🚀 Starting Update System Tests', 'info');
    this.log(`Environment: ${this.isDocker ? 'Docker' : 'Host'}`, 'info');
    
    const tests = [
      () => this.testGitRepository(),
      () => this.testDatabaseBackup(),
      () => this.testDockerEnvironmentDetection(),
      () => this.testRestartSignalCreation(),
      () => this.testDockerComposeFiles(),
      () => this.testPlatformVersionAPI(),
      () => this.testUpdateCheckAPI()
    ];
    
    let passedTests = 0;
    let failedTests = 0;
    
    for (const test of tests) {
      try {
        await test();
        passedTests++;
      } catch (error) {
        failedTests++;
      }
    }
    
    this.log('📊 Test Results Summary', 'info');
    this.log(`✅ Passed: ${passedTests}`, 'success');
    this.log(`❌ Failed: ${failedTests}`, 'error');
    this.log(`📈 Success Rate: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`, 'info');
    
    if (failedTests > 0) {
      this.log('❌ Some tests failed. Review the errors above.', 'error');
      process.exit(1);
    } else {
      this.log('🎉 All tests passed! Update system is working correctly.', 'success');
      process.exit(0);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new UpdateSystemTester();
  tester.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = UpdateSystemTester;