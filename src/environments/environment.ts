/**
 * Development environment.
 * `useMockApi` routes every `/api/*` request through the in-browser mock backend
 * (see `core/mock-api`). Point `apiUrl` to a real server and set it to `false` to go live.
 */
export const environment = {
  production: false,
  appName: 'PeopleCore HRMS',
  apiUrl: '/api',
  useMockApi: true,
  /** Simulated network latency range for the mock API, in ms. */
  mockLatency: { min: 120, max: 320 },
  currency: 'USD',
};
