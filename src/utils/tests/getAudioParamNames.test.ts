import { nativeNodeDescriptions } from '../../audioGraph';
import { getAudioParamNames } from '../getAudioParamNames';

describe('getAudioParamNames', () => {
  it('should return an array of audio param names', () => {
    expect(getAudioParamNames(nativeNodeDescriptions.BiquadFilterNode)).toEqual(
      ['frequency', 'detune', 'Q', 'gain'],
    );
  });
});
