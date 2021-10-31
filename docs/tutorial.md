# Helicon Tutorial

This tutorial will walk through setting up the helicon library and building a
simple subtractive synth voice playing an arpeggio.

# WebAudio API

Helicon is built on top of the native web audio API, so we will start with a
brief description of web audio. MDN has some great and much more complete
docs [here](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API]).

WebAudio is a relatively new standard that allows audio synthesis / processing
directly in web browsers. It models audio processing as a graph, with nodes that
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

Helicon eschews this type of parameter scheduling entirely. Instead, all
modulation is done as part of the audio graph via custom nodes for things like
sequences, rhythms, and envelopes. There are a few reasons for this approach -
one is that it allows flexible modulation from within the audio thread w/o
requiring access to the main thread. This is important for helicon's goal of a
standard embeddable format for local synthesis. A second is that custom nodes
are a natural extension format - they are easily sharable between projects and
portable to other libraries. Finally, it offers a natural declarative
programming model for building up complex modulatation from simple building
blocks that will be familiar to anyone who has used a modular synthesizer.

# Basic setup of our synth

For our simple subtractive synth, we will define custom nodes for modulation - a
SequenceNode and a DecayEnvelopeNode, and then we will use four native nodes -
an OscillatorNode serving as a clock, an OscillatorNode and BiquadFilterNode for
our synth voice, and a DestinationNode sending audio out from our processing
graph to the user's system.

We will create custom nodes from scratch in this tutorial to show helicon's
extension API, but a long term goal is to have a large library of open source
nodes so that most projects can be built from existing nodes.

# Setting up Helicon

If you are familiar w/ a javascript development toolchain, helicon is written in
typescript and can be included in a project via npm. For the purposes of this
tutorial, we will work with standard javascript in a single html file and
include a hosted version of helicon via a script tag. You can follow along by
repeating the steps locally, or you can download and run the html files in
this directory.

Start by loading the helicon library from a cdn:

```html
<!DOCTYPE html>
<html>
  <body>
    <script src="https://unpkg.com/helicon@0.2.0/dist/index.js" />
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
    <button id="play">⏯️</button>
    <button id="stop">⏹</button>

    <script src="https://unpkg.com/helicon@0.2.0/dist/index.js"></script>
    <script>
      const { AudioGraph, build } = helicon;

      // We will start by creating a graph with an oscillator playing through a
      // lowpass filter.  Helicon's `AudioGraph` class accepts a serializable
      // data only virtual graph, loads any required audio files or worklet
      // processors for custom nodes, and creates and plays the native graph.
      const ag = new AudioGraph(
        // We use `build` from helicon to easily create the data only virtual
        // graph. We will create oscillator, filter, and destination nodes,
        // connecting the output of the oscillator node to the filter and the
        // output of the filter to the destination node.
        build((node, edge) => {
          // We need to create the nodes first. The first argument for the first
          // node here, 'OSC', is an id which we will use later to reference the
          // node when defining edges.  It needs to be unique. The second
          // argument, 'OscillatorNode', is the type of the node we are
          // creating, and the third is an object specifying values for the
          // node's parameters.  The third argument can be skipped if the node
          // has no parameters or if we are happy with default values.
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

      // The browser requires a user interaction to start audio playback, so to
      // hear the graph we constructed, we need to add play/pause/stop buttons.
      // Helicon's audio graph exposes click-free play, pause and stop methods
      // that the web audio api does not provide natively.
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

If you download the step 1 [html file](tutorial-step-1.html) and open it in a
browser, you should be able to click the play button and hear a 220hz tone.

# Step 2 - Adding our custom sequence node

To play more than this single tone, we need to modulate the pitch of the
oscillator. To do this, we will create a sequence node which will receive a
sequence of numbers and a clock signal as input, track its position in the
sequence internally, advance the position when the clock signal changes from
negative to positive, and output the value of the sequence at the current
position. We can connect the output of our sequence node to the detune input of
our oscillator node to play a melody.

Creating a custom node in helicon has two parts - an AudioWorkletProcessor
subclass with actual audio processing code which will run in the audio thread,
and a description which tells helicon how to create and interact with an
AudioWorkletNode on the main thread.

Audio worklet processors need to be loaded as seperate scripts, so to continue
using a single file for this tutorial, we will define the processor in a
seperate script tag, read its contents and convert them to a data url.

```html
<!DOCTYPE html>
<html>
  <body>
    <button id="play">⏯️</button>
    <button id="stop">⏹</button>

    <script src="https://unpkg.com/helicon@0.2.0/dist/index.js"></script>
    <script id="sequenceProcessor" type="text/template">
      // Here we define a processor node for our sequence. `registerProcessor`
      // is a global function in the audio worklet scope.  We give it a name and
      // pass a subclass of AudioWorkletProcessor.  We can use the name we pass
      // here to identify the processor when constructing AudioWorkletNodes on
      // the main thread.
      registerProcessor(
        'SequenceNodeProcessor',
        class SequenceNodeProcessor extends AudioWorkletProcessor {
          // This tells the audio API which parameters to make available on
          // worklet nodes using this processor.  Here we create one parameter,
          // clock, which will trigger our processor to step forward in the
          // sequence.
          static get parameterDescriptors() {
            return [
              {
                name: 'clock',
                defaultValue: 0,
                // When creating audio parameters, there are two possible values
                // for automationRate.  The first, `a-rate` means the sample
                // rate of the parameter input will match the sample rate of
                // audio output. The second, `k-rate`, means that we will have
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
            // the constructor of the AudioWorkletNode using this processor will
            // pass the initial value of the sequence from the main thread.
            this.sequence = options.processorOptions.sequence;

            // after the processor is constructed, communication between the
            // main and audio threads is only possible through message passing -
            // so here we use messages to update the sequence.
            this.port.onmessage = ({ data }) => {
              this.sequence = data;
              // when the sequence is udpated, we make sure the current position
              // is not larger than the length of the sequence.
              this.position =
                data.length === 0 ? 0 : this.position % data.length;
            };
          }

          // The most important part of the processor is its process method,
          // which recieves buffers for its inputs and parameters and fills
          // buffers for its output.
          process(
            // inputs and outputs here are arrays of inputs, each of which is
            // an array of channels, with each channel being a Float32Array
            // filled with values representing individual samples.  Here we
            // destructure the single channel of the first and only output.
            inputs,
            [[output]],
            // Parameters are passed as an object, with parameter names as keys
            // and Float32Arrays as values.  For k-rate parameters like clock,
            // the array only has a single element.  Here we destructure the
            // single value of the k-rate clock param.
            { clock: [clock] },
          ) {
            // if the value of the clock param rises across zero, we increment
            // our position in the sequence
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
          // graph to the worklet processor (like sequence in this example)
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
          // Processor would typically be the url to a seperate script file.
          // Because we defined the processor inline here, we read its text and
          // create a data url.
          processor: `data:application/javascript;base64,${btoa(
            document.getElementById('sequenceProcessor').text,
          )}`,
        },
      ];

      // create graph playing a major 7th arpeggio
      const ag = new AudioGraph(
        build((node, edge) => {
          node('CLOCK', 'OscillatorNode', { type: 'square', frequency: 4 });
          node('SEQ', 'SequenceNode', {
            // The values here are in cents, or 100ths of semitone.  We will
            // connect the output of our sequence to the detune parameter of our
            // oscillator node.  Oscillators, filters, and other nodes working
            // with pitch typically have both frequency and detune parameters.
            // Frequency is linear in hz, while detune is exponential in cents
            // and is more useful for sequencing melodies.
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

If you open the step 2 [html file](tutorial-step-2.html) you should hear the
umodulated voice play a familiar melody.

# Step 3 - Adding our envelope node

Now we have a melody, but with a very simple voice. As a final step, we will
create a decay envelope to modulate the filter cutoff. This will be another
custom node triggered by our clock.

We will also use a native oscillator node as an LFO to modulate the decay time
parameter of our custom node. This is a great example of the composability of
modulation that the graph based model of helicon and web audio allows.

```html
<!DOCTYPE html>
<html>
  <body>
    <button id="play">⏯️</button>
    <button id="stop">⏹</button>

    <script src="https://unpkg.com/helicon@0.2.0/dist/index.js"></script>
    <script id="sequenceProcessor" type="text/template">
      // our sequence processor from the previous step
      registerProcessor(
        'SequenceNodeProcessor',
        class SequenceNodeProcessor extends AudioWorkletProcessor {
          static get parameterDescriptors() {
            return [
              {
                name: 'clock',
                defaultValue: 0,
                automationRate: 'k-rate',
              },
            ];
          }
          lastClock = 0;
          position = 0;

          constructor(options) {
            super(options);
            this.sequence = options.processorOptions.sequence;
            this.port.onmessage = ({ data }) => {
              this.sequence = data;
              this.position =
                data.length === 0 ? 0 : this.position % data.length;
            };
          }

          process(
            inputs,
            [[output]],
            { clock: [clock] },
          ) {
            if (this.lastClock < 0 && clock >= 0) {
              this.position = (this.position + 1) % this.sequence.length;
            }
            this.lastClock = clock;

            output.fill(this.sequence[this.position]);

            return true;
          }
        },
      );
    </script>
    <script id="decayProcessor" type="text/template">
      // Here we add a our decay processor.  It is triggered by a clock
      // parameter similarly to our sequence node, but we also add a second
      // parameter for decayTime.
      registerProcessor(
        'DecayNodeProcessor',
        class DecayNodeProcessor extends AudioWorkletProcessor {
          static get parameterDescriptors() {
            return [
              {
                name: 'clock',
                defaultValue: 0,
                automationRate: 'k-rate',
              },
              {
                name: 'decayTime',
                defaultValue: 0.1,
                minValue: 0.001,
                automationRate: 'k-rate',
              }
            ];
          }

          // We need to keep track of the previous clock value and the current
          // level of the envelope.
          lastClock = 0;
          value = 0;

          process(
            inputs,
            [[output]],
            { clock: [clock], decayTime: [decayTime] },
          ) {
            if (this.lastClock <= 0 && clock > 0) {
              // When the clock param crosses zero, we trigger the envelope and
              // set value to 1.
              this.value = 1;
            }
            this.lastClock = clock;

            // Here we calculate the amount the envelope will change per sample.
            const delta = 1 / decayTime / sampleRate;

            // And we generate the output, reducing processing samples only
            // while value is positive and reducing value as each sample is
            // processed.
            for (let i = 0; i < output.length && this.value > delta; i++) {
              output[i] = this.value;
              this.value -= delta;
            }

            return true;
          }
        },
      );
    </script>
    <script>
      const { AudioGraph, ParamType, build } = helicon;

      // create extensions referencing our processors
      const extensions = [
        {
          type: 'SequenceNode',
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
          processor: `data:application/javascript;base64,${btoa(
            document.getElementById('sequenceProcessor').text,
          )}`,
        },
        {
          type: 'DecayNode',
          description: {
            numberOfInputs: 0,
            numberOfOutputs: 1,
            params: {
              clock: { type: ParamType.AudioParam, default: 0 },
              decayTime: {
                type: ParamType.AudioParam,
                default: 0.1,
                min: 0.001,
              },
            },
          },
          processor: `data:application/javascript;base64,${btoa(
            document.getElementById('decayProcessor').text,
          )}`,
        },
      ];

      // create graph playing a major 7th apreggio with a subtractive synth
      // voice
      const ag = new AudioGraph(
        build((node, edge) => {
          node('CLOCK', 'OscillatorNode', { type: 'square', frequency: 4 });
          node('SEQ', 'SequenceNode', {
            sequence: [0, 400, 700, 1100, 1200, 1100, 700, 400],
          });
          // Here we create an instance of our new decay node, and a gain node
          // to scale its range up to 3600 cents or 3 octaves.
          node('ENV', 'DecayNode', { decayTime: 0.4 });
          node('ENV_AMT', 'GainNode', { gain: 3600 });
          // Here we create an oscillator with frequency 0.0625 hz and another
          // gain node to scale its output to 0.25.  We will use this to
          // modulate the decay time param of our decay node.
          node('LFO', 'OscillatorNode', { frequency: 0.0625 });
          node('LFO_AMT', 'GainNode', { gain: 0.25 });
          // And here we create our oscillator and filter nodes for the
          // subtractive synth voice.
          node('OSC', 'OscillatorNode', { type: 'sawtooth', frequency: 220 });
          node('FILT', 'BiquadFilterNode', {
            // we reduced the filter frequency so that it will mute the sound
            // when the envelope is not on
            frequency: 110,
            Q: 1,
          });
          node('DEST', 'AudioDestinationNode');

          edge('CLOCK', 0, 'SEQ', 'clock');
          edge('SEQ', 0, 'OSC', 'detune');

          // We connect our clock to the clock param of our decay node, connect
          // the output of our decay node to our gain node, and then connect
          // the output of the gain node ot the detune parameter of our filter
          // node
          edge('CLOCK', 0, 'ENV', 'clock');
          edge('ENV', 0, 'ENV_AMT', 0);
          edge('ENV_AMT', 0, 'FILT', 'detune');

          // We connect up our slow oscillator and gain node, to modulate the
          // decay time param of our decay node.
          edge('LFO', 0, 'LFO_AMT', 0);
          edge('LFO_AMT', 0, 'ENV', 'decayTime');

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

You can find the final html file which will play our finished example
[here](tutorial-step-3.html)
