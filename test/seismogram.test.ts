
import {FDSNSourceId} from '../src/fdsnsourceid';
import { createQuakeFromValues, UNKNOWN_PUBLIC_ID} from '../src/quakeml.js';
import {AMPLITUDE_MODE } from '../src/scale.js';
import {Seismogram, SeismogramDisplayData, findMinMaxOverTimeRange} from '../src/seismogram';
import {SeismogramSegment} from '../src/seismogramsegment';
import  {isDef, isoToDateTime} from '../src/util';
import {DateTime, Duration, Interval} from 'luxon';

test("simple seismogram seg creation", () => {
  const yValues = Int32Array.from([0, 1, 2]);
  const sampleRate = 20.0;
  const startTime = DateTime.utc();
  const sidStr = "FDSN:XX_ABCD_00_B_H_Z";
  const sid = FDSNSourceId.parse(sidStr);
  const seis = new SeismogramSegment(yValues, sampleRate, startTime, sid);
  expect(seis.y.length).toBe(3);
  expect(seis.yAtIndex(0)).toBe(0);
  expect(seis.yAtIndex(1)).toBe(1);
  expect(seis.yAtIndex(2)).toBe(2);
  expect(seis.sampleRate).toBe(sampleRate);
  expect(seis.startTime).toBe(startTime);
  expect(seis.sourceId).toEqual(sid);
  expect(seis.numPoints).toBe(yValues.length);
  expect(seis.timeOfSample(0).toISO()).toEqual(startTime.toISO());
  expect(seis.sourceId.toString()).toBe(sidStr);
});

test("seismogram seg clone", () => {
  const yValues = Int32Array.from([0, 1, 2]);
  const sampleRate = 20.0;
  const startTime = DateTime.utc();
  const sid = FDSNSourceId.parse("FDSN:XX_ABCD_00_B_H_Z");
  const seisSeg = new SeismogramSegment(yValues.slice(), sampleRate, startTime, sid);
  seisSeg.sourceId = sid;
  const cloneSeg = seisSeg.clone();
  expect(cloneSeg.y.length).toBe(seisSeg.y.length);
  expect(cloneSeg.yAtIndex(0)).toBe(yValues[0]);
  expect(cloneSeg.yAtIndex(1)).toBe(yValues[1]);
  expect(cloneSeg.yAtIndex(2)).toBe(yValues[2]);
  expect(cloneSeg.yAtIndex(0)).toBe(seisSeg.yAtIndex(0));
  expect(cloneSeg.yAtIndex(1)).toBe(seisSeg.yAtIndex(1));
  expect(cloneSeg.yAtIndex(2)).toBe(seisSeg.yAtIndex(2));
  expect(cloneSeg.sampleRate).toBe(seisSeg.sampleRate);
  expect(cloneSeg.startTime).toEqual(seisSeg.startTime);
  expect(cloneSeg.startTime.toISO()).toEqual(seisSeg.startTime.toISO());
  expect(cloneSeg.sourceId).toEqual(seisSeg.sourceId);
  expect(cloneSeg.numPoints).toBe(seisSeg.numPoints);
  expect(cloneSeg.timeOfSample(0).toISO()).toEqual(seisSeg.timeOfSample(0).toISO());
  expect(cloneSeg.codes()).toEqual(seisSeg.codes());
  expect(cloneSeg.endTime.toISO()).toEqual(seisSeg.endTime.toISO());
  // test after replace data Array
  const x = new Int32Array(seisSeg.y.length);
  x[0] = 4;
  x[1] = 5;
  x[2] = 6;
  x[3] = 7;
  cloneSeg.y = x;
  expect(cloneSeg.numPoints).toBe(x.length);
  expect(cloneSeg.y.length).toBe(x.length);
  expect(cloneSeg.yAtIndex(0)).toBe(x[0]);
  expect(cloneSeg.yAtIndex(1)).toBe(x[1]);
  expect(cloneSeg.yAtIndex(2)).toBe(x[2]);
  expect(cloneSeg.yAtIndex(3)).toBe(x[3]);
});


test("simple Seismogram creation", () => {
  const yValues = Int32Array.from([0, 1, 2]);
  const sampleRate = 20.0;
  const startTime = DateTime.utc();
  const sidStr = "FDSN:XX_ABCD_00_B_H_Z";
  const sid = FDSNSourceId.parse(sidStr);
  const seis = new SeismogramSegment(yValues.slice(), sampleRate, startTime, sid);
  const trace = new Seismogram(seis);
  expect(trace.networkCode).toEqual(sid.networkCode);
  expect(trace.stationCode).toEqual(sid.stationCode);
  expect(trace.locationCode).toEqual(sid.locationCode);
  expect(trace.channelCode).toEqual(sid.formChannelCode());
  expect(trace.startTime).toEqual(startTime);
  expect(trace.sampleRate).toBe(sampleRate);
});

test("seismogram isContiguous", () =>{
  const yValues = new Int32Array(10);
  const sampleRate = 20.0;
  const startTime = isoToDateTime("2013-02-08T09:30:26");
  const secondStart = startTime.plus(Duration.fromMillis(1000*yValues.length/sampleRate));
  const laterStart = secondStart.plus(Duration.fromMillis(10*1000*yValues.length/sampleRate));

  const first = new SeismogramSegment(yValues, sampleRate, startTime);
  const second = new SeismogramSegment(yValues, sampleRate, secondStart);
  const seis = new Seismogram([first, second]);
  expect(seis.isContiguous()).toBe(true);

  const later = new SeismogramSegment(yValues, sampleRate, laterStart);
  const nonContigSeis = new Seismogram([first, second, later]);

  expect(nonContigSeis.isContiguous()).toBe(false);
});


test("seismogram clone", () => {
  const yValues = Int32Array.from([0, 1, 2]);
  expect(yValues[0]).toEqual(0);
  const sampleRate = 20.0;
  const startTime = DateTime.utc();
  const sidStr = "FDSN:XX_ABCD_00_B_H_Z";
  const sid = FDSNSourceId.parse(sidStr);
  const seisSeg = new SeismogramSegment(yValues.slice(), sampleRate, startTime, sid);
  const seis = new Seismogram([ seisSeg]);

  const cloneSeis = seis.clone();
  expect(cloneSeis.segments[0].isEncoded()).toBe(seisSeg.isEncoded());
  expect(cloneSeis.isContiguous()).toBe(seis.isContiguous());
  expect(cloneSeis.y.length).toBe(seis.y.length);
  expect(cloneSeis.y[0]).toEqual(yValues[0]);
  expect(cloneSeis.y[1]).toBe(yValues[1]);
  expect(cloneSeis.y[2]).toBe(yValues[2]);
  expect(cloneSeis.y[0]).toBe(seis.y[0]);
  expect(cloneSeis.y[1]).toBe(seis.y[1]);
  expect(cloneSeis.y[2]).toBe(seis.y[2]);
  expect(cloneSeis.sampleRate).toBe(seis.sampleRate);
  expect(cloneSeis.startTime).toEqual(seis.startTime);
  expect(cloneSeis.startTime.toISO()).toEqual(seis.startTime.toISO());
  expect(cloneSeis.networkCode).toEqual(seis.sourceId.networkCode);
  expect(cloneSeis.stationCode).toEqual(seis.sourceId.stationCode);
  expect(cloneSeis.locationCode).toEqual(seis.sourceId.locationCode);
  expect(cloneSeis.channelCode).toEqual(seis.sourceId.formChannelCode());
  expect(cloneSeis.numPoints).toBe(seis.numPoints);
//  expect(cloneSeis.timeOfSample(0).toISO()).toEqual(seis.timeOfSample(0).toISO());
  expect(cloneSeis.codes()).toEqual(seis.codes());
  expect(cloneSeis.endTime.toISO()).toEqual(seis.endTime.toISO());
  // test after replace data Array
  const x = new Int32Array(seis.y.length+1);
  x[0] = 4;
  x[1] = 5;
  x[2] = 6;
  x[3] = 7;
  x[4] = 8;

  const cloneWithY = seis.cloneWithNewData(x);
  expect(cloneWithY.numPoints).toBe(x.length);
  expect(cloneWithY.y).toHaveLength(x.length);
  expect(cloneWithY.y[0]).toBe(x[0]);
  expect(cloneWithY.y[1]).toBe(x[1]);
  expect(cloneWithY.y[2]).toBe(x[2]);
  expect(cloneWithY.y[3]).toBe(x[3]);
});


test("seismogram merge", () => {
  const yValues = Int32Array.from([0, 1, 2]);
  expect(yValues).toHaveLength(3);
  const sampleRate = 20.0;
  const startTimeA = DateTime.utc().minus(Duration.fromMillis(1000*yValues.length/sampleRate));
  const startTimeB = startTimeA.plus(Duration.fromMillis(1000*yValues.length/sampleRate));

  const seisSegA = new SeismogramSegment(yValues.slice(), sampleRate, startTimeA);
  const seisSegB = new SeismogramSegment(yValues.slice(), sampleRate, startTimeB);
  const seis = new Seismogram([ seisSegA, seisSegB]);
  expect(seis.merge().length).toEqual(yValues.length*2);
});

test("segment index of time", () => {
  const len = 1000;
  const yValues = new Int32Array(len);
  const sampleRate = 20.0;
  const startTime = isoToDateTime("2013-02-08T09:30:26");
  const seg = new SeismogramSegment(yValues, sampleRate, startTime);
  expect(seg.indexOfTime(startTime)).toEqual(0);
  const before = startTime.minus(Duration.fromMillis(1000/sampleRate));
  expect(seg.indexOfTime(before)).toEqual(-1);
  const mid = startTime.plus(Duration.fromMillis(47.3*1000/sampleRate));
  expect(seg.indexOfTime(mid)).toEqual(47);
  const after = startTime.plus(Duration.fromMillis((len+1)*1000/sampleRate));
  expect(seg.indexOfTime(after)).toEqual(-1);

});


test("clone sdd test", () => {
  const len = 1000;
  const yValues = new Int32Array(len);
  const sampleRate = 20.0;
  const startTime = isoToDateTime("2013-02-08T09:30:26");
  const marker = {
    name: "P",
    markertype: "predicted",
    time: startTime.plus(Duration.fromISO("PT1M")),
    description: "dummy",
  };

  const seis = Seismogram.fromContiguousData(yValues, sampleRate, startTime);
  const q = createQuakeFromValues(UNKNOWN_PUBLIC_ID, startTime,-10, 12, 0);
  const sdd = SeismogramDisplayData.fromSeismogram(seis);
  sdd.addQuake(q);
  sdd.addMarkers(marker);
  expect(sdd.markerList).toHaveLength(1);

  const processedSeis = Seismogram.fromContiguousData(yValues, sampleRate, startTime);
  const cloneSdd = sdd.cloneWithNewSeismogram(processedSeis);
  expect(cloneSdd.quakeList).toHaveLength(sdd.quakeList.length);
  expect(cloneSdd.quakeList[0]).toBe(sdd.quakeList[0]);
  expect(cloneSdd.markerList).toHaveLength(sdd.markerList.length);
});

test("cut clone sdd test", () => {
  const len = 1000;
  const yValues = new Int32Array(len);
  const sampleRate = 20.0;
  const startTime = isoToDateTime("2013-02-08T09:30:26");
  const seis = Seismogram.fromContiguousData(yValues, sampleRate, startTime);
  const q = createQuakeFromValues(UNKNOWN_PUBLIC_ID, startTime,-10, 12, 0);
  const sdd = SeismogramDisplayData.fromSeismogram(seis);
  sdd.addQuake(q);
  const cutWindow = Interval.after( startTime, Duration.fromMillis(1000*10));
  const cutSeis = seis.cut(cutWindow);
  expect(cutSeis).toBeDefined();
  if (cutSeis){
    expect(cutSeis.endTime).toEqual(cutWindow.end);
    const cutSeisSdd = sdd.cloneWithNewSeismogram(cutSeis);
    cutSeisSdd.timeRange = cutWindow; // clone keeps the old time window
    expect(cutSeisSdd.endTime).toEqual(cutWindow.end);
    expect(cutSeisSdd.seismogram).toBeDefined();
    const cutSeisSdd_seis = cutSeisSdd.seismogram;
    expect(cutSeisSdd_seis).not.toBeNull();
    expect(cutSeisSdd_seis?.endTime).toEqual(cutWindow.end);
    expect(cutSeisSdd_seis).not.toBe(seis);
    // sdd cut has new seismogram and new time window
    const cutSdd = sdd.cut(cutWindow);
    expect(cutSdd).toBeDefined();
    const cutSdd_seis = isDef(cutSdd) ? cutSdd.seismogram: null;
    expect(cutSdd_seis).toBeDefined();

    expect(cutSdd?.endTime).toEqual(cutWindow.end);
    expect(cutSdd_seis?.endTime).toEqual(cutWindow.end);
    expect(cutSdd_seis).not.toEqual(seis);
    expect(cutSdd?.quakeList).toHaveLength(sdd.quakeList.length);
  }
});

test("find minmax test", () => {
    const yValues = new Float32Array([3, 0, 3]);
    const seisAMean = yValues.reduce((acc, cur) => acc+cur, 0)/yValues.length;
    const sampleRate = 20.0;
    const startTime = isoToDateTime("2013-02-08T09:30:26");

    const seisA = Seismogram.fromContiguousData(yValues, sampleRate, startTime);
    const sddA = SeismogramDisplayData.fromSeismogram(seisA);
    const ampMode = AMPLITUDE_MODE.Mean;
    const minMax = findMinMaxOverTimeRange([sddA],
                                        sddA.timeRange,
                                        false,
                                        ampMode);
    expect(minMax.min).toEqual(-1*seisAMean); // seisMean to zero
    expect(minMax.max).toEqual(   seisAMean);
    expect(minMax.middle).toEqual(0);
});
