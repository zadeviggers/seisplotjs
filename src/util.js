// @flow

/*global DataView*/

import moment from 'moment';

//reexport
export { moment, };


import RSVP from 'rsvp';

RSVP.on('error', function(reason: string) {
  console.assert(false, reason);
});

//reexport
export {RSVP, };

export const XML_MIME = "application/xml";
export const JSON_MIME = "application/json";
export const TEXT_MIME = "text/plain";

// flow predicate %check functions
export function hasArgs(value: any): boolean %checks {
  return arguments.length !== 0 && typeof value !== 'undefined';
}
export function hasNoArgs(value: any): boolean %checks {
  return arguments.length === 0 || typeof value === 'undefined';
}
export function isStringArg(value: any): boolean %checks {
  return arguments.length !== 0 && typeof value === 'string';
}
export function isNumArg(value: any): boolean %checks {
  return typeof value === 'number';
}

export function isObject (obj: mixed): boolean %checks {
  return obj !== null && typeof obj === 'object';
}
export function isDef(v: mixed): boolean %checks {
  return typeof v !== 'undefined' && v !== null;
}

export function dataViewToString(dataView: DataView) {
  let out = "";
  for (let i=0; i< dataView.byteLength; i++) {
    out += String.fromCharCode(dataView.getUint8(i));
  }
  return out;
}


/** String representation of input. THis is kind of dumb but makes
 *  flow happier.
 */
export function stringify(value: mixed): string {
  if (typeof value === 'string') {
    return value;
  } else if (typeof value === 'number') {
    return value.toString();
  } else if (typeof value === 'boolean') {
    return value ? "true" : "false";
  } else if (typeof value === 'undefined') {
    return "undefined";
  } else if (typeof value === 'function') {
    return "function "+value.name;
  } else if (typeof value === 'object') {
    if (value) {
      if (value instanceof moment) {
        return value.toISOString();
      } else {
        return value.constructor.name+ " "+value.toString();
      }
    } else {
      return "null";
    }
// symbol not yet supported by flow
//  } else if (typeof value === 'symbol') {
//    return value.toString();
  } else {
    return "<unknown"+(typeof value)+"???>";
  }
}


export function calcClockOffset(serverTimeUTC: moment): number {
  return moment.utc().diff(serverTimeUTC, 'seconds', true);
}

/**
Any two of startTime, endTime and duration can be specified, or just duration which
then assumes endTime is now.
startTime and endTime are moment objects, duration is in seconds.
clockOffset is the seconds that should be subtracted from the computer time
 to get real world time, ie computerUTC - UTC
 or moment.utc().diff(serverTimeUTC, 'seconds', true).
 default is zero.
*/
export class StartEndDuration {
  _startTime: moment;
  _endTime: moment;
  _duration: moment.duration;
  _clockOffset: moment.duration;
  constructor(startTime: moment | null, endTime: moment | null, duration: number | null =null, clockOffset?: number | null =0) {

    if (duration &&
        (typeof duration === "string" || duration instanceof String)) {
      if (duration.charAt(0) === 'P') {
        this._duration = moment.duration(duration);
      } else {
        this._duration = moment.duration(Number.parseFloat(duration), 'seconds');
      }
    }
    if (duration &&
      (typeof duration === "number" || duration instanceof Number)) {
      this._duration = moment.duration(duration, 'seconds');
    }
    if (startTime && endTime) {
      this._startTime = checkStringOrDate(startTime);
      this._endTime = checkStringOrDate(endTime);
      this._duration = moment.duration(this.endTime.diff(this.startTime));
    } else if (startTime && this._duration) {
      this._startTime = checkStringOrDate(startTime);
      this._endTime = moment.utc(this.startTime).add(this.duration);
    } else if (endTime && this._duration) {
      this._endTime = checkStringOrDate(endTime);
      this._startTime = moment.utc(this.endTime).subtract(this.duration);
    } else if (this._duration) {
      if (clockOffset === undefined) {
        this._clockOffset = moment.duration(0, 'seconds');
      } else if (clockOffset instanceof Number) {
        this._clockOffset = moment.duration(clockOffset, 'seconds');
      } else {
        this._clockOffset = clockOffset;
      }
      this._endTime = moment.utc().subtract(clockOffset);
      this._startTime = moment.utc(this.endTime).subtract(this.duration);
    } else {
      throw "need some combination of startTime, endTime and duration";
    }
  }
  get startTime() {
    return this._startTime;
  }
  get endTime() {
    return this._endTime;
  }
  get duration() {
    return this._duration;
  }
  get clockOffset() {
    return this._clockOffset;
  }
  overlaps(other: StartEndDuration): boolean {
    if (this.startTime.isAfter(other.endTime)
        || this.endTime.isBefore(other.startTime)) {
      return false;
    }
    return true;
  }
}

/** converts the input value is a moment, throws Error if not
 * a string, Date or moment. Zero length string or "now" return
 * current time.
 */
export function checkStringOrDate(d: any): moment {
  if (moment.isMoment(d)) {
    return d;
  } else if (d instanceof Date) {
      return moment.utc(d);
  } else if (d instanceof Number || typeof d === "number") {
    return moment.utc(d);
  } else if (d instanceof String || typeof d === "string") {
    let lc = d.toLowerCase();
    if (d.length === 0 || lc === "now") {
      return moment.utc();
    } else {
      return moment.utc(d);
    }
  }
  throw new Error("unknown date type: "+d+" "+(typeof d));
}

/** converts to ISO8601 but removes the trailing Z as FDSN web services
  do not allow that. */
export function toIsoWoZ(date: moment): string {
  let out = date.toISOString();
  return out.substring(0, out.length-1);
}

/** returns the protocol, http or https for the document if possible. */
export function checkProtocol() {
  let _protocol = 'http:';
  if (typeof document !== 'undefined' && document.location && "https:" === document.location.protocol) {
    _protocol = 'https:';
  }
  return _protocol;
}

export function defaultFetchInitObj(mimeType: string): { [key: string]: any } {
  let headers = {};
  if (isStringArg(mimeType)) {
    headers.Accept = mimeType;
  }
  return {
        cache: 'no-cache',
        redirect: 'follow', // manual, *follow, error
        mode: "cors",
        referrer: "seisplotjs",
        headers: headers
  };
}

export function doFetchWithTimeout(url: string,
                                   fetchInit: { [key: string]: any },
                                   timeoutSec: number): Promise<Response> {
  console.log("fetch URL: "+url);
  const controller = new AbortController();
  const signal = controller.signal;
  setTimeout(() => controller.abort(), timeoutSec * 1000);
  fetchInit.signal = signal;
  return fetch(url, fetchInit)
  .catch(err => {
    console.log("fetch failed, possible CORS or PrivacyBadger or NoScript?");
    console.assert(false, err);
    throw err;
  }).then(function(response) {
    if(response.ok) {
      return response;
    }
    // $FlowFixMe
    throw new Error(`fetch response was not ok. ${response.ok} ${response.status}`);
  });
}


/**
 * Recursively calculates the mean of a slice of an array. This helps with
 * very long seismograms to equally weight each sample point without overflowing.
 * @param   dataSlice slice of a seismogram
 * @param   totalPts  number of points in the original seismogram
 * @return            sum of slice data points divided by totalPts
 */
export function meanOfSlice(dataSlice: Int32Array | Float32Array | Float64Array, totalPts: number ): number {
  if (dataSlice.length < 8) {
    return dataSlice.reduce(function(acc, val) {
       return acc + val;
    }, 0) / totalPts;
  } else {
    let byTwo = Math.floor(dataSlice.length / 2);
    return meanOfSlice(dataSlice.slice(0, byTwo), totalPts) + meanOfSlice(dataSlice.slice(byTwo, dataSlice.length), totalPts);
  }
}
