import { NodeDescription, ParamType } from '../types';

export const nativeNodeDescriptions: {
  [type: string]: NodeDescription;
} = {
  AnalyserNode: {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    params: {
      fftSize: {
        type: ParamType.Value,
        default: 2048,
      },
      minDecibels: {
        type: ParamType.Value,
        default: -100,
      },
      maxDecibels: {
        type: ParamType.Value,
        default: -30,
      },
      smoothingTimeConstant: {
        type: ParamType.Value,
        default: 0.8,
      },
    },
  },
  AudioBufferSourceNode: {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    params: {
      buffer: {
        type: ParamType.AudioBuffer,
        default: null,
        writeOnce: true,
      },
      loop: {
        type: ParamType.Value,
        default: false,
      },
      loopStart: {
        type: ParamType.Value,
        default: 0,
      },
      loopEnd: {
        type: ParamType.Value,
        default: 0,
      },
      detune: {
        type: ParamType.AudioParam,
        default: 0,
      },
      playbackRate: {
        type: ParamType.AudioParam,
        default: 1,
      },
    },
  },
  AudioDestinationNode: {
    numberOfInputs: 1,
    numberOfOutputs: 0,
    params: {},
  },
  BiquadFilterNode: {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    params: {
      frequency: {
        default: 350,
        type: ParamType.AudioParam,
      },
      detune: {
        type: ParamType.AudioParam,
        default: 0,
      },
      Q: { type: ParamType.AudioParam, default: 1 },
      gain: { type: ParamType.AudioParam, default: 0 },
      type: {
        type: ParamType.Value,
        default: 'lowpass',
      },
    },
  },
  ChannelMergerNode: {
    numberOfInputs: 6, // TODO: variable
    numberOfOutputs: 1,
    params: {},
  },
  ChannelSplitterNode: {
    numberOfInputs: 1,
    numberOfOutputs: 6, // TODO: variable
    params: {},
  },
  ConstantSourceNode: {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    params: {
      offset: {
        type: ParamType.AudioParam,
        default: 1,
      },
    },
  },
  ConvolverNode: {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    params: {
      buffer: {
        type: ParamType.AudioBuffer,
        default: null,
        writeOnce: false,
      },
      normalize: {
        type: ParamType.Value,
        default: true,
      },
    },
  },
  DelayNode: {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    params: {
      delayTime: {
        type: ParamType.AudioParam,
        default: 0,
      },
    },
  },
  DynamicsCompressorNode: {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    params: {
      threshold: {
        type: ParamType.AudioParam,
        default: -24,
      },
      knee: {
        type: ParamType.AudioParam,
        default: 30,
      },
      ratio: {
        type: ParamType.AudioParam,
        default: 12,
      },
      attack: {
        type: ParamType.AudioParam,
        default: 0.003,
      },
      release: {
        type: ParamType.AudioParam,
        default: 0.25,
      },
    },
  },
  GainNode: {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    params: {
      gain: {
        type: ParamType.AudioParam,
        default: 1,
      },
    },
  },
  IIRFilterNode: {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    params: {},
  },
  OscillatorNode: {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    params: {
      frequency: {
        type: ParamType.AudioParam,
        default: 440,
      },
      detune: {
        type: ParamType.AudioParam,
        default: 0,
      },
      type: {
        type: ParamType.Value,
        default: 'sine',
      },
    },
  },
  PannerNode: {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    params: {
      coneInnerAngle: {
        type: ParamType.Value,
        default: 360,
      },
      coneOuterAngle: {
        type: ParamType.Value,
        default: 360,
      },
      coneOuterGain: {
        type: ParamType.Value,
        default: 0,
      },
      distanceModel: {
        type: ParamType.Value,
        default: 'inverse',
      },
      panningModel: {
        type: ParamType.Value,
        default: 'equalpower',
      },
      maxDistance: {
        type: ParamType.Value,
        default: 10000,
      },
      orientationX: {
        type: ParamType.AudioParam,
        default: 1,
      },
      orientationY: {
        type: ParamType.AudioParam,
        default: 0,
      },
      orientationZ: {
        type: ParamType.AudioParam,
        default: 0,
      },
      positionX: {
        type: ParamType.AudioParam,
        default: 0,
      },
      positionY: {
        type: ParamType.AudioParam,
        default: 0,
      },
      positionZ: {
        type: ParamType.AudioParam,
        default: 0,
      },
      refDistance: {
        type: ParamType.Value,
        default: 1,
      },
      rollOffFactor: {
        type: ParamType.Value,
        default: 1,
      },
    },
  },
  StereoPannerNode: {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    params: {
      pan: {
        type: ParamType.AudioParam,
        min: -1,
        max: 1,
        default: 0,
      },
    },
  },
  WaveShaperNode: {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    params: {
      curve: {
        type: ParamType.Value,
        default: null,
      },
      oversample: {
        type: ParamType.Value,
        default: 'none',
      },
    },
  },
};
