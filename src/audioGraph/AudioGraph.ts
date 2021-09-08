import {
  Node,
  Edge,
  Graph,
  ParamType,
  NodeExtension,
  NodeDescription,
  AudioNodeSubclass,
} from '../types';
import { getAudioParamNames } from '../utils';
import { nativeNodeConstructors } from './nativeNodeConstructors';
import { nativeNodeDescriptions } from './nativeNodeDescriptions';

const emptyGraph = {
  seed: 0,
  name: '',
  nodes: {},
  edges: {},
};

const CLICK_AVOIDANCE_TIME_CONSTANT = 0.005;
const SUSPEND_DELAY = 300;

export class AudioGraph {
  context!: BaseAudioContext;
  // a gain node is inserted between the the true AudioDestinationNode of the
  // context and nodes in the graph.  This allows global gain control.
  destination!: GainNode;
  analyser!: AnalyserNode;
  audioNodes!: { [id: string]: AudioNode & { close?: () => void } };
  // resolved when worklet processors are loaded
  ready!: Promise<void>;
  // resolved when all files in the initial version of the graph passed to the
  // constructor have loaded
  filesReady: Promise<void>;

  graph: Graph = emptyGraph;
  files: {
    [url: string]: {
      audioBuffer: Promise<AudioBuffer>;
      users: Set<string>;
    };
  } = {};
  constructors: { [type: string]: AudioNodeSubclass } = {
    ...nativeNodeConstructors,
  };
  descriptions: { [type: string]: NodeDescription } = {
    ...nativeNodeDescriptions,
  };
  workletProcessorURIs: string[] = [];
  closed: boolean = false;
  playing: boolean = false;

  private suspendTimeout?: number;

  constructor(
    graph?: Graph,
    extensions?: NodeExtension[],
    context?: BaseAudioContext,
  ) {
    extensions?.forEach(e => this._extend(e));
    this._setupContext(
      context ||
        new AudioContext({
          latencyHint: 'playback',
        }),
    );

    if (graph) {
      this.filesReady = this.ready
        .then(() => {
          this.update(graph);
          return Promise.all(
            Object.values(this.files).map(({ audioBuffer }) => audioBuffer),
          );
        })
        .then(() => {});
    } else {
      this.filesReady = Promise.resolve();
    }
  }

  private _setupContext(context: BaseAudioContext) {
    this.context =
      context ||
      new AudioContext({
        latencyHint: 'playback',
      });
    this.destination = new GainNode(this.context);
    this.analyser = new AnalyserNode(this.context, {
      fftSize: 1024,
      smoothingTimeConstant: 0.6,
      maxDecibels: -6,
      minDecibels: -90,
    });

    this.destination.connect(this.analyser);
    this.analyser.connect(this.context.destination);

    if (this.context instanceof AudioContext) {
      this.context.suspend();
    }

    this.audioNodes = {};

    this.ready = Promise.all(
      this.workletProcessorURIs.map(path =>
        this.context.audioWorklet.addModule(path),
      ),
    ).then(() => {});
  }

  private _extend({ type, node, description, processor }: NodeExtension) {
    if (this.constructors[type] && process.env.NODE_ENV === 'development')
      throw new Error(
        `Cannot extend project with '${type}' because it already exists`,
      );
    this.constructors[type] = node;
    this.descriptions[type] = description;
    if (processor) this.workletProcessorURIs.push(processor);
  }

  play(): void {
    if (
      !(this.context instanceof AudioContext) &&
      process.env.NODE_ENV === 'development'
    ) {
      throw new Error('play is not valid for offline context');
    }

    this.playing = true;
    clearTimeout(this.suspendTimeout);
    this.destination.gain.value = 0;
    (this.context as AudioContext).resume();
    this.destination.gain.setTargetAtTime(
      1.0,
      this.context.currentTime,
      CLICK_AVOIDANCE_TIME_CONSTANT,
    );
  }

  pause(): void {
    if (
      !(this.context instanceof AudioContext) &&
      process.env.NODE_ENV === 'development'
    ) {
      throw new Error('pause is not valid for offline context');
    }

    this._pause();
  }

  stop(): void {
    if (
      !(this.context instanceof AudioContext) &&
      process.env.NODE_ENV === 'development'
    ) {
      throw new Error('stop is not valid for offline context');
    }

    this._pause(async context => {
      Object.values(this.audioNodes).forEach(node => {
        if (node.close) node.close();
      });
      context.close();
      this._setupContext(
        new AudioContext({
          latencyHint: 'playback',
          sampleRate: context.sampleRate,
        }),
      );
      this.ready.then(() => this.update(this.graph, true));
    });
  }

  private _pause(callback?: (context: AudioContext) => void): void {
    const context = this.context as AudioContext;
    this.playing = false;
    clearTimeout(this.suspendTimeout);
    this.destination.gain.setTargetAtTime(
      1e-44,
      context.currentTime,
      CLICK_AVOIDANCE_TIME_CONSTANT,
    );
    this.suspendTimeout = window.setTimeout(() => {
      context.suspend();
      if (callback) callback(context);
    }, SUSPEND_DELAY);
  }

  close(): void {
    if (
      !(this.context instanceof AudioContext) &&
      process.env.NODE_ENV === 'development'
    ) {
      throw new Error('close is not valid for offline context');
    }
    if (this.closed) {
      return;
    }
    this.closed = true;
    Object.values(this.audioNodes).forEach(node => {
      if (node.close) node.close();
    });
    (this.context as AudioContext).close();
  }

  update(nextGraph: Graph, reset?: boolean) {
    const graph = reset ? emptyGraph : this.graph;
    this.graph = nextGraph;

    if (this.closed) return;

    // diff and update nodes
    if (nextGraph.nodes !== graph.nodes) {
      Object.keys(nextGraph.nodes).forEach((id: string) => {
        const nextNode = nextGraph.nodes[id];
        const node = graph.nodes[id];
        if (node === undefined) {
          this.addNode(nextNode);
        } else if (node !== nextNode) {
          this.updateNode(node, nextNode);
        }
      });
      Object.keys(graph.nodes).forEach((id: string) => {
        if (nextGraph.nodes[id] === undefined) {
          this.removeNode(graph.nodes[id]);
        }
      });
    }

    // diff and update edges
    if (nextGraph.edges !== graph.edges) {
      Object.keys(nextGraph.edges).forEach(id => {
        if (graph.edges[id] === undefined) {
          const edge = nextGraph.edges[id];
          const toNode = nextGraph.nodes[edge.to.node];
          this.connect(edge, toNode);
        }
      });
      Object.keys(graph.edges).forEach(id => {
        if (nextGraph.edges[id] === undefined) {
          // disconnect nodes
          const edge = graph.edges[id];
          const fromNode = nextGraph.nodes[edge.from.node];
          const toNode = nextGraph.nodes[edge.to.node];

          // if the node on either end of the edge has been removed, this
          // will have already been disconnected and we can stop here
          if (fromNode === undefined || toNode === undefined) return;

          this.disconnect(edge, toNode);
        }
      });
    }
  }

  private addNode(node: Node): void {
    const { id, params, type } = node;

    let audioNode: AudioNode;
    if (type === 'AudioDestinationNode') {
      // use special handling for destination nodes so that multiple nodes can
      // be created and deleted
      audioNode = new GainNode(this.context);
      audioNode.connect(this.destination);
    } else {
      const description = this.descriptions[type];
      const AudioNodeClass = this.constructors[type];
      audioNode = new AudioNodeClass(
        this.context,
        Object.keys(params).reduce((memo, key) => {
          const paramDescription = description.params[key];
          const value = (params as any)[key];
          if (paramDescription.type === ParamType.AudioBuffer) {
            if (value === null) {
              memo[key] = null;
            } else {
              this.loadAudioBuffer(node, key, value);
            }
          } else {
            memo[key] = value;
          }
          return memo;
        }, {} as any),
      );
      if (audioNode instanceof AudioScheduledSourceNode) audioNode.start();
    }

    this.audioNodes[id] = audioNode;
  }

  private updateNode(node: Node, nextNode: Node): void {
    const description = this.descriptions[nextNode.type];
    const audioNode = this.audioNodes[node.id];
    const params = node.params;
    const nextParams = nextNode.params;
    Object.keys(params).forEach(key => {
      const value: any = (params as any)[key];
      const nextValue: any = (nextParams as any)[key];
      if (value !== nextValue) {
        const paramDescription = description.params[key];
        if (paramDescription.type === ParamType.AudioParam) {
          (audioNode as any)[key].value = nextValue;
        } else if (paramDescription.type === ParamType.AudioBuffer) {
          // clean up old referenced file
          if (value !== null) {
            this.dereferenceFile(value, node.id);
          }
          if (nextValue === null) {
            (audioNode as any)[key] = null;
          } else {
            this.loadAudioBuffer(nextNode, key, nextValue);
          }
        } else {
          (audioNode as any)[key] = nextValue;
        }
      }
    });
  }

  private removeNode({ id, type, params }: Node): void {
    const audioNode = this.audioNodes[id];
    delete this.audioNodes[id];
    audioNode.disconnect();

    // hook for node to clean up any bindings (for example midi event listeners)
    if (audioNode.close) audioNode.close();

    // clean up referenced files
    const description = this.descriptions[type];
    Object.keys(params).forEach(key => {
      const paramDescription = description.params[key];
      if (paramDescription.type === ParamType.AudioBuffer) {
        const url = (params as any)[key];
        if (url !== null) {
          this.dereferenceFile(url, id);
        }
      }
    });
  }

  private connect(edge: Edge, toNode: Node): void {
    const fromAudioNode = this.audioNodes[edge.from.node];
    const toAudioNode = this.audioNodes[edge.to.node];
    const toNodeDescription = this.descriptions[toNode.type];
    if (edge.to.index < toNodeDescription.numberOfInputs) {
      fromAudioNode.connect(toAudioNode, edge.from.index, edge.to.index);
    } else {
      const name =
        getAudioParamNames(toNodeDescription)[
          edge.to.index - toNodeDescription.numberOfInputs
        ];
      const toAudioParam = (toAudioNode as any)[name];
      fromAudioNode.connect(toAudioParam, edge.from.index);
    }
  }

  private disconnect(edge: Edge, toNode: Node): void {
    const fromAudioNode = this.audioNodes[edge.from.node];
    const toAudioNode = this.audioNodes[edge.to.node];
    const toNodeDescription = this.descriptions[toNode.type];
    if (edge.to.index < toNodeDescription.numberOfInputs) {
      fromAudioNode.disconnect(toAudioNode, edge.from.index, edge.to.index);
    } else {
      const name =
        getAudioParamNames(toNodeDescription)[
          edge.to.index - toNodeDescription.numberOfInputs
        ];
      const toAudioParam = (toAudioNode as any)[name];
      fromAudioNode.disconnect(toAudioParam, edge.from.index);
    }
  }

  private loadAudioBuffer(node: Node, key: string, url: string): void {
    let audioBuffer: Promise<AudioBuffer>;
    let users: Set<string>;
    if (this.files[url]) {
      ({ audioBuffer, users } = this.files[url]);
      users.add(node.id);
    } else {
      audioBuffer = fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => this.context.decodeAudioData(arrayBuffer));
      users = new Set([node.id]);
      this.files[url] = { audioBuffer, users };
    }

    audioBuffer.then(buffer => {
      // we need to check that the node continues to use the buffer in case the
      // value has changed while we waited for the buffer to load.
      if (users.has(node.id)) {
        const audioNode = this.audioNodes[node.id];
        (audioNode as any)[key] = buffer;
      }
    });
  }

  private dereferenceFile(url: string, nodeID: string): void {
    const file = this.files[url];
    file.users.delete(nodeID);
    if (file.users.size === 0) {
      delete this.files[url];
    }
  }
}
