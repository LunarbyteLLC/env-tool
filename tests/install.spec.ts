import fs from "fs";
import path from "path";
import { runInstallation, findSourceDirs, updatePackageJson, createInitialSchema } from "../src/install";

// Define the PackageJson interface to match the one in install.ts
interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
  [key: string]: any;
}

// Mock fs.writeFileSync to prevent actual file writes
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn()
}));

// Mock process.exit to prevent test termination
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
  throw new Error(`Process.exit(${code})`);
});

// Mock console.log and other console methods
console.log = jest.fn();
console.error = jest.fn();

describe('env-tool installation script', () => {
  const rootDir = process.cwd();
  const fixturesDir = path.join(rootDir, 'tests/fixtures/install');
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.chdir(rootDir);
    
    // Default mocks for fs functions
    (fs.existsSync as jest.Mock).mockImplementation((path) => true);
    (fs.readFileSync as jest.Mock).mockImplementation((path) => {
      if (path.includes('package.json')) {
        return JSON.stringify({
          name: "test-app",
          version: "1.0.0",
          scripts: {
            test: "echo \"Error: no test specified\" && exit 1"
          }
        });
      }
      return "";
    });
  });
  
  afterEach(() => {
    process.chdir(rootDir);
  });
  
  describe('findSourceDirs', () => {
    it('should find source directories', () => {
      process.chdir(fixturesDir);
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        return path.includes('/src') || path.includes('/lib');
      });
      
      const dirs = findSourceDirs();
      expect(dirs).toContain('src');
      expect(dirs).toContain('lib');
    });
    
    it('should handle multiple source directories', () => {
      process.chdir(fixturesDir);
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        return path.includes('/src') || path.includes('/lib');
      });
      
      const dirs = findSourceDirs();
      expect(dirs.length).toBeGreaterThan(0);
      expect(dirs).toContain('src');
    });

    it('should return default directory if no source dirs found', () => {
      process.chdir(fixturesDir);
      (fs.existsSync as jest.Mock).mockImplementation(() => false);
      
      const dirs = findSourceDirs();
      expect(dirs).toEqual(['./']);
    });
  });
  
  describe('updatePackageJson', () => {
    it('should add env-tool scripts to package.json', () => {
      const packageJson: PackageJson = {
        name: "test-app",
        version: "1.0.0",
        scripts: {
          test: "echo \"Error: no test specified\" && exit 1"
        }
      };
      
      const updatedJson = updatePackageJson(packageJson, ['src']);
      
      // TypeScript should know scripts exists after updatePackageJson
      expect(updatedJson.scripts!['env:init']).toBeDefined();
      expect(updatedJson.scripts!['env:audit']).toBeDefined();
      expect(updatedJson.scripts!['env:validate']).toBeDefined();
      expect(updatedJson.scripts!['env:sync']).toBeDefined();
      
      expect(updatedJson.scripts!['env:init']).toContain('src');
    });
    
    it('should maintain existing scripts', () => {
      const packageJson: PackageJson = {
        name: "test-app",
        version: "1.0.0",
        scripts: {
          test: "echo \"Error: no test specified\" && exit 1",
          start: "node index.js"
        }
      };
      
      const updatedJson = updatePackageJson(packageJson, ['src']);
      
      expect(updatedJson.scripts!.test).toBe("echo \"Error: no test specified\" && exit 1");
      expect(updatedJson.scripts!.start).toBe("node index.js");
    });
    
    it('should handle empty scripts object', () => {
      const packageJson: PackageJson = {
        name: "test-app",
        version: "1.0.0",
        scripts: {}
      };
      
      const updatedJson = updatePackageJson(packageJson, ['src']);
      
      expect(updatedJson.scripts!['env:init']).toBeDefined();
      expect(updatedJson.scripts!['env:audit']).toBeDefined();
      expect(updatedJson.scripts!['env:validate']).toBeDefined();
      expect(updatedJson.scripts!['env:sync']).toBeDefined();
    });

    it('should properly format source directory', () => {
      const packageJson: PackageJson = {
        name: "test-app",
        version: "1.0.0",
        scripts: {}
      };
      
      // Test with directory without trailing slash
      const updatedJson1 = updatePackageJson(packageJson, ['src']);
      expect(updatedJson1.scripts!['env:init']).toContain('src/');
      
      // Test with directory with trailing slash - Create a fresh packageJson to avoid reusing the same object
      const packageJson2: PackageJson = {
        name: "test-app",
        version: "1.0.0",
        scripts: {}
      };
      const updatedJson2 = updatePackageJson(packageJson2, ['lib/']);
      expect(updatedJson2.scripts!['env:init']).toContain('lib/');
    });
  });
  
  describe('createInitialSchema', () => {
    it('should create an empty schema file', () => {
      createInitialSchema();
      
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
      const args = (fs.writeFileSync as jest.Mock).mock.calls[0];
      expect(args[0]).toContain('envconfig.json');
      expect(args[1]).toEqual(JSON.stringify({}, null, 2) + '\n');
    });
  });
  
  describe('runInstallation', () => {
    it('should complete installation successfully with auto-detected source directory', () => {
      // Ensure package.json existence check passes
      (fs.existsSync as jest.Mock).mockImplementation((path) => true);
      
      // Try to run the installation
      try {
        runInstallation();
      } catch (error) {
        // Ignore process.exit errors
      }
      
      // Verify that writeFileSync was called for package.json and envconfig.json
      expect(fs.writeFileSync).toHaveBeenCalled();
      
      // Verify one call was for package.json
      const packageJsonCall = (fs.writeFileSync as jest.Mock).mock.calls.find(
        call => String(call[0]).includes('package.json')
      );
      expect(packageJsonCall).toBeTruthy();
      
      // Verify one call was for envconfig.json
      const schemaCall = (fs.writeFileSync as jest.Mock).mock.calls.find(
        call => String(call[0]).includes('envconfig.json')
      );
      expect(schemaCall).toBeTruthy();
      
      // Verify console output
      expect(console.log).toHaveBeenCalled();
    });
    
    it('should use specified source directory when provided', () => {
      // Ensure package.json existence check passes
      (fs.existsSync as jest.Mock).mockImplementation((path) => true);
      
      // Try to run the installation
      try {
        runInstallation('lib');
      } catch (error) {
        // Ignore process.exit errors
      }
      
      // Check that the lib directory was used in the package.json scripts
      const packageJsonCall = (fs.writeFileSync as jest.Mock).mock.calls.find(call => 
        String(call[0]).includes('package.json')
      );
      
      expect(packageJsonCall).toBeTruthy();
      const packageJsonContent = String(packageJsonCall[1]);
      expect(packageJsonContent).toContain('lib/');
    });
    
    it('should handle missing package.json', () => {
      // Make package.json check fail
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        return !String(path).includes('package.json');
      });
      
      // Try to run the installation and expect it to exit
      expect(() => {
        runInstallation();
      }).toThrow('Process.exit(1)');
      
      // Verify error was logged
      expect(console.error).toHaveBeenCalledWith('No package.json found in the current directory.');
    });
  });
}); 