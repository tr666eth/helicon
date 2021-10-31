# Helicon

Helicon is a library for making music with web audio. It was
developed as part of the [audioglyphs](https://www.audioglyphs.io) project, but
we hope that it will be useful to others working on similar things.

It aims to use native web audio APIs as directly as possible and to be general
purpose - avoiding including any specific audio processing or sequencing code in
favor of things that apply to any project and any style of music.

## Goals

- **Provide a nicer API for creating and updating web audio graphs**

  Helicon uses a 'virtual graph' model where audio graphs are defined
  declaratively using a lightweight
  [data only representation](src/types/Graph.ts). It handles diffing these
  definitions to identify changes and make minimum necessary updates to a native
  audio graph.

- **Handle serializing graphs**

  The data only representation used by Helicon is easily serializable. This
  provides a 'file format' for web audio, allowing things like building a common
  player that can work across projects. Similar to vector graphics formats,
  this serialization format is resolution independent, allowing music to be
  rendered at arbitrarily high sample rates and bit depths without any
  compression artifacts.

- **Abstract main thread components of custom nodes**

  Writing custom web audio nodes requires both main thread and audio thread
  components. The audio thread components have limited access, but untrusted
  code can't be run safely in the main thread. Helicon standardizes the main
  thread components of custom nodes so that they can be configured statically,
  allowing a serialization format for web audio graphs to safely include custom
  audio nodes.

- **Smooth some of web audio's rough edges**

  Helicon handles a few of the more involved parts of using web audio
  transparently so that you don't have to re-implement them in every project.
  These include loading files, loading worklet processors, and starting and
  stopping playback without clicks.

## Roadmap

- **Include randomization and data input in the serialization format**

- **Standardize a format for local synthesis of generative music**

  Local synthesis of music allows small file sizes, arbitrarily high quality,
  randomization, and interactivity. To be more than a novelty, it needs a common
  standard for publishing and playing back music. WebAudio is an ideal
  foundation for this standard because of its multiple implementations and the
  security features built into the web platform. One goal of this library is to
  serve as a proof of concept and template for a future standard.

## Getting started

You can find a detailed tutorial with runnable examples [here](docs).

## API

### AudioGraph

This class handles creation of and updates to a native web audio graph and
controls its playback.

#### Constructor

```
import { AudioGraph } from 'helicon';

new AudioGraph(graph, extensions, audioContext);
```

An [AudioGraph](src/audioGraph/AudioGraph.ts) is initialized with a virtual
graph describing the nodes and edges in the graph and its parameters, optional
extensions defining custom audio nodes, and an optional audio context.

The virtual graph can be created using a builder utility function, or directly
as a plain javascript object. The Graph type defined [here](src/types/Graph.ts)
describes its structure.

Extensions is an optional array of [NodeExtension](src/types/NodeExtension.ts)
objects including a static description of its parameters and the url of a
worklet processor script to load.

An AudioContext or OfflineAudioContext can be optionally passed as the final
argument. If provided, it will be used, and if omitted a new context will be
created.

#### Properties

- `graph` - the virtual graph object defining the structure of the native audio
  graph
- `audioNodes` - an obect mapping node id to native AudioNode instance
- `files` - a map of url to file object. These objects include an AudioBuffer
  and some metadata tracking which nodes use the file.
- `destination` - a GainNode placed between any output of the graph and the true
  AudioDestinationNode of its AudioContext. This allows for global volume
  control of the graph and is necessary to prevent clicks when starting or
  stopping playback.
- `analyser` - an AnalyserNode connected to the output of the graph.
- `ready` - a promise that is resolved when worklet processors have loaded
- `filesReady` - a promise that is resolved when all files referenced in the
  initial version of the graph have been loaded
- `playing` - a boolean tracking wether the graph is currently playing
- `closed` - a boolean tracking whether the graph has been closed

#### Methods

- `play()` - begins audio playback
- `pause()` - pauses audio playback while retaining state
- `stop()` - stops playback and returns it to its initial state by replacing the
  audio context with a fresh one and recreating the native graph
- `update(graph)` - recieves a new graph as an argument, compares it to the
  existing graph, and makes updates to the native graph. This comparison is by
  identity, so it is important that graph objects are treated as immutable or
  updates will not be detected.
- `close()` - releases resources used by the native audio context and
  permanently ends playback

### Utility Constructors

These provide a concise API for constructing virtual graphs.

```
import { build } from 'helicon';

build((node, edge) => {
  node('LFO', 'OscillatorNode', { frequency: 1 });
  node('LFO_AMT', 'GainNode', { gain: 200 });
  node('OSC', 'OscillatorNode', { frequency: 440 });
  node('DEST', 'AudioDestinationNode', {});
  edge('LFO', 0, 'LFO_AMT', 0);
  edge('LFO_AMT', 0, 'OSC', 'detune');
  edge('OSC', 0, 'DEST', 0);
});
```

`build` is called with a definition function which recieves node and edge
builder functions as arguments and an option array of
[NodeExtension](src/types/NodeExtenison.ts) objects. It returns a
[Graph](src/types/Graph.ts) object that can be used to create an
[AudioGraph](src/audioGraph/AudioGraph.ts).

The `node` builder function takes an id, node type, and params object.

The `edge` builder function takes a node id, output index, target node id, and a
target input index or param name.

## Discord

We are active on discord [here](https://discord.gg/NdBpDCHE). We would love to
answer qestions about this library or just chat about music or audio development
in general.

## Contributing

This library aims to be small and we mostly consider it feature complete, so we
are unlikely to accept code adding features outside the planned roadmap without
some discussion first. Bug fixes, tests, documentation, and ideas for
implementation details of the roadmap are welcome!
