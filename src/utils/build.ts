import { Graph, Node, Edge, AudioNodeParams } from '../types/Graph';
import { nativeNodeDescriptions } from '../audioGraph';
import { NodeDescription, NodeExtension } from '../types';
import { getAudioParamNames } from './getAudioParamNames';

type NodeBuilder = (id: string, type: string, params?: AudioNodeParams) => void;

type EdgeBuilder = (
  fromNodeID: string,
  fromIndex: number,
  toNodeID: string,
  toIndexOrParam: number | string,
) => void;

export const build = (
  builder: (node: NodeBuilder, edge: EdgeBuilder) => void,
  extensions: NodeExtension[] = [],
): Graph => {
  const descriptions = extensions.reduce(
    (memo, { description, type }) => ((memo[type] = description), memo),
    { ...nativeNodeDescriptions } as { [type: string]: NodeDescription },
  );
  const nodes: { [id: string]: Node } = {};
  const edges: { [id: string]: Edge } = {};

  const defaultParams = (type: string): AudioNodeParams => {
    const description = descriptions[type];
    const defaults = Object.keys(description.params).reduce((memo: any, k) => {
      memo[k] = description.params[k].default;
      return memo;
    }, {});
    return defaults;
  };

  const paramIndex = (nodeID: string, paramName: string): number => {
    const type = nodes[nodeID].type;
    const description = descriptions[type];
    const paramIndex = getAudioParamNames(description).indexOf(paramName);
    if (paramIndex === -1)
      throw new Error(`param ${paramName} not available on node ${nodeID}`);
    return description.numberOfInputs + paramIndex;
  };

  const node: NodeBuilder = (id, type, params = {}): void => {
    nodes[id] = {
      id,
      type,
      params: { ...defaultParams(type), ...params },
    };
  };

  let edgeID = 0;
  const edge: EdgeBuilder = (
    fromNodeID,
    fromIndex,
    toNodeID,
    toIndexOrParam,
  ) => {
    const id = `E${edgeID++}`;
    edges[id] = {
      id,
      from: { node: fromNodeID, index: fromIndex },
      to: {
        node: toNodeID,
        index:
          typeof toIndexOrParam === 'number'
            ? toIndexOrParam
            : paramIndex(toNodeID, toIndexOrParam),
      },
    };
  };

  builder(node, edge);

  return { nodes, edges };
};
