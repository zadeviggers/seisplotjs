import {fftForward} from "./fft";
import * as spectraplot from "./spectraplot";
import {INFO_ELEMENT, QuakeStationTable} from "./infotable";
import * as leafletutil from "./leafletutil";
import {MAP_ELEMENT, QuakeStationMap} from "./leafletutil";
import {ParticleMotion, createParticleMotionConfig} from "./particlemotion";
import {sort, SORT_NONE} from './sorting';
import {SeisPlotElement} from "./spelement";
import {SeismogramDisplayData } from "./seismogram";
import {Seismograph} from "./seismograph";
import type {SeisMouseEventType} from "./seismograph";
import {SeismographConfig} from "./seismographconfig";
import {isDef, isStringArg, stringify} from "./util";
import * as querystringify from "querystringify";

export const ORG_DISP_ITEM = 'sp-organized-display-item';
export const ORG_DISPLAY = 'sp-organized-display';

export const ORG_TYPE = "orgtype";
export const PLOT_TYPE = "plottype";
export const SEISMOGRAPH = "seismograph";
export const SPECTRA = "amp_spectra";
export const PARTICLE_MOTION = "particlemotion";
export const MAP = "map";
export const INFO = "info";
export const QUAKE_TABLE = "quake_table";
export const STATION_TABLE = "station_table";

export class OrganizedDisplayItem extends SeisPlotElement {
  extras: Map<string, any>;

  constructor(seisData?: Array<SeismogramDisplayData>, seisConfig?: SeismographConfig) {
    super(seisData, seisConfig);
    if (this.plottype.startsWith(PARTICLE_MOTION)) {
      this._seismographConfig = createParticleMotionConfig(null, seisConfig);
    }

    this.extras = new Map();

    this.addStyle(`
    :host {
      display: block;
      min-height: 50px;
      height: 100%;
    }
    sp-station-quake-map {
      height: 400px;
    }
    sp-seismograph {
      height: 200px;
    }
    `);
    const wrapper = document.createElement('div');
    wrapper.setAttribute("class", "wrapper");
    this.getShadowRoot().appendChild(wrapper);
  }
  get plottype(): string {
    let k = this.hasAttribute(PLOT_TYPE) ? this.getAttribute(PLOT_TYPE) : SEISMOGRAPH;
    // typescript null
    if (!k) { k = SEISMOGRAPH;}
    return k;
  }
  set plottype(val: string) {
    this.setAttribute(PLOT_TYPE, val);
    this.draw();
  }

  static get observedAttributes() { return [PLOT_TYPE]; }
  attributeChangedCallback(name: string, oldValue: any, newValue: any) {
    this.draw();
  }
  setExtra(key: string, value: any) {
    this.extras.set(key, value);
  }

  hasExtra(key: string): boolean {
    return this.extras.has(key);
  }

  getExtra(key: string): any {
    if (this.extras.has(key)) {
      return this.extras.get(key);
    }
    return null;
  }
  getContainedPlotElements(): Array<SeisPlotElement> {
    const wrapper = (this.getShadowRoot().querySelector('div') as HTMLDivElement);
    let dispItems = Array.from(wrapper.children);
    dispItems = dispItems.filter(el => el instanceof SeisPlotElement);
    return dispItems as Array<SeisPlotElement>;
  }

  draw(): void {
    if ( ! this.isConnected) {
      return;
    }
    const wrapper = (this.getShadowRoot().querySelector('div') as HTMLDivElement);

    while (wrapper.firstChild) {
      // @ts-ignore
      wrapper.removeChild(wrapper.lastChild);
    }
    const qIndex = this.plottype.indexOf("?");
    let queryParams: object;

    if (qIndex !== -1) {
      queryParams = querystringify.parse(this.plottype.substring(qIndex));
    } else {
      queryParams = {};
    }
    const mythis = this;

    if (this.plottype.startsWith(SEISMOGRAPH)) {
      const seismograph = new Seismograph(this.seisData, this._seismographConfig);
      wrapper.appendChild(seismograph);
      seismograph.addEventListener("seismousemove", sEvt => {
        const seisDetail = (sEvt as CustomEvent).detail as SeisMouseEventType;
        // bubble the event, not sure why this is needed???
        const event = new CustomEvent("seismousemove", { detail: seisDetail});
        mythis.dispatchEvent(event);
      });
      seismograph.addEventListener("seisclick", sEvt => {
        const seisDetail = (sEvt as CustomEvent).detail as SeisMouseEventType;
        // bubble the event, not sure why this is needed???
        const event = new CustomEvent("seisclick", { detail: seisDetail});
        mythis.dispatchEvent(event);
      });
    } else if (this.plottype.startsWith(SPECTRA)) {
      const loglog = getFromQueryParams(queryParams, "loglog", "true");
      const nonContigList = this.seisData.filter(
        sdd => !(sdd.seismogram && sdd.seismogram.isContiguous()),
      );

      if (nonContigList.length > 0) {
        const nonContigMsg =
          "non-contiguous seismograms, skipping: " +
          nonContigList
            .map(sdd =>
              isDef(sdd.seismogram)
                ? `${sdd.codes()} ${sdd.seismogram.segments.length}`
                : "null",
            )
            .join(",");
        const p = wrapper.appendChild(document.createElement("p"));
        p.textContent = nonContigMsg;
      }

      const fftList = this.seisData.map(sdd => {
        return sdd.seismogram && sdd.seismogram.isContiguous()
          ? fftForward(sdd)
          : null;
      });
      const fftListNoNull = fftList.filter(isDef);
      const spectraPlot = new spectraplot.SpectraPlot(fftListNoNull, this._seismographConfig);
      spectraPlot.setAttribute(spectraplot.LOGFREQ, loglog);
      wrapper.appendChild(spectraPlot);
    } else if (this.plottype.startsWith(PARTICLE_MOTION)) {
      if (this.seisData.length !== 2) {
        throw new Error(
          `particle motion requies exactly 2 seisData in seisDataList, ${this.seisData.length}`,
        );
      }

      const pmpSeisConfig = this._seismographConfig.clone();
      const particleMotionPlot = new ParticleMotion(
          [this.seisData[0]],
          [this.seisData[1]],
          pmpSeisConfig,
        );
      wrapper.appendChild(particleMotionPlot);
    } else if (this.plottype.startsWith(MAP)) {
      const mapid =
        "map" + (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);

      const seismap = new QuakeStationMap(this.seisData);
      seismap.setAttribute("id", mapid);
      const centerLat = parseFloat(
        getFromQueryParams(queryParams, "centerLat", "35"),
      );
      seismap.setAttribute(leafletutil.CENTER_LAT, `${centerLat}`);
      const centerLon = parseFloat(
        getFromQueryParams(queryParams, "centerLon", "-100"),
      );
      seismap.setAttribute(leafletutil.CENTER_LON, `${centerLon}`);
      const mapZoomLevel = parseInt(
        getFromQueryParams(queryParams, "zoom", "1"),
      );
      seismap.setAttribute(leafletutil.ZOOM_LEVEL, `${mapZoomLevel}`);
      const magScale = parseFloat(
        getFromQueryParams(queryParams, "magScale", "5.0"),
      );
      seismap.setAttribute(leafletutil.MAG_SCALE, `${magScale}`);
      wrapper.appendChild(seismap);
    } else if (this.plottype.startsWith(INFO)) {
      const infotable = new QuakeStationTable(this.seisData, this._seismographConfig);
      wrapper.appendChild(infotable);
    } else {
      throw new Error(`Unkown plottype "${this.plottype}"`);
    }
  }
}

customElements.define(ORG_DISP_ITEM, OrganizedDisplayItem);

export const WITH_INFO = "info";
export const DEFAULT_WITH_INFO = "false";
export const WITH_MAP = "map";
export const DEFAULT_WITH_MAP = "false";
export const WITH_TOOLS = "tools";
export const DEFAULT_WITH_TOOLS = "true";

export const SORT_BY = "sort";

export const OVERLAY_BY = "overlay";
export const OVERLAY_NONE = "none";
export const OVERLAY_INDIVIDUAL = "individual";
export const OVERLAY_VECTOR = "vector";
export const OVERLAY_COMPONENT = "component";
export const OVERLAY_STATION = "station";
export const OVERLAY_ALL = "all";
export const OVERLAY_FUNCTION = "function";

export const TOOLS_HTML = `
<details>
  <summary>Tools</summary>
  <form>
    <fieldset class="plottype">
      <legend>Plot</legend>
      <span>
        <input type="checkbox" name="with_map" id="with_map">
        <label for="with_map">map</label>
      </span>
      <span>
        <input type="checkbox" name="with_info" id="with_info">
        <label for="with_info">info</label>
      </span>
    </fieldset>
    <fieldset class="overlay">
    <legend>Overlay Type</legend>
    <span>
      <input type="radio" name="overlay" id="overlay_individual" value="individual" checked>
      <label for="overlay_individual">individual</label>
    </span>
    <span>
      <input type="radio" name="overlay" id="overlay_vector" value="vector">
      <label for="overlay_vector">vector</label>
    </span>
    <span>
      <input type="radio" name="overlay" id="overlay_component" value="component">
      <label for="overlay_component">component</label>
    </span>
    <span>
      <input type="radio" name="overlay" id="overlay_station" value="station">
      <label for="overlay_station">station</label>
    </span>
    <span>
      <input type="radio" name="overlay" id="overlay_all" value="all">
      <label for="overlay_all">all</label>
    </span>
    <span>
      <input type="radio" name="overlay" id="overlay_none" value="none">
      <label for="overlay_none">none</label>
    </span>
  </fieldset>
  <fieldset class="sort">
    <legend>Sort Type</legend>
    <span>
      <input type="radio" name="sort" id="sort_distance" value="distance">
      <label for="sort_distance">distance</label>
    </span>
    <span>
      <input type="radio" name="sort" id="sort_azimuth" value="azimuth">
      <label for="sort_azimuth">azimuth</label>
    </span>
    <span>
      <input type="radio" name="sort" id="sort_backazimuth" value="backazimuth">
      <label for="sort_backazimuth">back azimuth</label>
    </span>
    <span>
      <input type="radio" name="sort" id="sort_alphabetical" value="alphabetical">
      <label for="sort_alphabetical">alphabetical</label>
    </span>
    <span>
      <input type="radio" name="sort" id="sort_starttime" value="starttime">
      <label for="sort_starttime">starttime</label>
    </span>
    <span>
      <input type="radio" name="sort" id="sort_origin" value="origin">
      <label for="sort_origin">origin</label>
    </span>
    <span>
      <input type="radio" name="sort" id="sort_none" value="none" checked>
      <label for="sort_none">none</label>
    </span>
  </fieldset>
  </form>
</details>
`;

export class OrganizedDisplayTools extends SeisPlotElement {
  _organizedDisplay: OrganizedDisplay | null;
  constructor(seisData?: Array<SeismogramDisplayData>, seisConfig?: SeismographConfig) {
    super(seisData, seisConfig);
    const wrapper = document.createElement('div');
    wrapper.setAttribute("class", "wrapper");
    wrapper.innerHTML = TOOLS_HTML;
    this.getShadowRoot().appendChild(wrapper);
    this._organizedDisplay = null;
  }
  get organizedDisplay() {
    return this._organizedDisplay;
  }
  set organizedDisplay(orgdisp: OrganizedDisplay | null) {
    this._organizedDisplay = orgdisp;
    this.initCheckboxes(orgdisp);
  }
  initCheckboxes(orgdisp: OrganizedDisplay|null) {
    if (orgdisp) {
      const shadow = this.shadowRoot;
      const doMapCB = shadow?.querySelector("input#with_map") as HTMLInputElement;
      if (doMapCB) {
        doMapCB.checked = orgdisp.map === 'true';
      }
      const doInfoCB = shadow?.querySelector("input#with_info") as HTMLInputElement;
      if (doInfoCB) {
        doInfoCB.checked = orgdisp.info === 'true';
      }
      shadow?.querySelectorAll('fieldset.overlay input').forEach(i => {
        const inEl = (i as HTMLInputElement);
        inEl.checked = orgdisp.overlayby === inEl.value;
      });
      shadow?.querySelectorAll('fieldset.sort input').forEach(i => {
        const inEl = (i as HTMLInputElement);
        inEl.checked = orgdisp.sortby === inEl.value;
      });
    }
  }
  draw() {
    const wrapper = (this.getShadowRoot().querySelector('div') as HTMLDivElement);

    wrapper.innerHTML = TOOLS_HTML;
    this.wireComponents();
  }
  wireComponents() {
    const shadow = this.shadowRoot;
    const doMapCB = shadow?.querySelector("input#with_map") as HTMLInputElement;
    doMapCB?.addEventListener('change', () => {
      if (this._organizedDisplay) {
        this._organizedDisplay.map = doMapCB.checked ? 'true' : 'false';
      }
    });
    const doInfoCB = shadow?.querySelector("input#with_info") as HTMLInputElement;
    doInfoCB?.addEventListener('change', () => {
      if (this._organizedDisplay) {
        this._organizedDisplay.info = `${doInfoCB.checked}`;
      }
    });
    shadow?.querySelectorAll('fieldset.overlay input').forEach(i => {
      const inEl = (i as HTMLInputElement);
      inEl.addEventListener('change', e => {
        if (this._organizedDisplay) {
          this._organizedDisplay?.setAttribute('overlay', inEl.value);
        }
      });
    });
    shadow?.querySelectorAll('fieldset.sort input').forEach(i => {
      const inEl = i as HTMLInputElement;
      inEl.addEventListener('change', e => {
        if (this._organizedDisplay) {
          this._organizedDisplay?.setAttribute('sort', inEl.value);
        }
      });
    });
    this.initCheckboxes(this._organizedDisplay);
  }
}
export const ORG_DISP_TOOLS_ELEMENT = 'sp-orgdisp-tools';
customElements.define(ORG_DISP_TOOLS_ELEMENT, OrganizedDisplayTools);


export class OrganizedDisplay extends SeisPlotElement {
  constructor(seisData?: Array<SeismogramDisplayData>, seisConfig?: SeismographConfig) {
    super(seisData, seisConfig);
    const wrapper = document.createElement('div');
    wrapper.setAttribute("class", "wrapper");
    this.addStyle(`
    :host {
      display: block;
      min-height: 50px;
      height: 100%;
    }
    sp-station-quake-map {
      height: var(--map-height, 400px);
    }
    sp-organized-display-item {
      min-height: 200px;
    }
    sp-seismograph {
      height: 200px;
    }
    `);
    this.getShadowRoot().appendChild(wrapper);
  }
  static get observedAttributes() {
    return [ORG_TYPE, WITH_TOOLS, WITH_MAP, WITH_INFO, OVERLAY_BY, SORT_BY];
  }

  getDisplayItems(): Array<OrganizedDisplayItem> {
    const wrapper = (this.getShadowRoot().querySelector('div') as HTMLDivElement);
    let dispItems = Array.from(wrapper.children);
    dispItems = dispItems.filter(el => el instanceof OrganizedDisplayItem);
    return dispItems as Array<OrganizedDisplayItem>;
  }


  get orgtype(): string {
    let k = this.hasAttribute(ORG_TYPE) ? this.getAttribute(ORG_TYPE) : OVERLAY_INDIVIDUAL;
    // typescript null
    if (!k) { k = SEISMOGRAPH;}
    return k;
  }
  set orgtype(val: string) {
    this.setAttribute(ORG_TYPE, val);
    this.draw();
  }
  get tools(): string {
    let k = this.hasAttribute(WITH_TOOLS) ? this.getAttribute(WITH_TOOLS) : DEFAULT_WITH_TOOLS;
    // typescript null
    if (!isDef(k)) { k = DEFAULT_WITH_TOOLS;}
    k = k.trim().toLowerCase();
    return k;
  }
  set tools(val: string) {
    this.setAttribute(WITH_TOOLS, val);
  }
  get map(): string {
    let k = this.hasAttribute(WITH_MAP) ? this.getAttribute(WITH_MAP) : DEFAULT_WITH_MAP;
    // typescript null
    if (!isDef(k)) { k = DEFAULT_WITH_MAP;}
    k = k.trim().toLowerCase();
    return k;
  }
  set map(val: string) {
    this.setAttribute(WITH_MAP, val);
  }
  get info(): string {
    let k = this.hasAttribute(WITH_INFO) ? this.getAttribute(WITH_INFO) : DEFAULT_WITH_INFO;
    // typescript null
    if (!isDef(k)) { k = DEFAULT_WITH_INFO;}
    k = k.trim().toLowerCase();
    return k;
  }
  set info(val: string) {
    this.setAttribute(WITH_INFO, val.toLowerCase().trim());
  }
  get overlayby(): string {
    let k = this.hasAttribute(OVERLAY_BY) ? this.getAttribute(OVERLAY_BY) : OVERLAY_INDIVIDUAL;
    // typescript null
    if (!k) { k = OVERLAY_INDIVIDUAL;}
    return k;
  }
  set overlayby(val: string) {
    this.setAttribute(OVERLAY_BY, val);
  }
  get sortby(): string {
    let k = this.hasAttribute(SORT_BY) ? this.getAttribute(SORT_BY) : SORT_NONE;
    // typescript null
    if (!k) { k = SORT_NONE;}
    return k;
  }
  set sortby(val: string) {
    this.setAttribute(SORT_BY, val);
  }

  draw() {
    if ( ! this.isConnected) {
      return;
    }
    const wrapper = (this.getShadowRoot().querySelector('div') as HTMLDivElement);
    wrapper.querySelectorAll(ORG_DISP_ITEM).forEach(item => wrapper.removeChild(item));

    const mythis = this;
    const sortedData = sort(mythis.seisData, this.sortby);
    let allOrgDispItems = new Array<OrganizedDisplayItem>();
    this.drawTools(sortedData);
    this.drawMap(sortedData);
    this.drawInfo(sortedData);
    if (this.overlayby === OVERLAY_INDIVIDUAL) {
      sortedData.forEach(sdd => {
          const oi = new OrganizedDisplayItem([sdd], mythis.seismographConfig);
          oi.plottype = SEISMOGRAPH;
          allOrgDispItems.push(oi);
      });
    } else if (this.overlayby === OVERLAY_VECTOR) {
      const groupedSDD = groupComponentOfMotion(sortedData);
      groupedSDD.forEach(gsdd => {
          const oi = new OrganizedDisplayItem(gsdd, mythis.seismographConfig);
          allOrgDispItems.push(oi);
      });
    } else if (this.overlayby === OVERLAY_COMPONENT) {
      const oitems = overlayByComponent(sortedData, mythis.seismographConfig);
      allOrgDispItems = allOrgDispItems.concat(oitems);
    } else if (this.overlayby === OVERLAY_STATION) {
      const oitems = overlayByStation(sortedData, mythis.seismographConfig);
      allOrgDispItems = allOrgDispItems.concat(oitems);
    } else if (this.overlayby === OVERLAY_ALL) {
      const oi = new OrganizedDisplayItem(sortedData, mythis.seismographConfig);
      allOrgDispItems.push(oi);
    } else if (this.overlayby === OVERLAY_NONE) {
      // nothing to do here
    } else {
      throw new Error(`Unknown overlay: ${this.overlayby}`);
    }

    allOrgDispItems.forEach(oi => {
      wrapper.appendChild(oi);
      oi.draw();
      if (oi.plottype === SEISMOGRAPH) {
        oi.addEventListener("seismousemove", sEvt => {
          // bubble the event, not sure why this is needed???
          const seisDetail = (sEvt as CustomEvent).detail as SeisMouseEventType;
          const event = new CustomEvent("seismousemove", { detail: seisDetail});
          mythis.dispatchEvent(event);
        });
        oi.addEventListener("seisclick", sEvt => {
          const seisDetail = (sEvt as CustomEvent).detail as SeisMouseEventType;
          const event = new CustomEvent("seisclick", { detail: seisDetail});
          mythis.dispatchEvent(event);
        });
      }
    });
    if (mythis.seismographConfig.linkedTimeScale) {
      mythis.seismographConfig.linkedTimeScale.notifyAll();
    }
    if (mythis.seismographConfig.linkedAmplitudeScale) {
      mythis.seismographConfig.linkedAmplitudeScale.notifyAll();
    }
  }
  drawTools(sortedData: Array<SeismogramDisplayData>) {
    if ( ! this.isConnected) { return; }
    const wrapper = (this.getShadowRoot().querySelector('div') as HTMLDivElement);
    const toolsElement = wrapper.querySelector(ORG_DISP_TOOLS_ELEMENT);
    if (this.tools !== 'true' && toolsElement) {
      wrapper.removeChild(toolsElement);
    } else if (this.tools === 'true' && ! isDef(toolsElement)) {
      const sortedData = sort(this.seisData, this.sortby);
      const toolsdisp = new OrganizedDisplayTools(sortedData, this.seismographConfig);
      toolsdisp.organizedDisplay = this;
      // tools is first
      wrapper.insertBefore(toolsdisp, wrapper.firstElementChild);
    }
  }
  drawMap(sortedData: Array<SeismogramDisplayData>) {
    if ( ! this.isConnected) { return; }
    const wrapper = (this.getShadowRoot().querySelector('div') as HTMLDivElement);
    const mapElement = wrapper.querySelector(MAP_ELEMENT) as QuakeStationMap;
    if (this.map !== 'true' && mapElement) {
      wrapper.removeChild(mapElement);
    } else if (this.map === 'true' && ! isDef(mapElement)) {
      const mapdisp = new QuakeStationMap(sortedData, this.seismographConfig);
      // map is first
      const toolsElement = wrapper.querySelector(ORG_DISP_TOOLS_ELEMENT);
      // info second after map
      if (toolsElement) {
        if (toolsElement.nextElementSibling) {
          wrapper.insertBefore(mapdisp, toolsElement.nextElementSibling);
        } else {
          wrapper.appendChild(mapdisp);
        }
      } else {
        wrapper.insertBefore(mapdisp, wrapper.firstElementChild);
      }
    } else if (this.map === 'true' && isDef(mapElement)) {
      mapElement.seisData = sortedData;
    }
  }
  drawInfo(sortedData: Array<SeismogramDisplayData>) {
    if ( ! this.isConnected) { return; }
    const wrapper = (this.getShadowRoot().querySelector('div') as HTMLDivElement);
    const infoElement = wrapper.querySelector(INFO_ELEMENT) as QuakeStationTable;
    if (this.info !== 'true' && infoElement) {
      wrapper.removeChild(infoElement);
    } else if (this.info === 'true' && ! isDef(infoElement)) {
      const sortedData = sort(this.seisData, this.sortby);
      const infoDisp = new QuakeStationTable(sortedData, this.seismographConfig);
      const toolsElement = wrapper.querySelector(ORG_DISP_TOOLS_ELEMENT);
      const mapElement = wrapper.querySelector(MAP_ELEMENT);
      // info after tools and map
      if (mapElement) {
        if (mapElement.nextElementSibling) {
          wrapper.insertBefore(infoDisp, mapElement.nextElementSibling);
        } else {
          wrapper.appendChild(infoDisp);
        }
      } else if (toolsElement) {
        if (toolsElement.nextElementSibling) {
          wrapper.insertBefore(infoDisp, toolsElement.nextElementSibling);
        } else {
          wrapper.appendChild(infoDisp);
        }

      } else {
        wrapper.insertBefore(infoDisp, wrapper.firstElementChild);
      }
    } else if (this.info === 'true' && isDef(infoElement)) {
      infoElement.seisData = sortedData;
    }
  }
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === WITH_MAP) {
      const sortedData = sort(this.seisData, this.sortby);
      this.drawMap(sortedData);
    } else if (name === WITH_INFO) {
      const sortedData = sort(this.seisData, this.sortby);
      this.drawInfo(sortedData);
    } else {
      this.draw();
    }
  }
}
customElements.define(ORG_DISPLAY, OrganizedDisplay);

export function getFromQueryParams(
  qParams: any,
  name: string,
  defaultValue = "",
): string {
  if (name in qParams) {
    if (isStringArg(qParams[name])) {
      return qParams[name];
    } else {
      throw new Error(`param ${name} exists but is not string: ${stringify(qParams[name])}`);
    }
  }

  return defaultValue;
}
export function individualDisplay(
  sddList: Array<SeismogramDisplayData>,
  seisConfig?: SeismographConfig,
): Array<OrganizedDisplayItem> {
  if ( ! seisConfig) {
    seisConfig = new SeismographConfig();
  }
  return sddList.map(sdd => {
    const odisp = new OrganizedDisplayItem([ sdd ], seisConfig);
    return odisp;
  });
}
export function mapAndIndividualDisplay(
  sddList: Array<SeismogramDisplayData>,
  seisConfig?: SeismographConfig
): Array<OrganizedDisplayItem> {
  if ( ! seisConfig) {
    seisConfig = new SeismographConfig();
  }
  const map = new OrganizedDisplayItem(sddList, seisConfig);
  map.plottype = MAP;
  const individual = individualDisplay(sddList);
  individual.unshift(map);
  return individual;
}
export function overlayBySDDFunction(
  sddList: Array<SeismogramDisplayData>,
  key: string,
  sddFun: (arg0: SeismogramDisplayData) => string | number | null,
  seisConfig?: SeismographConfig
): Array<OrganizedDisplayItem> {
  if ( ! seisConfig) {
    seisConfig = new SeismographConfig();
  }
  const out: Array<OrganizedDisplayItem> = [];
  sddList.forEach(sdd => {
    let found = false;
    const val = sddFun(sdd);

    if (!isDef(val)) {
      // do not add/skip sdd that sddFun returns null
      return;
    }

    out.forEach(org => {
      if (org.getExtra(key) === val) {
        org.seisData.push(sdd);
        found = true;
      }
    });

    if (!found) {
      const org = new OrganizedDisplayItem([ sdd ], seisConfig);
      org.setExtra(key, val);
      out.push(org);
    }
  });
  return out;
}
export function overlayByComponent(
  sddList: Array<SeismogramDisplayData>,
  seisConfig?: SeismographConfig
): Array<OrganizedDisplayItem> {
  return overlayBySDDFunction(sddList, "component", sdd =>
    sdd.channelCode.charAt(2),
    seisConfig
  );
}
export function overlayByStation(
  sddList: Array<SeismogramDisplayData>,
  seisConfig?: SeismographConfig
): Array<OrganizedDisplayItem> {
  return overlayBySDDFunction(
    sddList,
    "station",
    sdd => sdd.networkCode + "_" + sdd.stationCode,
    seisConfig
  );
}
export function overlayAll(
  sddList: Array<SeismogramDisplayData>,
  seisConfig?: SeismographConfig
): Array<OrganizedDisplayItem> {
  return overlayBySDDFunction(sddList, "all", () => "all", seisConfig);
}
export function sortByKey(
  organized: Array<OrganizedDisplayItem>,
  key: string,
): Array<OrganizedDisplayItem> {
  organized.sort((orgA, orgB) => {
    const valA = orgA.getExtra(key);
    const valB = orgB.getExtra(key);

    if (!valA && !valB) {
      return 0;
    } else if (!valA) {
      return 1;
    } else if (!valB) {
      return -1;
    } else if (valA < valB) {
      return -1;
    } else if (valA > valB) {
      return 1;
    } else {
      return 0;
    }
  });
  return organized;
}

/**
 * Groups seismic data into subarrays where members of each subarray are
 * from the same network/station, have the same band and gain/instrument code
 * and overlap in time. Note, in most cases the subarrays will have
 * 1, 2 or 3 elements, but this is not checked nor guaranteed.
 *
 * @param   sddList list of SeismogramDisplayData to split
 * @returns          array of array of data, organized by component of motion
 */
export function groupComponentOfMotion(
  sddList: Array<SeismogramDisplayData>,
): Array<Array<SeismogramDisplayData>> {
  let tmpSeisDataList = Array.from(sddList);

  const bifurcate = (arr: Array<SeismogramDisplayData>, filter: (arg0: SeismogramDisplayData) => boolean) =>
    arr.reduce((acc: Array<Array<SeismogramDisplayData>>, val: SeismogramDisplayData) => (acc[filter(val) ? 0 : 1].push(val), acc), [
      [],
      [],
    ]);

  const byFriends = [];
  let first=tmpSeisDataList.shift();
  while (isDef(first)) {

    const isFriend = (sdddB: SeismogramDisplayData) =>
      isDef(first) && /* dumb, typescript */
      first.networkCode === sdddB.networkCode &&
      first.stationCode === sdddB.stationCode &&
      first.locationCode === sdddB.locationCode &&
      first.channelCode.slice(0, 2) === sdddB.channelCode.slice(0, 2) &&
      first.timeRange.overlaps(sdddB.timeRange);

    const splitArray = bifurcate(tmpSeisDataList, isFriend);
    const nextGroup = splitArray[0];
    nextGroup.unshift(first);
    byFriends.push(nextGroup);
    tmpSeisDataList = splitArray[1];
    first=tmpSeisDataList.shift();
  }

  return byFriends;
}

export function createAttribute(
  organized: Array<OrganizedDisplayItem>,
  key: string,
  valueFun: (arg0: OrganizedDisplayItem) => string | number | null,
): Array<OrganizedDisplayItem> {
  organized.forEach(org => {
    if (org.seisData.length > 0) {
      const v = valueFun(org);
      org.setExtra(key, v);
    } else {
      org.setExtra(key, null);
    }
  });
  return organized;
}
export function createPlots(
  organized: Array<OrganizedDisplayItem>,
  divElement: HTMLElement,
) {
  organized.forEach(org => {
    divElement.appendChild(org);
  });
}
