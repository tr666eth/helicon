import { Graph } from '../types';

export const graphWithCustomNode: Graph = {
  nodes: {
    DUMMY: {
      id: 'DUMMY',
      type: 'DummyNode',
      params: {},
    },
    DEST: {
      id: 'DEST',
      type: 'AudioDestinationNode',
      params: {},
    },
  },
  edges: {
    E0: {
      id: 'E0',
      from: {
        node: 'DUMMY',
        index: 0,
      },
      to: {
        node: 'DEST',
        index: 0,
      },
    },
  },
};
