import { getAgentsByPlatform, getPlatforms, getPlatformModels, getAgentList, PLATFORM_FEATURES } from './agent-registry.js';

interface PlatformInfoError { error: string; }

interface PlatformInfoSingle {
  platform: string;
  agent_count: number;
  available_models: string[];
  features: string[];
  agents: { id: string; name: string; role: string; category?: string; defaultModel: string; defaultEffort: string }[];
}

interface PlatformInfoSummary {
  platforms: Record<string, { agent_count: number; available_models: string[]; features: string[] }>;
  total_agents: number;
}

type PlatformInfoResult = PlatformInfoError | PlatformInfoSingle | PlatformInfoSummary;

export function resolvePlatformInfo(platform?: string): PlatformInfoResult {
  const platforms = getPlatforms();
  const models = getPlatformModels(true);

  if (platform) {
    if (!platforms.includes(platform)) {
      return { error: `Unknown platform: ${platform}. Available: ${platforms.join(', ')}` };
    }
    const agents = getAgentsByPlatform(platform, true);
    return {
      platform,
      agent_count: agents.length,
      available_models: models[platform] || [],
      features: PLATFORM_FEATURES[platform] || [],
      agents: agents.map(a => ({
        id: a.id, name: a.name, role: a.role, category: a.category,
        defaultModel: a.defaultModel, defaultEffort: a.defaultEffort,
      })),
    };
  }

  const summary: Record<string, { agent_count: number; available_models: string[]; features: string[] }> = {};
  for (const p of platforms) {
    const agents = getAgentsByPlatform(p, true);
    summary[p] = {
      agent_count: agents.length,
      available_models: models[p] || [],
      features: PLATFORM_FEATURES[p] || [],
    };
  }
  return { platforms: summary, total_agents: getAgentList(true).length };
}
