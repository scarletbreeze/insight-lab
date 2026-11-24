export function sitePath(route = '') {
  const path = route.replace(/^\/+|\/+$/g, '');
  return import.meta.env.BASE_URL.replace(/\/$/, '') + (path ? '/' + path + '/' : '/');
}
