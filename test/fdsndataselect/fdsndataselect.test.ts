// @flow

import * as fdsndataselect from '../../src/fdsndataselect.js';
import * as util from '../../src/util.js';
import {Duration, Interval} from 'luxon';

test( "query setter test", () => {
  const dsQuery = new fdsndataselect.DataSelectQuery();
  const NET = 'CO';
  const STA = 'JSC';
  const LOC = '00';
  const CHAN = 'HHZ';
  const DURATION = Duration.fromMillis(300*1000);
  const START = util.isoToDateTime('2018-01-01T12:34:45.000Z');
  const timeWindow = Interval.after(START, DURATION);
  const MIN_LENGTH = 120;
  const QUALITY = 'D';
  const FORMAT = 'miniseed';
  expect(dsQuery.networkCode(NET)).toBe(dsQuery);
  expect(dsQuery.getNetworkCode()).toBe(NET);
  expect(dsQuery.stationCode(STA)).toBe(dsQuery);
  expect(dsQuery.getStationCode()).toBe(STA);
  expect(dsQuery.locationCode(LOC)).toBe(dsQuery);
  expect(dsQuery.getLocationCode()).toBe(LOC);
  expect(dsQuery.channelCode(CHAN)).toBe(dsQuery);
  expect(dsQuery.getChannelCode()).toBe(CHAN);
  expect(dsQuery.startTime(timeWindow.start)).toBe(dsQuery);
  expect(dsQuery.getStartTime()).toBe(timeWindow.start);
  expect(dsQuery.endTime(timeWindow.end)).toBe(dsQuery);
  expect(dsQuery.getEndTime()).toBe(timeWindow.end);
  expect(dsQuery.minimumLength(MIN_LENGTH)).toBe(dsQuery);
  expect(dsQuery.getMinimumLength()).toBe(MIN_LENGTH);
  expect(dsQuery.longestOnly(true)).toBe(dsQuery);
  expect(dsQuery.getLongestOnly()).toEqual(true);
  expect(dsQuery.quality(QUALITY)).toBe(dsQuery);
  expect(dsQuery.getQuality()).toEqual(QUALITY);
  expect(dsQuery.format(FORMAT)).toBe(dsQuery);
  expect(dsQuery.getFormat()).toEqual(FORMAT);
  expect(dsQuery.nodata(404)).toBe(dsQuery);
  expect(dsQuery.getNodata()).toEqual(404);
  expect(dsQuery.specVersion("1")).toBe(dsQuery);
  expect(dsQuery.getSpecVersion()).toEqual("1");
  expect(dsQuery.port(80)).toBe(dsQuery);
  expect(dsQuery.getPort()).toEqual(80);
  expect(dsQuery.getHost()).toEqual("service.iris.edu");
  const url = dsQuery.formURL();
  expect(url).toBeDefined();
  // net is first, so no &
  expect(url).toContain('?net=');
  for(const k of ['sta', 'loc', 'cha',
   'starttime', 'endtime',
   'minimumlength', 'longestonly', 'quality', 'format', 'nodata']) {
     expect(url).toContain('&'+k+'=');
   }
   expect(url).toContain("http://"+fdsndataselect.IRIS_HOST+"/fdsnws/dataselect/1/query?");
});
