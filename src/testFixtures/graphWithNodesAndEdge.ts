import { Graph } from '../types';

export const graphWithNodesAndEdge: Graph = {
  nodes: {
    OSC: {
      id: 'OSC',
      type: 'OscillatorNode',
      params: {
        detune: 0,
        frequency: 440,
        type: 'sine',
      },
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
        node: 'OSC',
        index: 0,
      },
      to: {
        node: 'DEST',
        index: 0,
      },
    },
  },
};
