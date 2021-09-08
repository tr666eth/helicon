import { AudioGraph } from '../AudioGraph';
import {
  emptyGraph,
  graphWithCustomNode,
  graphWithNodesAndEdge,
  nodeExtension,
} from '../../testFixtures';

describe('AudioGraph', () => {
  it('should construct empty graph', () => {
    new AudioGraph(emptyGraph);
  });
  it('should construct full graph', () => {
    new AudioGraph(graphWithNodesAndEdge);
  });
  it('should extend', () => {
    new AudioGraph(graphWithCustomNode, [nodeExtension]);
  });
  it('should update', () => {
    const ag = new AudioGraph(emptyGraph);
    expect(Object.values(ag.audioNodes).length).toBe(0);
    ag.update(graphWithNodesAndEdge);
    expect(Object.values(ag.audioNodes).length).toBe(2);
  });
  it('should play and pause', () => {
    const ag = new AudioGraph(emptyGraph);
    expect(ag.playing).toBe(false);
    ag.play();
    expect(ag.playing).toBe(true);
    ag.pause();
    expect(ag.playing).toBe(false);
  });
  it('should stop', () => {
    const ag = new AudioGraph(emptyGraph);
    expect(ag.playing).toBe(false);
    ag.play();
    expect(ag.playing).toBe(true);
    ag.stop();
    expect(ag.playing).toBe(false);
  });
  it('should close', () => {
    const ag = new AudioGraph(emptyGraph);
    expect(ag.closed).toBe(false);
    ag.close();
    expect(ag.closed).toBe(true);
  });
});
