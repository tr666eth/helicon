export type AudioNodeParams = { readonly [name: string]: any };

export type Node = {
  readonly id: string;
  readonly type: string;
  readonly params: AudioNodeParams;
};

export type IO = {
  readonly node: string;
  readonly index: number;
};

export type Edge = {
  readonly id: string;
  readonly from: IO;
  readonly to: IO;
};

export type Graph = {
  readonly nodes: { [id: string]: Node };
  readonly edges: { [id: string]: Edge };
};
