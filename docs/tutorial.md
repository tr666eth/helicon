# Helicon Tutorial

This tutorial will walk through setting up the helicon library and building a
simple subtractive synth voice playing an arpeggio.

# WebAudio API

Helicon is built on top of the native web audio API, so we will start with a
brief description of web audio. MDN has some great and much more complete
docs [here](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API]).

WebAudio is a relatively new standard that allows audio synthesis / processing
directly in the browser. It models audio processing as a graph, with nodes that
either create or process audio signals. AudioNodes have inputs, outputs, and
parameters. Outputs can be connected to parameters to modulate some aspect of
the processing of another node, or they can be connected to inputs of other
nodes so that their signals can be further processed.

Browsers include many native nodes which cover many of the fundamentals of audio
synthesis - oscillators, filters, delay, convolution, waveshaping, and more.
You can also define your own nodes to run custom processing in a sandboxed and
high performance audio thread.

Parameters of audio nodes have imperitive APIs allowing scheduling of changes to
their values. A standard way to work with web audio is to create a sequence on
the main thread and a scheduler that looks ahead of the playback position and
creates and destroys nodes or schedules changes to their parameters. Libaries
like [tonejs](https://tonejs.github.io/) take this approach and work really well
for traditional composition and playing back polyphonic sequences.

Helicon eschews this type of parameter scheduling entirely, instead
accomplishing all modulation as part of the audio graph. Mostly this is done via
custom nodes. There are two reasons for this approach - one is that it allows
complete flexibility in modulation w/o access to the main thread. This is
important for helicon's goal of a standard embeddable format for local
synthesis. A second is that it allows composition of modulation, letting you
build up complex patterns from simple building blocks in a way thats analagous
to a modular synthesizer. For example you can have an LFO modulate the frequency
of a second LFO which modulates the decay time of an envelope.

# Basic setup of our synth

For our simple subtractive synth, we will define some custom nodes for
modulation - a SequenceNode and a DecayEnvelopeNode, and then we will use four
native nodes - an OscillatorNode serving as a clock, an OscillatorNode and
BiquadFilterNode for our synth voice, and a DestinationNode sending audio out
from our processing graph to the user's system.

# Setting up Helicon

If you are familiar w/ a javascript development toolchain, helicon is written in
typescript and can be included in a project via npm. For the purposes of this
tutorial though, we will work with standard javascript in a single html file and
include a hosted version of helicon via a script tag. You can follow along by
repeating the steps locally, or you can use the existing files in this
directory.

Start by creating an html file using a text editor:

```html
<!DOCTYPE html>
<html>
  <body>
    <script src="https://unpkg.com/helicon@0.1.0/dist/index.js" />
    <script>
      // helicon is available to our custom code here
    </script>
  </body>
</html>
```

# Step 1 - Creating a graph using our native nodes

Now we can use helicon to quickly define an audio graph starting with our native
nodes.

```html
<!DOCTYPE html>
<html>
  <body>
    <script src="https://unpkg.com/helicon@0.1.0/dist/index.js"></script>
    <script>
      const { AudioGraph, build } = helicon;

      // We will start by creating a graph with an oscillator playing through a
      // lowpass filter.
      const ag = new AudioGraph(
        // We use `build` from helicon to easily create the data only virtual
        // graph. We will create oscillator, filter, and destination nodes.  We
        // will connect the output of the oscillator node to the filter and the
        // output of the filter to our destination node.
        build((node, edge) => {
          // We need to create the nodes first. The first argument for the first
          // node here, 'OSC', is an id which we will use later to reference the
          // node when defining edges.  It needs to be unique. The second
          // argument, 'OscillatorNode', is the type of the node we are
          // creating, and the third is an object specifying parameters for
          // the node. The third argument can be skipped if the node has no
          // parameters or if we are happy with the defaults.
          node('OSC', 'OscillatorNode', { type: 'sawtooth', frequency: 220 });
          node('FILT', 'BiquadFilterNode', {
            type: 'lowpass',
            frequency: 440,
            Q: 4,
          });
          node('DEST', 'AudioDestinationNode');

          // After creating nodes, we can create edges to connect them.  The
          // first argument to edge is the id of the output node, and the second
          // is the index of its output.  We start counting these indices from
          // zero, so this is referencing the first and only output of our
          // OscillatorNode.  The third and fourth are the id and input index
          // for the input node.  If we were connecting an output to a parameter
          // instead of an input, we would pass the paramter name as the fourth
          // argument in place of the input index.
          edge('OSC', 0, 'FILT', 0);
          edge('FILT', 0, 'DEST', 0);
        }),
      );
    </script>
  </body>
</html>
```

# Step 2 - Adding UI to control playback

The browser requires a user interaction to start audio playback, so to hear the
graph we constructed, we need to add play/pause/stop buttons.

```html
<!DOCTYPE html>
<html>
  <body>
    <button id="play">⏯️</button>
    <button id="stop">⏹</button>

    <script src="https://unpkg.com/helicon@0.1.0/dist/index.js"></script>
    <script>
      const { AudioGraph, build } = helicon;

      // create graph playing a 220hz tone through a lowpass filter
      const ag = new AudioGraph(
        build((node, edge) => {
          node('OSC', 'OscillatorNode', { type: 'sawtooth', frequency: 220 });
          node('FILT', 'BiquadFilterNode', {
            frequency: 440,
            Q: 4,
          });
          node('DEST', 'AudioDestinationNode');

          edge('OSC', 0, 'FILT', 0);
          edge('FILT', 0, 'DEST', 0);
        }),
      );

      // Make buttons control playback.  Helicon's audio graph exposes
      // click-free play, pause and stop methods that the web audio api does not
      // provide natively.
      document
        .getElementById('play')
        .addEventListener('click', () => (ag.playing ? ag.pause() : ag.play()));
      document
        .getElementById('stop')
        .addEventListener('click', () => ag.stop());
    </script>
  </body>
</html>
```

After adding these buttons, you should be able to open the html file, click
play, and hear a 220hz tone.

# Step 3 - Adding our custom sequence node

To play more than this single tone, we need to modulate the pitch of the
oscillator. To do this, we will create a sequence node. It will receive a
sequence of numbers and a clock signal as input, track its position in the
sequence internally, output the value of the sequence at the current position,
and advance the position when the clock signal changes from negative to
positive. We can connect this output to the detune input of our oscillator node
to play a melody.

We will create custom nodes from scratch in this tutorial to illustrate how
extensions work, but the long term goal for helicon is to have a large library
of open source nodes using its extension format so that most projects can be
built from existing nodes.

Audio worklet processors need to be loaded as entirely seperate scripts, so to
continue using a single file for this tutorial, we will define the processor in
a seperate script tag, read its contents, and use the Blob API to create a
virtual file in memeory.

```html
<!DOCTYPE html>
<html>
  <body>
    <button id="play">⏯️</button>
    <button id="stop">⏹</button>

    <script src="https://unpkg.com/helicon@0.1.0/dist/index.js"></script>
    <script id="sequenceProcessor" type="text/template">
      // Define a processor node for our sequence.  `registorProcessor` is a
      // global function in the audio worklet scope.  We give it a name and pass
      // a subclass of AudioWorkletProcessor.
      registerProcessor(
        'SequenceProcessor',
        class SequenceProcessor extends AudioWorkletProcessor {
          // This tells the audio API which parameters to make available on
          // worklet nodes using this processor
          static get parameterDescriptors() {
            return [
              {
                name: 'clock',
                defaultValue: 0,
                // there are two possible values for automationRate - a-rate
                // meaning the sample rate of the parameter input will match the
                // sample rate of audio output.  k-rate means that we will have
                // a single value of the parameter per buffer.  A typical sample
                // rate is 48000hz, buffer size is 128, and we need two samples
                // per cycle, so using k-rate lets us clock this up to 187hz.
                automationRate: 'k-rate',
              },
            ];
          }

          // the sequence processor needs to keep track of its position and the
          // previous value of clock between processing frames.
          lastClock = 0;
          position = 0;

          constructor(options) {
            super(options);
            this.sequence = options.processorOptions.sequence;
            // we don't update the graph in this tutorial, communication between
            // the main and audio threads is only possible through message
            // passing - so this is used to pass updates to the sequence.
            this.port.onmessage = ({ data }) => {
              this.sequence = data;
              // when the sequence is udpated, we make sure the current position
              // is not larger than the length of the sequence.
              this.position =
                data.length === 0 ? 0 : this.position % data.length;
            };
          }

          // The most important part of the processor itself is a process
          // method, which recieves buffers for its inputs and parameters and
          // fills buffers for its output.
          process(
            _,
            // inputs and outputs here are arrays of inputs, each of which is
            // an array of channels, with each channel being a Float32Array whos
            // values represent individual samples
            [[output]],
            // Parameters are passed as an object, with parameter names as keys
            // and Float32Arrays as values.  For k-rate parameters like clock,
            // the array only has a single element.
            { clock: [clock] },
          ) {
            // if the value of the clock param rises across zero, we increment
            // the position
            if (this.lastClock < 0 && clock >= 0) {
              this.position = (this.position + 1) % this.sequence.length;
            }
            this.lastClock = clock;

            // we fill the output with the value from the sequence at the
            // current position
            output.fill(this.sequence[this.position]);

            // returning true from process tells the web audio API to keep the
            // node alive
            return true;
          }
        },
      );
    </script>
    <script>
      const { AudioGraph, ParamType, build } = helicon;

      // create extension referencing our processor
      const extensions = [
        {
          // `type` here names the new node we are adding - we will use this in
          // `build` below
          type: 'SequenceNode',
          // this description is used internally by helicon to construct nodes.
          // params here describes both their true audio parameters (like clock
          // here) and any other values that can be passed from the virtual
          // graph to the worklet processor (like sequence here)
          description: {
            numberOfInputs: 0,
            numberOfOutputs: 1,
            params: {
              clock: { type: ParamType.AudioParam, default: 0 },
              sequence: {
                type: ParamType.Value,
                default: [],
              },
            },
          },
          // This is the main thread AudioNode class - its constructor
          // configures the number of inputs and outputs and passes data to the
          // worklet processor via processorOptions and parameterValues.
          node: class SequenceNode extends AudioWorkletNode {
            constructor(context, { clock, sequence = [] }) {
              super(context, 'SequenceProcessor', {
                numberOfInputs: 0,
                numberOfOutputs: 1,
                outputChannelCount: [1],
                channelCount: 1,
                channelCountMode: 'explicit',
                channelInterpretation: 'discrete',
                processorOptions: { sequence },
                parameterValues: { clock },
              });
              this.clock = this.parameters.get('clock');
              this._seqeuence = sequence;
            }

            // This is the other side of the message passing code we saw in the
            // processor.  When sequence changes on the main thread, we need to
            // pass it to the audio thread via postMessage.  We use
            // getters/setters here to make sure that changes are not missed.
            // This is a common pattern for main/audio thread communication that
            // we will use any time we need to send data outside of audio
            // params.
            get sequence() {
              return this._sequence;
            }
            set sequence(sequence) {
              this._sequence = sequence;
              this.port.postMessage(new Float32Array(sequence));
            }
          },
          processor: `data:application/javascript;base64,${btoa(
            document.getElementById('sequenceProcessor').innerText,
          )}`,
        },
      ];

      // create graph playing a 220hz tone through a lowpass filter
      const ag = new AudioGraph(
        build((node, edge) => {
          node('CLOCK', 'OscillatorNode', { type: 'square', frequency: 4 });
          node('SEQ', 'SequenceNode', {
            // The values here are in cents, or 100ths of semitone.  We will
            // connect the output of our sequence to the detune parameter of our
            // oscillator node.  This sequence is a major 7th arepggio.
            sequence: [0, 400, 700, 1100, 1200, 1100, 700, 400],
          });
          node('OSC', 'OscillatorNode', { type: 'sawtooth', frequency: 220 });
          node('FILT', 'BiquadFilterNode', {
            frequency: 440,
            Q: 4,
          });
          node('DEST', 'AudioDestinationNode');

          edge('CLOCK', 0, 'SEQ', 'clock');
          edge('SEQ', 0, 'OSC', 'detune');
          edge('OSC', 0, 'FILT', 0);
          edge('FILT', 0, 'DEST', 0);
        }, extensions),
        extensions,
      );

      // make buttons control playback
      document
        .getElementById('play')
        .addEventListener('click', () => (ag.playing ? ag.pause() : ag.play()));
      document
        .getElementById('stop')
        .addEventListener('click', () => ag.stop());
    </script>
  </body>
</html>
```

# Step 4 - Adding our envelope node
