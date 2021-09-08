import { ParamType, NodeDescription } from '../types';

export function getAudioParamNames(description: NodeDescription): string[] {
  return Object.entries(description.params)
    .filter(([_, { type }]) => type === ParamType.AudioParam)
    .map(([name]) => name);
}
