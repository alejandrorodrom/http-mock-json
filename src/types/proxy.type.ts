export type ProxyTarget = {
  target: string;
  path?: string;
};

export type ProxyValue = string | true | ProxyTarget;

export type MethodProxyValue = string | ProxyTarget;
