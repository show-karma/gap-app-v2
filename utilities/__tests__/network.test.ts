import { getExplorerUrl, getChainIdByName, getChainNameById, appNetwork, gapSupportedNetworks } from '../network';

describe('network utilities', () => {
  describe('getExplorerUrl', () => {
    const testHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    it('should return Ethereum mainnet explorer URL', () => {
      const url = getExplorerUrl(1, testHash);
      expect(url).toBe(`https://etherscan.io/tx/${testHash}`);
    });

    it('should return Optimism explorer URL', () => {
      const url = getExplorerUrl(10, testHash);
      expect(url).toBe(`https://optimistic.etherscan.io/tx/${testHash}`);
    });

    it('should return Arbitrum explorer URL', () => {
      const url = getExplorerUrl(42161, testHash);
      expect(url).toBe(`https://arbiscan.io/tx/${testHash}`);
    });

    it('should return Base explorer URL', () => {
      const url = getExplorerUrl(8453, testHash);
      expect(url).toBe(`https://basescan.org/tx/${testHash}`);
    });

    it('should return Polygon explorer URL', () => {
      const url = getExplorerUrl(137, testHash);
      expect(url).toBe(`https://polygonscan.com/tx/${testHash}`);
    });

    it('should return Celo explorer URL', () => {
      const url = getExplorerUrl(42220, testHash);
      expect(url).toContain('/tx/');
      expect(url).toContain(testHash);
    });

    it('should return Sepolia explorer URL', () => {
      const url = getExplorerUrl(11155111, testHash);
      expect(url).toBe(`https://sepolia.etherscan.io/tx/${testHash}`);
    });

    it('should return Optimism Sepolia explorer URL', () => {
      const url = getExplorerUrl(11155420, testHash);
      expect(url).toContain('/tx/');
      expect(url).toContain(testHash);
    });

    it('should return Base Sepolia explorer URL', () => {
      const url = getExplorerUrl(84532, testHash);
      expect(url).toContain('/tx/');
      expect(url).toContain(testHash);
    });

    it('should return fallback URL for unknown chain', () => {
      const url = getExplorerUrl(999999, testHash);
      expect(url).toBe(`https://www.oklink.com/multi-search#key=${testHash}`);
    });

    it('should handle different transaction hash formats', () => {
      const shortHash = '0x123';
      const url = getExplorerUrl(1, shortHash);
      expect(url).toBe(`https://etherscan.io/tx/${shortHash}`);
    });
  });

  describe('getChainIdByName', () => {
    it('should return correct ID for Ethereum mainnet', () => {
      expect(getChainIdByName('mainnet')).toBe(1);
      expect(getChainIdByName('ethereum')).toBe(1);
      expect(getChainIdByName('Mainnet')).toBe(1);
      expect(getChainIdByName('ETHEREUM')).toBe(1);
    });

    it('should return correct ID for Optimism', () => {
      expect(getChainIdByName('optimism')).toBe(10);
      expect(getChainIdByName('OPTIMISM')).toBe(10);
    });

    it('should return correct ID for Arbitrum', () => {
      expect(getChainIdByName('arbitrum')).toBe(42161);
      expect(getChainIdByName('arbitrum-one')).toBe(42161);
      expect(getChainIdByName('ARBITRUM')).toBe(42161);
    });

    it('should return correct ID for Base', () => {
      expect(getChainIdByName('base')).toBe(8453);
      expect(getChainIdByName('BASE')).toBe(8453);
    });

    it('should return correct ID for Polygon', () => {
      expect(getChainIdByName('polygon')).toBe(137);
      expect(getChainIdByName('matic')).toBe(137);
      expect(getChainIdByName('POLYGON')).toBe(137);
    });

    it('should return correct ID for Celo', () => {
      expect(getChainIdByName('celo')).toBe(42220);
      expect(getChainIdByName('CELO')).toBe(42220);
    });

    it('should return correct ID for Sei', () => {
      expect(getChainIdByName('sei')).toBe(1329);
    });

    it('should return correct ID for Lisk', () => {
      expect(getChainIdByName('lisk')).toBe(1135);
    });

    it('should return correct ID for Scroll', () => {
      expect(getChainIdByName('scroll')).toBe(534352);
    });

    it('should return correct ID for test networks', () => {
      expect(getChainIdByName('sepolia')).toBe(11155111);
      expect(getChainIdByName('Sepolia')).toBe(11155111);
      expect(getChainIdByName('optimism-sepolia')).toBe(11155420);
      // 'optimismSepolia' won't match because switch uses toLowerCase()
      // which converts to 'optimismsepolia', not matching the case statement
      expect(getChainIdByName('optimismSepolia')).toBe(1); // Returns default
      expect(getChainIdByName('base-sepolia')).toBe(84532);
      expect(getChainIdByName('base sepolia')).toBe(84532);
      expect(getChainIdByName('basesepolia')).toBe(84532);
    });

    it('should return default network ID for unknown names', () => {
      const defaultId = getChainIdByName('unknown-network');
      expect(typeof defaultId).toBe('number');
      expect(defaultId).toBe(appNetwork[0].id);
    });

    it('should handle case insensitivity', () => {
      expect(getChainIdByName('MAINNET')).toBe(1);
      expect(getChainIdByName('mainnet')).toBe(1);
      expect(getChainIdByName('MaInNeT')).toBe(1);
    });
  });

  describe('getChainNameById', () => {
    it('should return correct name for chain IDs', () => {
      expect(getChainNameById(1)).toBe('mainnet');
      expect(getChainNameById(10)).toBe('optimism');
      expect(getChainNameById(42161)).toBe('arbitrum');
      expect(getChainNameById(8453)).toBe('base');
      expect(getChainNameById(137)).toBe('polygon');
      expect(getChainNameById(42220)).toBe('celo');
      expect(getChainNameById(1329)).toBe('sei');
      expect(getChainNameById(1135)).toBe('lisk');
      expect(getChainNameById(534352)).toBe('scroll');
    });

    it('should return correct name for test network IDs', () => {
      expect(getChainNameById(11155111)).toBe('sepolia');
      expect(getChainNameById(11155420)).toBe('optimism-sepolia');
      expect(getChainNameById(84532)).toBe('base-sepolia');
    });

    it('should handle unknown chain ID by returning default network name', () => {
      const defaultName = getChainNameById(999999);
      expect(typeof defaultName).toBe('string');
      // Should recursively get the default network's name
      expect(defaultName.length).toBeGreaterThan(0);
    });

    it('should be inverse of getChainIdByName for known chains', () => {
      const chains = [
        'mainnet',
        'optimism',
        'arbitrum',
        'base',
        'polygon',
        'celo',
        'sei',
        'lisk',
        'scroll',
        'sepolia',
        'optimism-sepolia',
        'base-sepolia'
      ];

      chains.forEach(chainName => {
        const id = getChainIdByName(chainName);
        const name = getChainNameById(id);
        expect(name).toBe(chainName);
      });
    });
  });

  describe('appNetwork', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(appNetwork)).toBe(true);
      expect(appNetwork.length).toBeGreaterThan(0);
    });

    it('should contain chain objects with required properties', () => {
      appNetwork.forEach(chain => {
        expect(chain).toHaveProperty('id');
        expect(chain).toHaveProperty('name');
        expect(typeof chain.id).toBe('number');
        expect(typeof chain.name).toBe('string');
      });
    });

    it('should include mainnet', () => {
      const hasMainnet = appNetwork.some(chain => chain.id === 1);
      expect(hasMainnet).toBe(true);
    });

    it('should include Optimism', () => {
      const hasOptimism = appNetwork.some(chain => chain.id === 10);
      expect(hasOptimism).toBe(true);
    });

    it('should include Arbitrum', () => {
      const hasArbitrum = appNetwork.some(chain => chain.id === 42161);
      expect(hasArbitrum).toBe(true);
    });
  });

  describe('gapSupportedNetworks', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(gapSupportedNetworks)).toBe(true);
      expect(gapSupportedNetworks.length).toBeGreaterThan(0);
    });

    it('should exclude mainnet (ID 1)', () => {
      const hasMainnet = gapSupportedNetworks.some(chain => chain.id === 1);
      expect(hasMainnet).toBe(false);
    });

    it('should exclude base (ID 8453)', () => {
      const hasBase = gapSupportedNetworks.some(chain => chain.id === 8453);
      expect(hasBase).toBe(false);
    });

    it('should exclude polygon (ID 137)', () => {
      const hasPolygon = gapSupportedNetworks.some(chain => chain.id === 137);
      expect(hasPolygon).toBe(false);
    });

    it('should include Optimism', () => {
      const hasOptimism = gapSupportedNetworks.some(chain => chain.id === 10);
      expect(hasOptimism).toBe(true);
    });

    it('should include Arbitrum', () => {
      const hasArbitrum = gapSupportedNetworks.some(chain => chain.id === 42161);
      expect(hasArbitrum).toBe(true);
    });

    it('should be a subset of appNetwork', () => {
      expect(gapSupportedNetworks.length).toBeLessThanOrEqual(appNetwork.length);

      gapSupportedNetworks.forEach(gapChain => {
        const inAppNetwork = appNetwork.some(appChain => appChain.id === gapChain.id);
        expect(inAppNetwork).toBe(true);
      });
    });
  });

  describe('integration tests', () => {
    it('should consistently map chain names to IDs and back', () => {
      // Test round-trip for all supported chains
      const testChains = [
        { name: 'mainnet', id: 1 },
        { name: 'optimism', id: 10 },
        { name: 'arbitrum', id: 42161 },
        { name: 'base', id: 8453 },
        { name: 'polygon', id: 137 }
      ];

      testChains.forEach(({ name, id }) => {
        expect(getChainIdByName(name)).toBe(id);
        expect(getChainNameById(id)).toBe(name);
      });
    });

    it('should generate valid explorer URLs for all appNetwork chains', () => {
      const testHash = '0xtest';

      appNetwork.forEach(chain => {
        const url = getExplorerUrl(chain.id, testHash);
        expect(url).toBeTruthy();
        expect(url).toContain(testHash);
        expect(url.startsWith('http')).toBe(true);
      });
    });
  });
});
