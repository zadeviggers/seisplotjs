/*
 * Philip Crotwell
 * University of South Carolina, 2019
 * http://www.seis.sc.edu
 */
import {Duration} from "luxon";
import {Seismogram} from "./seismogram";
import {InstrumentSensitivity} from "./stationxml";
import * as OregonDSPTop from "oregondsp";
import {OregonDSP} from "./oregondsputil";
import {isDef} from "./util";
// import type {
//   IIRFilter,
//   Butterworth,
//   ChebyshevI,
//   ChebyshevII,
// } from "oregondsp.com.oregondsp.signalProcessing.filter.iir";
const CenteredHilbertTransform =
  OregonDSPTop.com.oregondsp.signalProcessing.filter.fir.equiripple.CenteredHilbertTransform;

/**
 * Constant for bandpass OregonDSP filter creation.
 */
export const BAND_PASS = 'BANDPASS';

/**
 * Constant for lowpass OregonDSP filter creation.
 */
export const LOW_PASS = "LOWPASS";

/**
 * Constant for highpass OregonDSP filter creation.
 */
export const HIGH_PASS = "HIGHPASS";

export function amplitude(real: number, imag: number): number {
  return Math.hypot(real, imag);
}

/**
 * Remove the mean from a seismogram. Subtract the mean from each data point.
 *
 * @param   seis input seismogram
 * @returns       seismogram with mean of zero
 */
export function rMean(seis: Seismogram): Seismogram {
  if (seis instanceof Seismogram) {
    let meanVal = seis.mean();
    let rmeanSeismogram = new Seismogram(
      seis.segments.map(s => {
        let demeanY = s.y.map(function (d) {
          return d - meanVal;
        });
        let out = s.cloneWithNewData(demeanY);
        return out;
      }),
    );
    return rmeanSeismogram;
  } else {
    throw new Error("rMean arg not a Seismogram");
  }
}

/**
 * Apply the frequency independent overall gain to a seismogram. This does not
 * do a full transfer using poles and zero, this only applies the scalar conversion
 * factor to convert counts back to original real world units and update the units.
 *
 * @param   seis                  the seismogram to correct
 * @param   instrumentSensitivity overall gain object, usually pulled from stationxml
 * @returns                        new seismogram with original units, like m/s and gain applied.
 */
export function gainCorrect(
  seis: Seismogram,
  instrumentSensitivity: InstrumentSensitivity,
): Seismogram {
  if (seis instanceof Seismogram) {
    let gain = instrumentSensitivity.sensitivity;
    let gainSeismogram = new Seismogram(
      seis.segments.map(s => {
        let gainY;

        if (s.y instanceof Int32Array || s.y instanceof Float32Array) {
          gainY = Float32Array.from(s.y);
        } else {
          gainY = Float64Array.from(s.y);
        }

        gainY = gainY.map(function (d) {
          return d / gain;
        });
        let outS = s.cloneWithNewData(gainY);
        outS.yUnit = instrumentSensitivity.inputUnits;
        return outS;
      }),
    );
    return gainSeismogram;
  } else {
    throw new Error(`Expected Seismogram but was ${typeof seis}`);
  }
}
export type MinMaxMean = {
  min: number;
  max: number;
  mean: number;
};

export function getPassband(type: string) {
  // this is really really bad, but kotlin doesn't export
  // enums and filter requires a enum arg, so we fake it
  let name ="unknown";
  let ord = -1;
  if (type === LOW_PASS) {
    name = LOW_PASS;
    ord = 0;
  } else if (type === BAND_PASS) {
    name = BAND_PASS;
    ord = 1;
  } else if (type === HIGH_PASS) {
    name = HIGH_PASS;
    ord = 2;
  } else {
    throw new Error(`unknown pass band: ${type}`);
  }
  // @ts-ignore
  return {
    _name_2: name,
    _ordinal: ord,
    equals: function (other: any) {
      return this._name_2 === other._name_2 && this._ordinal === other._ordinal;
    },
  };
}
/**
 * Creates a Butterworth IIR filter using the OregonDSP library.
 *
 * @param   numPoles       number of poles
 * @param   passband       type, use constants of BAND_PASS, LOW_PASS, HIGH_PASS
 * @param   lowFreqCorner  low corner frequency
 * @param   highFreqCorner high corner frequency
 * @param   delta          delta, period, of timeseries
 * @returns                 Butterworth IIR filter
 */
export function createButterworth(
  numPoles: number,
  passband: string,
  lowFreqCorner: number,
  highFreqCorner: number,
  delta: number,
): OregonDSPTop.com.oregondsp.signalProcessing.filter.iir.Butterworth {
  const passbandtype = getPassband(passband);
  return new OregonDSP.filter.iir.Butterworth(
    numPoles,
    passbandtype,
    lowFreqCorner,
    highFreqCorner,
    delta,
  );
}

/**
 * Creates a Chebyshev I IIR filter using the OregonDSP library.
 *
 * @param   numPoles       number of poles
 * @param   epsilon        Chebyshev epsilon value
 * @param   passband       type, use constants of BAND_PASS, LOW_PASS, HIGH_PASS
 * @param   lowFreqCorner  low corner frequency
 * @param   highFreqCorner high corner frequency
 * @param   delta          delta, period, of timeseries
 * @returns                 Chebyshev I IIR filter
 */
export function createChebyshevI(
  numPoles: number,
  epsilon: number,
  passband: string,
  lowFreqCorner: number,
  highFreqCorner: number,
  delta: number,
): OregonDSPTop.com.oregondsp.signalProcessing.filter.iir.ChebyshevI {
  const passbandtype = getPassband(passband);
  return new OregonDSP.filter.iir.ChebyshevI(
    numPoles,
    epsilon,
    passbandtype,
    lowFreqCorner,
    highFreqCorner,
    delta,
  );
}

/**
 * Creates a Chebyshev II IIR filter using the OregonDSP library.
 *
 * @param   numPoles       number of poles
 * @param   epsilon        Chebyshev epsilon value
 * @param   passband       type, use constants of BAND_PASS, LOW_PASS, HIGH_PASS
 * @param   lowFreqCorner  low corner frequency
 * @param   highFreqCorner high corner frequency
 * @param   delta          delta, period, of timeseries
 * @returns                 Chebyshev II IIR filter
 */
export function createChebyshevII(
  numPoles: number,
  epsilon: number,
  passband: string,
  lowFreqCorner: number,
  highFreqCorner: number,
  delta: number,
): OregonDSPTop.com.oregondsp.signalProcessing.filter.iir.ChebyshevII {
  const passbandtype = getPassband(passband);
  return new OregonDSP.filter.iir.ChebyshevII(
    numPoles,
    epsilon,
    passbandtype,
    lowFreqCorner,
    highFreqCorner,
    delta,
  );
}

/**
 * Applies the filter to the given seismogram.
 *
 * @param   iirFilter filter to apply
 * @param   seis      seismogram to apply filter to
 * @returns            filtered seismogram
 */
export function applyFilter(
  iirFilter: OregonDSPTop.com.oregondsp.signalProcessing.filter.iir.IIRFilter,
  seis: Seismogram,
): Seismogram {
  // check delta and samplePeriod with 0.1% of each other
  if (Math.abs(iirFilter.getDelta() - seis.samplePeriod)/seis.samplePeriod > 0.001) {
    throw new Error(`Filter, delta=${iirFilter.getDelta()}, has different delta from seis, ${1/seis.sampleRate}`);
  }
  let filteredSegments = [];

  for (let i = 0; i < seis.segments.length; i++) {
    let outData = Float32Array.from(seis.segments[i].y);
    iirFilter.filterInPlace(outData);
    filteredSegments.push(seis.segments[i].cloneWithNewData(outData));
  }

  return new Seismogram(filteredSegments);
}

/**
 * Calculates the envelope, y_i = sqrt( y_i * y_i + h_i * h_i)
 *  where h is the hilber transform of y. The default configuration
 *  for the hilbet transform is n=100, lowEdge=.05 and highEdge = 0.95
 *
 * @param seis seismogram to apply envelope to
 * @returns seismogram cloned but with data as the envelope
 */
export function envelope(seis: Seismogram): Seismogram {
  if (seis.isContiguous()) {
    let seisY = seis.y;
    let s = hilbert(seis);
    let hilbertY = s.y;
    let outY;

    if (seis.y instanceof Int32Array || seis.y instanceof Float32Array) {
      outY = new Float32Array(seisY.length);
    } else {
      outY = new Float64Array(seisY.length);
    }

    for (let n = 0; n < seisY.length; n++) {
      outY[n] = Math.sqrt(hilbertY[n] * hilbertY[n] + seisY[n] * seisY[n]);
    }

    return seis.cloneWithNewData(outY);
  } else {
    throw new Error("Cannot take envelope of non-contiguous seismogram");
  }
}

/**
 * Calculates the hilbert transform using the OregonDSP library
 *  with default number of points, n=10 (to yield a 21 pt FIR transform)
 *  and default low and high edge of 0.05 and 0.95. Low and high edge are
 *  given normalized 0 to 1.
 *
 * Note this uses Float32Array, other array types will be converted,
 * possibly losing precision.
 *
 * @param seis seismogram to calculate from
 * @param n optional number of points in transform, default is 10
 * @param lowEdge low edge of filter, normailized to 0-1, default is 0.05
 * @param highEdge high edge of filter, normailized to 0-1, default is 0.95
 * @returns hilbert transformed data
 */
export function hilbert(
  seis: Seismogram,
  n?: number,
  lowEdge?: number,
  highEdge?: number,
): Seismogram {
  if (seis.isContiguous()) {
    let seisY: Float32Array;
    if (seis.y instanceof Float32Array){
      seisY = seis.y;
    } else {
      seisY = Float32Array.from(seis.y);
    }

    if (!isDef(n)) {
      n = 10;
    }

    if (!isDef(lowEdge)) {
      lowEdge = 0.05;
    }

    if (!isDef(highEdge)) {
      highEdge = 0.95;
    }

    let hilbert = new OregonDSPTop.com.oregondsp.signalProcessing.filter.fir.equiripple.CenteredHilbertTransform(n, lowEdge, highEdge);

    let coeff = hilbert.getCoefficients();

    for (let c of coeff) {
      if (Number.isNaN(c)) {
        throw new Error(`Hilbert FIR coeff includes NaN: ${coeff.join()}`);
      }
    }

    let hilbertY = hilbert.filter(seisY);
    let s = seis.cloneWithNewData(hilbertY);
    return s;
  } else {
    throw new Error("Cannot take hilbert of non-contiguous seismogram");
  }
}

/**
 * Differentiate a seismogram.
 *
 * @param   seis input seismogram
 * @returns       differentiated seismogram
 */
export function differentiate(seis: Seismogram): Seismogram {
  if (seis instanceof Seismogram) {
    let diffSeismogram = new Seismogram(
      seis.segments.map(s => {
        let origY = s.y;
        const sampRate = 1.0 * s.sampleRate; // same as 1/delta

        let diffY = new Float32Array(origY.length - 1);

        for (let i = 0; i < diffY.length; i++) {
          diffY[i] = (origY[i + 1] - origY[i]) * sampRate;
        }

        let out = s.cloneWithNewData(diffY);
        out.startTime = out.startTime.plus(Duration.fromMillis(1000 / out.sampleRate / 2));// second
        out.yUnit = out.yUnit + "/s";
        return out;
      }),
    );
    return diffSeismogram;
  } else {
    throw new Error("diff arg not a Seismogram");
  }
}
