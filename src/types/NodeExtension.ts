import { AudioNodeParams } from './Graph';
import { NodeDescription } from './NodeDescription';

export interface AudioNodeSubclass {
  new (context: BaseAudioContext, params: AudioNodeParams): AudioNode;
}

export type NodeExtension = {
  type: string;
  description: NodeDescription;
  processor: string;
};
