import SmolLogger from "../src/smol-logger"
import fs from 'fs';
import path from 'path';

/**
 * Smol test
 */
describe("Smol test", () => {
    // Tests that logger logs to console and store when both options are set to true
    it("test_log_to_console_and_store", () => {
      const logger = new SmolLogger({ logToConsole: true, logToStore: true });
      const consoleSpy = jest.spyOn(console, 'log');
      const storeSpy = jest.spyOn(logger, 'store');
      logger.log('test', 'test message');
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(storeSpy).toHaveBeenCalledTimes(1);
  });

  // Tests that logger logs to console only when logToConsole is set to true
  it("test_log_to_console_only", () => {
    const logger = new SmolLogger({ logToConsole: true, logToStore: false });
    const consoleSpy = jest.spyOn(console, 'log');
    const storeSpy = jest.spyOn(logger, 'store');
    logger.log('test', 'test message');
    expect(consoleSpy).toHaveBeenCalledTimes(2);
    expect(storeSpy).toHaveBeenCalledTimes(0);
  });

  // Tests that logger creates a new directory for each run
  it("test_create_new_directory", () => {
    const logger = new SmolLogger({ logToConsole: false, logToStore: true });
    const fsSpy = jest.spyOn(fs, 'mkdirSync');
    logger.log('test', 'test message');
    expect(fsSpy).toHaveBeenCalledTimes(2);
  });

  // Tests that logger stores logs with correct file name and format
  it("test_store_logs_with_correct_file_name_and_format", () => {
    const logger = new SmolLogger({ logToConsole: false, logToStore: true });
    const fsSpy = jest.spyOn(fs, 'writeFileSync');
    logger.log('test', 'test message');
    const currentRunDir = logger.currentRunDir;
    const logName = logger.logName('test');
    const destination = path.join(currentRunDir, `${logName}.json`);
    expect(fsSpy).toHaveBeenCalledWith(destination, expect.any(String));
});
})
