import { NodeExtension } from '../types';

export const nodeExtension: NodeExtension = {
  type: 'DummyNode',
  description: {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    params: {},
  },
  processor: '/dummy.js',
};
