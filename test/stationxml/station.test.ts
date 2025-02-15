// @flow

import {Network, Station, Channel} from '../../src/stationxml';

test("simple station", () => {
  const NET_CODE = "AA";
  const STA_CODE = "JSC";
  const net = new Network(NET_CODE);
  const station = new Station(net, STA_CODE);
  station.latitude = 47;
  expect(station.latitude).toBe(47);
  expect(station.stationCode).toBe(STA_CODE);
});

test("simple channel", () => {

    const NET_CODE = "AA";
    const STA_CODE = "JSC";
    const LOC_CODE = "00";
    const CHAN_CODE = "BHZ";
    const net = new Network(NET_CODE);
    const station = new Station(net, STA_CODE);
    const channel = new Channel(station, CHAN_CODE, LOC_CODE);
    expect(channel.station.stationCode).toBe(STA_CODE);
    expect(channel.station.network.networkCode).toBe(NET_CODE);
    expect(channel.locationCode).toBe(LOC_CODE);
    expect(channel.channelCode).toBe(CHAN_CODE);
});



test("fdsn source identifier", () => {
    const NET_CODE = "AA";
    const STA_CODE = "JSC";
    const LOC_CODE = "00";
    const CHAN_CODE = "BHZ";
    const net = new Network(NET_CODE);
    const station = new Station(net, STA_CODE);
    const channel = new Channel(station, CHAN_CODE, LOC_CODE);
    expect(net.sourceId.toString()).toBe(`FDSN:${NET_CODE}`);
    expect(station.sourceId.toString()).toBe(`FDSN:${NET_CODE}_${STA_CODE}`);
    expect(channel.sourceId.toString()).toBe(`FDSN:${NET_CODE}_${STA_CODE}_${LOC_CODE}_B_H_Z`);
});
