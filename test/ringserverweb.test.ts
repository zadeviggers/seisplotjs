// @flow

import * as ringserverweb from '../src/ringserverweb.js';


test( "query setter test", () => {
  const dsQuery = new ringserverweb.RingserverConnection();

  expect(dsQuery.port(80)).toBe(dsQuery);
  expect(dsQuery.getPort()).toEqual(80);
  expect(dsQuery.getHost()).toEqual(ringserverweb.IRIS_HOST);
  const url = dsQuery.formBaseURL();
  expect(url).toBeDefined();
  expect(url).toContain("http://"+ringserverweb.IRIS_HOST);
});
