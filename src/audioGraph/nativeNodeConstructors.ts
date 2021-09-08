export const nativeNodeConstructors: {
  [type: string]: {
    new (context: BaseAudioContext, ...args: any): AudioNode;
  };
} = {
  AnalyserNode,
  AudioBufferSourceNode,
  AudioDestinationNode,
  BiquadFilterNode,
  ChannelMergerNode,
  ChannelSplitterNode,
  ConstantSourceNode,
  ConvolverNode,
  DelayNode,
  DynamicsCompressorNode,
  GainNode,
  IIRFilterNode,
  OscillatorNode,
  PannerNode,
  StereoPannerNode,
  WaveShaperNode,
};
