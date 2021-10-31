import { NodeDescription, ParamType } from '../types';

export const createNode = (
  type: string,
  {
    numberOfInputs,
    numberOfOutputs,
    outputChannelCount,
    channelCount,
    channelCountMode,
    channelInterpretation,
    params,
  }: NodeDescription,
): {
  new (context: BaseAudioContext, params: any): AudioWorkletNode;
} => {
  class AnonymousNode extends AudioWorkletNode {
    constructor(context: BaseAudioContext, values: { [k: string]: any }) {
      // divide values into processor options and parameter data
      const processorOptions: { [k: string]: any } = {};
      const parameterData: { [k: string]: number } = {};
      Object.entries(values).forEach(([k, v]) => {
        if (params[k].type === ParamType.AudioParam) {
          parameterData[k] = v;
        } else {
          processorOptions[k] = v;
        }
      });

      // call super
      super(context, `${type}Processor`, {
        numberOfInputs,
        numberOfOutputs,
        outputChannelCount,
        channelCount,
        channelCountMode,
        channelInterpretation,
        processorOptions,
        parameterData,
      });

      // set parameters at top level, create getters and setters for values
      Object.entries(params).forEach(([k, { type, default: d }]) => {
        if (type === ParamType.AudioParam) {
          (this as any)[k] = this.parameters.get(k);
        } else {
          const internalKey = `_${k}`;
          (this as any)[internalKey] = values[k] ?? d;
          Object.defineProperty(this, k, {
            get() {
              return this[internalKey];
            },
            set(v) {
              this[internalKey] = v;
              this.port.postMessage([k, v]);
            },
          });
        }
      });
    }
  }
  Object.defineProperty(AnonymousNode, 'name', { value: type });
  return AnonymousNode;
};
