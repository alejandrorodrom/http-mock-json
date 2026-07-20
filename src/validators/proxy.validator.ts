import { LocalIssue } from '../types/validation.type';
import { ProxyTarget } from '../types/proxy.type';
import { hasProperty, isExisting, isObject } from '../scripts/guards.script';
import { isHttpUrl } from '../scripts/http-url.script';

type ValidateProxyOptions = {
  allowTrue?: boolean;
};

export const validateProxyValue = (
  endpoint: string,
  method: string,
  proxy: unknown,
  options: ValidateProxyOptions = {}
): LocalIssue[] => {
  const { allowTrue = true } = options;
  const errors: LocalIssue[] = [];

  if (proxy === true) {
    if (!allowTrue) {
      errors.push({
        endpoint,
        method,
        message: 'The "proxy" must be a URL string or an object with "target"'
      });
    }

    return errors;
  }

  if (typeof proxy === 'string') {
    if (!isHttpUrl(proxy)) {
      errors.push({
        endpoint,
        method,
        message: 'The "proxy" must be a valid http or https URL'
      });
    }

    return errors;
  }

  if (!isObject(proxy)) {
    errors.push({
      endpoint,
      method,
      message: allowTrue
        ? 'The "proxy" must be a URL string, true, or an object with "target"'
        : 'The "proxy" must be a URL string or an object with "target"'
    });

    return errors;
  }

  const proxyObject = proxy as ProxyTarget;

  if (!isExisting(proxyObject.target)) {
    errors.push({
      endpoint,
      method,
      message: 'The "proxy.target" property is required'
    });

    return errors;
  }

  if (typeof proxyObject.target !== 'string' || !isHttpUrl(proxyObject.target)) {
    errors.push({
      endpoint,
      method,
      message: 'The "proxy.target" must be a valid http or https URL'
    });
  }

  if (hasProperty(proxyObject, 'path') && typeof proxyObject.path !== 'string') {
    errors.push({
      endpoint,
      method,
      message: 'The "proxy.path" must be a string'
    });
  }

  return errors;
};
