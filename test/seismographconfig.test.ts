// @flow

import {SeismographConfig} from '../src/seismographconfig.js';

test("simple seismographconfig clone", () => {
  const seisConfig = new SeismographConfig();

  seisConfig.isXAxis = false;
  seisConfig.isYAxis = false;
  seisConfig.timeFormat = function (date: Date): string { return date.toISOString();};
  seisConfig.relativeTimeFormat = function() { return "3e";};
  seisConfig.amplitudeFormat = function() { return "4e";};
  seisConfig._title = [ 'Bla bla'];
  seisConfig.xLabel = "BigTime";
  seisConfig.xLabelOrientation = "horizontal";
  seisConfig.xSublabel = "Nope";
  seisConfig.yLabel = "You Betcha";
  seisConfig.yLabelOrientation = "vertical";
  seisConfig.ySublabel = "Boo hoo";
  seisConfig.ySublabelTrans = 17;
  seisConfig.ySublabelIsUnits = false;
  seisConfig.doGain = false;
  seisConfig.fixedAmplitudeScale = [1,2];
  seisConfig.markerTextOffset = .80;
  seisConfig.markerTextAngle = 47;
  seisConfig.markerFlagpoleBase = "center"; // bottom or center
  seisConfig.minHeight=110;
  seisConfig.margin = {top: 10, right: 10, bottom: 52, left: 75, toString: function() {return "t:"+this.top+" l:"+this.left+" b:"+this.bottom+" r:"+this.right;}};
  seisConfig.segmentDrawCompressedCutoff=11;
  seisConfig.maxZoomPixelPerSample = 21;

  seisConfig.wheelZoom = false;
  seisConfig.connectSegments = true;
  seisConfig.lineColors = [
     "red",
     "blue",
     "green",
     "black"];
  seisConfig.lineWidth = 2;
  const cloned = seisConfig.clone();
  // margin toString function causes problems, so delete before compare
  // $FlowExpectedError[cannot-write]
  delete seisConfig.margin.toString;
  // $FlowExpectedError[cannot-write]
  delete cloned.margin.toString;
  expect(seisConfig).toEqual(cloned);
  seisConfig.yLabel = "Changed";
  expect(cloned.yLabel).not.toEqual(seisConfig.yLabel);
});
