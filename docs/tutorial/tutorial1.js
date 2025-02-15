// snip start createseis

import * as sp from '../seisplotjs_3.0.1-alpha_standalone.mjs';

let dataArray = new Float32Array(1000).map(function(d, i) {
  return Math.sin(2*Math.PI*i/100) * 100;
});
let sampleRate = 20;
let start = sp.util.isoToDateTime('2019-07-04T05:46:23');
let myseismogram = sp.seismogram.Seismogram.fromContiguousData(dataArray, sampleRate, start);
// snip start draw
let seisData = sp.seismogram.SeismogramDisplayData.fromSeismogram(myseismogram);
const graph = document.querySelector('sp-seismograph');
graph.seismographConfig.title = "A sine wave!";
graph.seismographConfig.margin.top = 25;
graph.seisData = [ seisData ];
// snip start divdraw
const div = document.querySelector('div#sinewave');
const seisConfig = new sp.seismographconfig.SeismographConfig();
seisConfig.title = "Another sine wave!";
seisConfig.margin.top = 25;
const div_graph = new sp.seismograph.Seismograph([seisData], seisConfig);
div.appendChild(div_graph);
// snip start timescale
graph.seismographConfig.linkedTimeScale.link(div_graph);
// snip end
