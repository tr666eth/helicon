global.window = {
  setTimeout,
};

global.AudioParam = class AudioParam {
  setTargetAtTime() {}
};
const mockNode = (params = []) =>
  class MockNode {
    constructor() {
      params.forEach(name => (this[name] = new AudioParam()));
    }
    connect() {}
    disconnect() {}
  };

global.AudioWorkletNode = mockNode();
global.AudioScheduledSourceNode = mockNode();
global.AnalyserNode = mockNode();
global.AudioBufferSourceNode = mockNode();
global.AudioDestinationNode = mockNode();
global.BiquadFilterNode = mockNode();
global.ChannelMergerNode = mockNode();
global.ChannelSplitterNode = mockNode();
global.ConstantSourceNode = mockNode();
global.ConvolverNode = mockNode();
global.DelayNode = mockNode();
global.DynamicsCompressorNode = mockNode();
global.GainNode = mockNode(['gain']);
global.IIRFilterNode = mockNode();
global.OscillatorNode = mockNode();
global.PannerNode = mockNode();
global.StereoPannerNode = mockNode();
global.WaveShaperNode = mockNode();

global.AudioContext = class {
  constructor() {
    this.audioWorklet = {
      addModule() {},
    };
    this.destination = new GainNode();
  }
  suspend() {}
  resume() {}
  close() {}
};
