import { MethodProxyValue } from './proxy.type';

export type MockConfigHeaders = Record<string, string>;

export type MockFolderConfig = {
  prefix?: string;
  delay?: number;
  proxy?: MethodProxyValue;
  headers?: MockConfigHeaders;
  enabled?: boolean;
  include?: string[];
  exclude?: string[];
  stripPrefix?: boolean;
  proxyUnmatched?: string;
  storeNamespace?: string;
};

export type MockConfig = {
  delay?: number;
  proxy?: MethodProxyValue;
  headers?: MockConfigHeaders;
  strictDuplicates?: boolean;
  port?: number;
  folders?: Record<string, MockFolderConfig>;
};

export type MockFileDefaults = {
  prefix?: string;
  delay?: number;
  proxy?: MethodProxyValue;
  headers?: MockConfigHeaders;
  stripPrefix?: string;
  storeNamespace?: string;
};

export type ProxyUnmatchedMount = {
  prefix: string;
  target: string;
  stripPrefix?: string;
};
