import { build } from '../build';

describe('build', () => {
  it('should cosntruct an empty virtual audio graph', () => {
    expect(build(() => {})).toEqual({ nodes: {}, edges: {} });
  });
  it('should cosntruct a virtual audio graph with nodes and edges', () => {
    expect(
      build((node, edge) => {
        node('OSC', 'OscillatorNode', { frequency: 440 });
        node('DEST', 'AudioDestinationNode', {});
        edge('OSC', 0, 'DEST', 0);
      }),
    ).toEqual({
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
    });
  });
  it('should cosntruct a virtual audio graph with custom nodes', () => {
    expect(build(() => {})).toEqual({ nodes: {}, edges: {} });
  });
});
