export enum ParamType {
  AudioParam,
  AudioBuffer,
  Value,
}

export type AudioParamParamDescription = {
  type: ParamType.AudioParam;
  default: number;
  min?: number;
  max?: number;
};

export type AudioBufferParamDescription = {
  type: ParamType.AudioBuffer;
  default: AudioBuffer | null;
  writeOnce?: boolean;
};

export type ValueParamDescription = {
  type: ParamType.Value;
  default: any;
};

export type ParamDescription =
  | AudioParamParamDescription
  | AudioBufferParamDescription
  | ValueParamDescription;

export type NodeDescription = {
  numberOfInputs: number;
  numberOfOutputs: number;
  params: { [param: string]: ParamDescription };
  outputChannelCount?: number[],
  channelCount?: 1,
  channelCountMode?: 'max' | 'clamped-max' | 'explicit',
  channelInterpretation?: 'speakers' | 'discrete',
};
