import { mockProvider } from './mockProvider.js';
import { clubSparkProvider } from './clubSparkProvider.js';

export const providers = {
  mock: mockProvider,
  clubSpark: clubSparkProvider,
};

export function getProvider(providerKey) {
  const provider = providers[providerKey];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerKey}`);
  }
  return provider;
}
