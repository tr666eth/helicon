import { NodeExtension } from '../types';

export const nodeExtension: NodeExtension = {
  type: 'DummyNode',
  description: {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    params: {},
  },
  node: class DummyNode extends AudioWorkletNode {
    constructor(context: BaseAudioContext) {
      super(context, 'DummyProcessor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
      });
    }
  },
  processor: '/dummy.js',
};
