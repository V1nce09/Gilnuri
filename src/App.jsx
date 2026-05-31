import React, { useEffect, useMemo, useRef, useState } from "react";

const defaultSchools = [
  { id: "sample-seoul-e-1", name: "서울가온초등학교", type: "초등학교", officeCode: "7010000", officeName: "서울특별시교육청", lat: 37.5665, lon: 126.978, address: "서울특별시", accidentSpots: 4, crosswalkRisk: 62, roadRisk: 48, speedRisk: 51, zoneScore: 78, cctvCount: 6, lightingScore: 68, sidewalkScore: 72 },
  { id: "sample-seoul-m-1", name: "서울나래중학교", type: "중학교", officeCode: "7010000", officeName: "서울특별시교육청", lat: 37.55, lon: 127.02, address: "서울특별시", accidentSpots: 5, crosswalkRisk: 68, roadRisk: 55, speedRisk: 54, zoneScore: 72, cctvCount: 4, lightingScore: 61, sidewalkScore: 66 },
  { id: "sample-gg-e-1", name: "경기가람초등학교", type: "초등학교", officeCode: "7530000", officeName: "경기도교육청", lat: 37.4138, lon: 127.5183, address: "경기도", accidentSpots: 3, crosswalkRisk: 57, roadRisk: 45, speedRisk: 48, zoneScore: 82, cctvCount: 7, lightingScore: 71, sidewalkScore: 75 },
  { id: "sample-busan-m-1", name: "부산바다중학교", type: "중학교", officeCode: "7150000", officeName: "부산광역시교육청", lat: 35.1796, lon: 129.0756, address: "부산광역시", accidentSpots: 5, crosswalkRisk: 66, roadRisk: 56, speedRisk: 58, zoneScore: 68, cctvCount: 4, lightingScore: 63, sidewalkScore: 64 }
];

const routeOptions = [
  { id: "safe", name: "안전 우선", title: "안전 우선 경로", scoreDelta: 10, distanceFactor: 1.18, timeFactor: 1.15, description: "보호구역과 횡단보도를 최대한 활용하는 경로입니다.", goodFor: "초등학생, 비 오는 날, 처음 가는 길" },
  { id: "balanced", name: "균형", title: "균형 경로", scoreDelta: 3, distanceFactor: 1.08, timeFactor: 1.05, description: "거리와 안전성을 함께 고려한 기본 추천 경로입니다.", goodFor: "평상시 등교 상황" },
  { id: "fast", name: "빠름", title: "빠른 경로", scoreDelta: -12, distanceFactor: 1.0, timeFactor: 1.0, description: "가장 짧지만 차량 통행량이 많은 구간을 일부 지납니다.", goodFor: "날씨가 좋고 교통량이 적은 시간대" }
];

const baseRiskPoints = [
  { id: 1, x: 22, y: 38, level: "high", label: "사고 다발 지점", detail: "차량 진입이 많아 좌우 확인이 필요한 구간입니다.", source: "교통안전 데이터" },
  { id: 2, x: 42, y: 52, level: "medium", label: "횡단보도 혼잡", detail: "등교 시간대 보행자가 집중되는 구간입니다.", source: "보행환경 데이터" },
  { id: 3, x: 63, y: 31, level: "safe", label: "보호구역", detail: "속도 제한과 안전 표지가 있는 구간입니다.", source: "어린이보호구역 데이터" },
  { id: 4, x: 76, y: 64, level: "high", label: "차량 속도 주의", detail: "차량 속도가 빠르게 느껴지는 구간입니다.", source: "도로 위험 데이터" },
  { id: 5, x: 52, y: 72, level: "medium", label: "보행로 좁음", detail: "학생들이 한 줄로 걸어야 하는 좁은 구간입니다.", source: "보행환경 데이터" }
];

const reportTypes = ["불법 주정차", "신호등 고장", "공사/장애물", "보도 파손", "시야 가림", "기타"];

const styles = {
  page: { minHeight: "100vh", background: "#f8fafc", color: "#0f172a", fontFamily: "'Pretendard', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  header: { position: "sticky", top: 0, zIndex: 10, background: "rgba(255,255,255,0.92)", borderBottom: "1px solid #e2e8f0", backdropFilter: "blur(12px)" },
  container: { maxWidth: 1200, margin: "0 auto", padding: "28px 20px 70px" },
  card: { background: "white", border: "1px solid #e2e8f0", borderRadius: 24, padding: 22, boxShadow: "0 1px 2px rgba(15,23,42,0.04)" },
  hero: { background: "linear-gradient(135deg, #0284c7, #0891b2 45%, #10b981)", borderRadius: 32, padding: 34, color: "white", boxShadow: "0 12px 34px rgba(2,132,199,0.22)" },
  input: { width: "100%", padding: "12px 14px", borderRadius: 14, border: "1px solid #cbd5e1", background: "white", fontWeight: 700 },
  button: { border: 0, borderRadius: 14, padding: "11px 15px", fontWeight: 900, cursor: "pointer" }
};

function ensureBrandFonts() {
  if (typeof document === "undefined" || document.getElementById("safe-route-brand-fonts")) return;
  const style = document.createElement("style");
  style.id = "safe-route-brand-fonts";
  style.textContent = `
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
    @font-face {
      font-family: 'GmarketSans';
      src: url('https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansBold.woff') format('woff');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
    body, button, input, select, textarea { font-family: 'Pretendard', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .safe-route-hero-title { font-family: 'GmarketSans', 'Pretendard', system-ui, sans-serif !important; font-weight: 700 !important; letter-spacing: -0.055em !important; line-height: 1.04 !important; }
  `;
  document.head.appendChild(style);
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (window.location.port === "5173" ? "http://localhost:8787" : "");
function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

const SETTINGS_STORAGE_KEY = "safe-commute-ai-settings-v1";
const REPORTS_STORAGE_KEY = "safe-commute-ai-reports-v1";
const ORIGINS_STORAGE_KEY = "safe-commute-ai-origins-v1";

function isValidOriginPoint(point) {
  const lat = Number(point?.lat);
  const lon = Number(point?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (!lat || !lon) return false;
  // 길누리는 국내 학교·통학권 분석 서비스이므로 잘못 저장된 0,0 또는 해외 좌표는 출발지로 쓰지 않는다.
  return lat >= 33 && lat <= 39 && lon >= 124 && lon <= 132;
}

function readSavedSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (parsed.origin && !isValidOriginPoint(parsed.origin)) delete parsed.origin;
    return parsed;
  } catch (error) {
    return {};
  }
}

function writeSavedSettings(settings) {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {}
}

function readSavedReports() {
  try {
    const raw = window.localStorage.getItem(REPORTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeSavedReports(reports) {
  try {
    window.localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports || []));
  } catch (error) {}
}

function readSavedOrigins() {
  try {
    const raw = window.localStorage.getItem(ORIGINS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => isValidOriginPoint(item)).slice(0, 8) : [];
  } catch (error) {
    return [];
  }
}

function writeSavedOrigins(origins) {
  try {
    window.localStorage.setItem(ORIGINS_STORAGE_KEY, JSON.stringify(origins || []));
  } catch (error) {}
}

function upsertSavedOrigin(origins, origin) {
  if (!isValidOriginPoint(origin)) return origins || [];
  const normalized = {
    label: origin.label || "저장된 출발지",
    lat: Number(origin.lat),
    lon: Number(origin.lon),
    savedAt: new Date().toLocaleString("ko-KR"),
  };
  const existing = origins || [];
  const withoutDuplicate = existing.filter((item) => Math.abs(Number(item.lat) - normalized.lat) > 0.00001 || Math.abs(Number(item.lon) - normalized.lon) > 0.00001);
  const next = [normalized, ...withoutDuplicate].slice(0, 8);
  if (existing[0] && Math.abs(Number(existing[0].lat) - normalized.lat) <= 0.00001 && Math.abs(Number(existing[0].lon) - normalized.lon) <= 0.00001) return existing;
  return next;
}

function readUrlSettings() {
  try {
    const params = new URLSearchParams(window.location.search);
    const originLat = Number(params.get("originLat"));
    const originLon = Number(params.get("originLon"));
    const next = {};
    if (params.get("office")) next.officeCode = params.get("office");
    if (params.get("school")) next.schoolId = params.get("school");
    if (params.get("route")) next.routeId = params.get("route");
    if (params.get("user")) next.userType = params.get("user");
    if (params.get("radius")) next.analysisRadius = Number(params.get("radius"));
    if (isValidOriginPoint({ lat: originLat, lon: originLon })) {
      next.origin = {
        label: params.get("originLabel") || "공유 링크 출발지",
        lat: originLat,
        lon: originLon,
      };
    }
    return next;
  } catch (error) {
    return {};
  }
}

function buildShareUrl({ officeCode, schoolId, routeId, userType, analysisRadius, origin }) {
  const url = new URL(window.location.href);
  const params = new URLSearchParams();
  if (officeCode) params.set("office", officeCode);
  if (schoolId) params.set("school", schoolId);
  if (routeId) params.set("route", routeId);
  if (userType) params.set("user", userType);
  if (analysisRadius) params.set("radius", String(analysisRadius));
  if (isValidOriginPoint(origin)) {
    params.set("originLat", String(origin.lat));
    params.set("originLon", String(origin.lon));
    params.set("originLabel", origin.label || "출발지");
  }
  url.search = params.toString();
  return url.toString();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function numberFrom(value, fallback = 0) {
  const text = String(value ?? "").split(",").join("").trim();
  const direct = Number(text);
  if (Number.isFinite(direct)) return direct;
  let kept = "";
  for (const char of text) {
    if ((char >= "0" && char <= "9") || char === "." || char === "-") kept += char;
  }
  const parsed = Number(kept);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function firstNumberFrom(value, fallback = 0) {
  const match = String(value ?? "").split(",").join("").match(new RegExp("-?[0-9]+(?:[.][0-9]+)?"));
  if (!match) return fallback;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanKey(value) {
  const bom = String.fromCharCode(65279);
  const tab = String.fromCharCode(9);
  return String(value ?? "").split(bom).join("").split(tab).join("").split(" ").join("").split('"').join("").split("'").join("").trim();
}

function cleanCell(value) {
  const bom = String.fromCharCode(65279);
  let text = String(value ?? "").split(bom).join("").trim();
  if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
  return text.trim();
}

function parseDelimitedLine(line, delimiter) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function pick(row, keys, fallback = "") {
  for (const key of keys) {
    const cleaned = cleanKey(key);
    if (row[cleaned] !== undefined && row[cleaned] !== null && String(row[cleaned]).trim() !== "") return String(row[cleaned]).trim();
  }
  return fallback;
}

function stableHash(text) {
  let hash = 0;
  const value = String(text || "school");
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) % 9973;
  return hash;
}

function enrichRiskFields(base) {
  const h = stableHash(`${base.id}-${base.name}`);
  const elementaryBonus = base.type.includes("초") ? 6 : 0;
  return {
    ...base,
    accidentSpots: 2 + (h % 6),
    crosswalkRisk: clamp(46 + (h % 30), 0, 100),
    roadRisk: clamp(38 + ((h * 3) % 28), 0, 100),
    speedRisk: clamp(35 + ((h * 5) % 32), 0, 100),
    zoneScore: clamp(68 + elementaryBonus - (h % 18), 0, 100),
    cctvCount: 2 + (h % 7),
    lightingScore: clamp(55 + ((h * 7) % 32), 0, 100),
    sidewalkScore: clamp(58 + ((h * 11) % 30), 0, 100)
  };
}

function normalizeLines(text) {
  const cr = String.fromCharCode(13);
  const lf = String.fromCharCode(10);
  return String(text || "").split(cr + lf).join(lf).split(cr).join(lf).split(lf).filter((line) => line.trim());
}

function parseSchoolLocationCsv(text) {
  const lines = normalizeLines(text);
  if (lines.length < 2) throw new Error("학교 위치 CSV에 헤더와 데이터가 필요합니다.");
  const tab = String.fromCharCode(9);
  const commaCount = lines[0].split(",").length;
  const tabCount = lines[0].split(tab).length;
  const delimiter = tabCount > commaCount ? tab : ",";
  const headers = parseDelimitedLine(lines[0], delimiter).map(cleanKey);
  const schools = [];
  for (let i = 1; i < lines.length; i += 1) {
    const columns = parseDelimitedLine(lines[i], delimiter);
    const row = {};
    headers.forEach((header, index) => { row[header] = cleanCell(columns[index]); });
    const lat = numberFrom(pick(row, ["위도", "lat", "latitude"]), 0);
    const lon = numberFrom(pick(row, ["경도", "lon", "lng", "longitude"]), 0);
    const name = pick(row, ["학교명", "schoolName", "name"], "");
    if (!name || !lat || !lon) continue;
    schools.push(enrichRiskFields({
      id: pick(row, ["학교ID", "schoolId", "id"], `school-${i}`),
      name,
      type: pick(row, ["학교급구분", "학교급", "type"], "학교"),
      officeCode: pick(row, ["시도교육청코드", "officeCode"], "unknown"),
      officeName: pick(row, ["시도교육청명", "officeName"], "미분류 교육청"),
      supportOfficeName: pick(row, ["교육지원청명"], ""),
      address: pick(row, ["소재지도로명주소", "소재지지번주소", "주소"], ""),
      lat,
      lon,
      dataDate: pick(row, ["데이터기준일자", "기준일자"], "")
    }));
  }
  if (schools.length === 0) throw new Error("위도·경도가 있는 학교 데이터를 찾지 못했습니다.");
  return schools;
}

function parseProtectionZoneCsv(text) {
  const rows = parseGenericCsvRows(text);
  return rows.map((row, index) => {
    const point = parsePointFromRow(
      row,
      ["위도", "lat", "latitude", "LATITUDE", "la", "y", "wgs84Lat", "mapY"],
      ["경도", "lon", "lng", "longitude", "LONGITUDE", "lo", "x", "wgs84Lon", "mapX"]
    );
    if (!point) return null;

    const facilityName = pick(row, ["대상시설명", "대상시설물명", "시설명", "보호구역명", "name", "facilityName", "trgetFcltyNm", "TRGET_FCLTY_NM"], "보호구역");
    const cctvInstalled = pick(row, ["CCTV설치여부", "CCTV여부", "cctvInstalled", "cctvYn", "cctvFcltYn", "cctvInstlYn", "CCTV_INSTL_YN"], "");
    const cctvCount = numberFrom(pick(row, ["CCTV설치대수", "CCTV대수", "cctvCount", "cctvNumber", "cctvCo", "cctvInstlCo", "CCTV_INSTL_CO"], 0), 0);
    const roadWidth = firstNumberFrom(pick(row, ["보호구역도로폭", "도로폭", "roadWidth", "prtcareaRw", "PRTCAREARW"], 0), 0);

    return {
      id: `zone-${index}-${facilityName}`,
      facilityType: pick(row, ["시설종류", "시설구분", "type", "facilityType", "fcltyKnd", "FCLTY_KND"], "보호구역"),
      facilityName,
      roadAddress: pick(row, ["소재지도로명주소", "도로명주소", "address", "roadAddress", "rdnmadr", "RDNMADR"], ""),
      lotAddress: pick(row, ["소재지지번주소", "지번주소", "lotAddress", "lnmadr", "LNMADR"], ""),
      ...point,
      agency: pick(row, ["관리기관명", "관리기관", "agency", "institutionNm", "INSTITUTION_NM"], ""),
      police: pick(row, ["관할경찰서명", "경찰서명", "police", "cmptncPolcsttnNm", "CMPTNC_POLCSTTN_NM"], ""),
      cctvInstalled,
      cctvCount,
      roadWidth,
      dataDate: pick(row, ["데이터기준일자", "기준일자", "dataDate", "referenceDate", "REFERENCE_DATE"], ""),
    };
  }).filter(Boolean);
}

function parseGenericCsvRows(text) {
  const lines = normalizeLines(text);
  if (lines.length < 2) return [];
  const tab = String.fromCharCode(9);
  const commaCount = lines[0].split(",").length;
  const tabCount = lines[0].split(tab).length;
  const delimiter = tabCount > commaCount ? tab : ",";
  const headers = parseDelimitedLine(lines[0], delimiter).map(cleanKey);
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const columns = parseDelimitedLine(lines[i], delimiter);
    const row = {};
    headers.forEach((header, index) => { row[header] = cleanCell(columns[index]); });
    rows.push(row);
  }
  return rows;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function norm(value, cap) {
  return clamp01((Number(value) || 0) / Math.max(Number(cap) || 1, 1));
}

function hasYes(value) {
  const text = String(value || "").trim().toUpperCase();
  return text === "Y" || text === "YES" || text.includes("있") || text.includes("가능") || text.includes("설치") || text.includes("운영");
}

function parsePointFromRow(row, latKeys = ["위도", "lat", "latitude"], lonKeys = ["경도", "lon", "lng", "longitude"]) {
  const lat = numberFrom(pick(row, latKeys, 0), 0);
  const lon = numberFrom(pick(row, lonKeys, 0), 0);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !lat || !lon) return null;
  if (lat < 33 || lat > 39 || lon < 124 || lon > 132) return null;
  return { lat, lon };
}

function parseYellowCarpetCsv(text) {
  return parseGenericCsvRows(text).map((row, index) => {
    const point = parsePointFromRow(row);
    if (!point) return null;
    return { id: `yellow-${index}`, ...point, name: pick(row, ["시설명", "name"], "옐로카펫"), address: pick(row, ["소재지도로명주소", "소재지지번주소", "주소"], ""), dataDate: pick(row, ["데이터기준일자", "기준일자"], "") };
  }).filter(Boolean);
}

function parseAccidentClusterCsv(text) {
  return parseGenericCsvRows(text).map((row, index) => {
    const point = parsePointFromRow(row);
    if (!point) return null;
    return {
      id: `accident-${index}`,
      ...point,
      type: pick(row, ["사고유형구분", "사고유형", "type"], "사고다발"),
      locationName: pick(row, ["사고지역위치명", "위치명", "name"], "사고다발지역"),
      accidentCount: numberFrom(pick(row, ["사고건수", "발생건수"], 0), 0),
      casualtyCount: numberFrom(pick(row, ["사상자수"], 0), 0),
      fatalCount: numberFrom(pick(row, ["사망자수"], 0), 0),
      seriousInjuryCount: numberFrom(pick(row, ["중상자수"], 0), 0),
      minorInjuryCount: numberFrom(pick(row, ["경상자수"], 0), 0),
      year: pick(row, ["사고연도", "연도"], ""),
    };
  }).filter(Boolean);
}

function parseSpeedCameraCsv(text) {
  return parseGenericCsvRows(text).map((row, index) => {
    const point = parsePointFromRow(row);
    if (!point) return null;
    return {
      id: `speed-camera-${index}`,
      ...point,
      place: pick(row, ["설치장소", "소재지도로명주소", "소재지지번주소"], "무인단속카메라"),
      enforcementType: pick(row, ["단속구분"], ""),
      speedLimit: numberFrom(pick(row, ["제한속도"], 0), 0),
      zoneType: pick(row, ["보호구역구분"], ""),
      installYear: numberFrom(pick(row, ["설치연도"], 0), 0),
    };
  }).filter(Boolean);
}

function parseSecurityLightCsv(text) {
  return parseGenericCsvRows(text).map((row, index) => {
    const point = parsePointFromRow(row);
    if (!point) return null;
    return {
      id: `security-light-${index}`,
      ...point,
      name: pick(row, ["보안등위치명", "위치명", "name"], "보안등"),
      installCount: Math.max(1, numberFrom(pick(row, ["설치개수"], 1), 1)),
      installYear: numberFrom(pick(row, ["설치연도"], 0), 0),
      type: pick(row, ["설치형태"], ""),
    };
  }).filter(Boolean);
}

function parsePedestrianPriorityRoadCsv(text) {
  return parseGenericCsvRows(text).map((row, index) => {
    const start = parsePointFromRow(row, ["보행자우선도로시작점위도", "시작점위도"], ["보행자우선도로시작점경도", "시작점경도"]);
    const end = parsePointFromRow(row, ["보행자우선도로종료점위도", "종료점위도"], ["보행자우선도로종료점경도", "종료점경도"]);
    if (!start || !end) return null;
    return {
      id: `ped-road-${index}`,
      name: pick(row, ["보행자우선도로명", "도로명"], "보행자우선도로"),
      start,
      end,
      mid: midpointPoint(start, end),
      lengthM: numberFrom(pick(row, ["연장거리"], 0), 0),
      roadWidth: firstNumberFrom(pick(row, ["도로폭"], 0), 0),
      speedLimit: numberFrom(pick(row, ["자동차운행속도제한속도", "제한속도"], 0), 0),
      protectedZone: hasYes(pick(row, ["보호구역지정여부"], "")),
      oneWay: hasYes(pick(row, ["일방통행적용여부"], "")),
      parkingAllowed: hasYes(pick(row, ["노상주차허용여부"], "")),
      pedestrianAccidentCount: numberFrom(pick(row, ["보행자교통사고발생건수"], 0), 0),
      pedestrianFatalCount: numberFrom(pick(row, ["보행자사망사고건수"], 0), 0),
      speedReductionFacility: pick(row, ["속도저감시설"], ""),
      trafficGuideFacility: pick(row, ["교통안내시설"], ""),
      pedestrianSafetyFacility: pick(row, ["보행안전시설"], ""),
      vulnerableSupportFacility: pick(row, ["보행약자지원시설"], ""),
      convenienceFacility: pick(row, ["보행자편익시설"], ""),
    };
  }).filter(Boolean);
}

function parseSmartStreetLightCsv(text) {
  return parseGenericCsvRows(text).map((row, index) => {
    const point = parsePointFromRow(row);
    if (!point) return null;
    return {
      id: `smart-light-${index}`,
      ...point,
      type: pick(row, ["스마트가로등유형", "스마트가로등형태"], "스마트가로등"),
      lightingOn: hasYes(pick(row, ["점등상태여부"], "")),
      hasCctv: hasYes(pick(row, ["CCTV유무"], "")),
      hasWifi: hasYes(pick(row, ["WiFi유무"], "")),
      hasBeacon: hasYes(pick(row, ["비콘유무"], "")),
      lightingControl: hasYes(pick(row, ["조명제어여부"], "")),
      emergencyReport: hasYes(pick(row, ["위급상황신고가능여부"], "")),
      installYear: numberFrom(pick(row, ["설치연도"], 0), 0),
    };
  }).filter(Boolean);
}

function filterNearbyPoints(items, center, radiusKm) {
  return (items || [])
    .map((item) => ({ ...item, distanceKm: distanceKm(center, item) }))
    .filter((item) => Number.isFinite(item.distanceKm) && item.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

function pedestrianRoadDistanceKm(center, road) {
  if (!road?.start || !road?.end) return 999;
  return Math.min(distanceKm(center, road.start) || 999, distanceKm(center, road.mid) || 999, distanceKm(center, road.end) || 999, pointSegmentDistanceKm(center, road.start, road.end) || 999);
}

function isSchoolZoneSpeedCamera(item) {
  const zoneText = String(item?.zoneType || "").trim();
  const placeText = String(item?.place || "").trim();
  const joined = `${zoneText} ${placeText}`;
  const schoolKeywords = ["어린이", "스쿨", "학교", "초교", "초등", "유치원", "어린이집"];
  if (schoolKeywords.some((keyword) => joined.includes(keyword))) return true;
  // 전국무인교통단속카메라 CSV는 기관별로 보호구역구분을 숫자 코드로 주는 경우가 있어
  // 실제 장소명이 학교 앞이고 zoneType이 2로 들어온 사례를 놓치지 않도록 1, 2를 보호구역 계열로 폭넓게 인정한다.
  if (["1", "2"].includes(zoneText)) return true;
  return false;
}

function analyzePublicSafetyDatasets(school, datasets, protectionAnalysis, reportAnalysis, situation, radiusMeters) {
  const radiusKm = Number(radiusMeters || 500) / 1000;
  const routeLenM = Math.max(Number(radiusMeters || 500) * 2, 300);
  const currentYear = new Date().getFullYear();
  const yellowCarpets = filterNearbyPoints(datasets?.yellowCarpets, school, radiusKm);
  const accidentClusters = filterNearbyPoints(datasets?.accidentClusters, school, radiusKm);
  const speedCameras = filterNearbyPoints(datasets?.speedCameras, school, radiusKm);
  const securityLights = filterNearbyPoints(datasets?.securityLights, school, radiusKm);
  const smartStreetLights = filterNearbyPoints(datasets?.smartStreetLights, school, radiusKm);
  const pedestrianRoads = (datasets?.pedestrianRoads || [])
    .map((road) => ({ ...road, distanceKm: pedestrianRoadDistanceKm(school, road) }))
    .filter((road) => Number.isFinite(road.distanceKm) && road.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const childAccidentClusters = accidentClusters.filter((item) => String(item.type || "").includes("어린이") || String(item.type || "").includes("스쿨존"));
  const accidentCaseCount = accidentClusters.reduce((sum, item) => sum + Number(item.accidentCount || 0), 0);
  const fatalCount = accidentClusters.reduce((sum, item) => sum + Number(item.fatalCount || 0), 0);
  const seriousInjuryCount = accidentClusters.reduce((sum, item) => sum + Number(item.seriousInjuryCount || 0), 0);
  const securityLightCount = securityLights.reduce((sum, item) => sum + Number(item.installCount || 1), 0);
  const oldSecurityLightCount = securityLights.filter((item) => item.installYear && item.installYear <= currentYear - 15).length;
  const smartLightWithCctvCount = smartStreetLights.filter((item) => item.hasCctv).length;
  const emergencyLightCount = smartStreetLights.filter((item) => item.emergencyReport).length;
  const lightingControlCount = smartStreetLights.filter((item) => item.lightingControl).length;
  const lowSpeedCameraCount = speedCameras.filter((item) => item.speedLimit && item.speedLimit <= 30).length;
  const schoolZoneCameraCount = speedCameras.filter((item) => isSchoolZoneSpeedCamera(item)).length;
  const pedestrianSafetyFacilityCount = pedestrianRoads.filter((item) => String(item.pedestrianSafetyFacility || "").trim()).length;
  const speedReductionFacilityCount = pedestrianRoads.filter((item) => String(item.speedReductionFacility || "").trim()).length;
  const lowSpeedRoadCount = pedestrianRoads.filter((item) => item.speedLimit && item.speedLimit <= 30).length;
  const pedestrianAccidentCount = pedestrianRoads.reduce((sum, item) => sum + Number(item.pedestrianAccidentCount || 0), 0);
  const pedestrianFatalCount = pedestrianRoads.reduce((sum, item) => sum + Number(item.pedestrianFatalCount || 0), 0);
  const widths = [
    ...(protectionAnalysis?.averageRoadWidth ? [protectionAnalysis.averageRoadWidth] : []),
    ...pedestrianRoads.map((item) => Number(item.roadWidth || 0)).filter((value) => value > 0),
  ];
  const averageRoadWidth = widths.length ? widths.reduce((a, b) => a + b, 0) / widths.length : 0;

  const protectionCount = Number(protectionAnalysis?.count || 0);
  const cctvTotal = Number(protectionAnalysis?.cctvTotal || 0);
  const noCctvCount = Number(protectionAnalysis?.noCctvCount || 0);
  const narrowRoadCount = Number(protectionAnalysis?.narrowRoadCount || 0);
  const protectionTotal = Math.max(protectionCount, 1);
  const cctvCoverage = protectionCount > 0 ? clamp01((cctvTotal / protectionTotal) / 2) : 0;
  const noCctvRatio = protectionCount > 0 ? clamp01(noCctvCount / protectionTotal) : 1;
  const narrowRoadRatio = protectionCount > 0 ? clamp01(narrowRoadCount / protectionTotal) : 0.5;
  const protectionScore = norm(protectionCount, 3);
  const protectionInfraScore = protectionCount > 0
    ? clamp(75 + cctvCoverage * 25 - noCctvRatio * 40 - narrowRoadRatio * 35, 0, 100)
    : 45;

  const yellowDensity = clamp01(yellowCarpets.length / (routeLenM / 300));
  const pedestrianSafetyFacilityScore = norm(pedestrianSafetyFacilityCount, 3);
  const speedReductionFacilityScore = norm(speedReductionFacilityCount, 3);
  const roadWidthScore = averageRoadWidth > 0 ? clamp01(averageRoadWidth / 6) : 0.45;
  const pedestrianAccidentPenalty = norm(pedestrianAccidentCount, 5);
  const lowSpeedCameraDensityForWalk = clamp01(lowSpeedCameraCount / (routeLenM / 500));
  const walkingEnvRawScore = clamp(
    yellowDensity * 22
    + pedestrianSafetyFacilityScore * 18
    + speedReductionFacilityScore * 18
    + roadWidthScore * 24
    + protectionScore * 12
    + cctvCoverage * 8
    + lowSpeedCameraDensityForWalk * 8
    - pedestrianAccidentPenalty * 20
    - norm(reportAnalysis?.highRiskCount || 0, 5) * 8,
    0,
    100
  );
  const walkingEnvDataSparse = yellowCarpets.length === 0 && pedestrianRoads.length === 0 && pedestrianAccidentCount === 0 && (reportAnalysis?.highRiskCount || 0) === 0;
  const walkingEnvScore = walkingEnvDataSparse ? Math.max(walkingEnvRawScore, 48) : walkingEnvRawScore;

  const lightDensity = clamp01(securityLightCount / (routeLenM / 50));
  const smartDensity = clamp01(smartStreetLights.length / (routeLenM / 100));
  const oldLightRatio = securityLightCount > 0 ? clamp01(oldSecurityLightCount / securityLightCount) : 0;
  const smartCctvRatio = smartStreetLights.length > 0 ? clamp01(smartLightWithCctvCount / smartStreetLights.length) : 0;
  const emergencyLightRatio = smartStreetLights.length > 0 ? clamp01(emergencyLightCount / smartStreetLights.length) : 0;
  const lightingRawScore = clamp(
    lightDensity * 45
    + smartDensity * 30
    + smartCctvRatio * 15
    + emergencyLightRatio * 10
    - oldLightRatio * 20,
    0,
    100
  );
  const lightingDataMissing = securityLightCount === 0 && smartStreetLights.length === 0;
  const lightingScore = lightingDataMissing ? 50 : lightingRawScore;

  const schoolCamDensity = clamp01(schoolZoneCameraCount / (routeLenM / 500));
  const lowSpeedCamRatio = speedCameras.length > 0 ? clamp01(lowSpeedCameraCount / speedCameras.length) : 0;
  const lowSpeedCamDensity = clamp01(lowSpeedCameraCount / (routeLenM / 500));
  const speedCameraDensity = clamp01(speedCameras.length / (routeLenM / 500));
  const reductionDensity = clamp01(speedReductionFacilityCount / (routeLenM / 200));
  const lowSpeedRoadRate = pedestrianRoads.length > 0 ? clamp01(lowSpeedRoadCount / pedestrianRoads.length) : 0;
  const speedControlRawScore = clamp(
    schoolCamDensity * 24
    + lowSpeedCamDensity * 22
    + speedCameraDensity * 8
    + reductionDensity * 26
    + lowSpeedCamRatio * 10
    + lowSpeedRoadRate * 10,
    0,
    100
  );
  const hasMeaningfulSpeedControl = schoolZoneCameraCount > 0 || lowSpeedCameraCount > 0 || speedReductionFacilityCount > 0 || lowSpeedRoadCount > 0;
  const speedControlScore = hasMeaningfulSpeedControl ? Math.max(speedControlRawScore, 42) : speedControlRawScore;

  const clusterRisk = norm(childAccidentClusters.length, 5) * 100;
  const fatalRisk = norm(fatalCount, 3) * 100;
  const injuryRisk = norm(seriousInjuryCount, 10) * 100;
  const caseRisk = norm(accidentCaseCount, 20) * 100;
  const reportRisk = norm(reportAnalysis?.highRiskCount || 0, 5) * 100;
  const accidentRisk = clamp(
    clusterRisk * 0.45
    + fatalRisk * 0.18
    + injuryRisk * 0.14
    + caseRisk * 0.15
    + reportRisk * 0.08,
    0,
    100
  );

  const crosswalkYellowDensity = clamp01(yellowCarpets.length / (routeLenM / 200));
  const clusterPenalty = norm(childAccidentClusters.length, 4);
  const reportPenalty = norm(reportAnalysis?.highRiskCount || 0, 3);
  const crosswalkSafetyScore = clamp(
    crosswalkYellowDensity * 35
    + protectionScore * 30
    + schoolCamDensity * 15
    + lowSpeedCamDensity * 10
    - clusterPenalty * 20
    - reportPenalty * 10,
    0,
    100
  );

  const reportSafetyScore = clamp(
    100
    - Number(reportAnalysis?.penalty || 0) * 0.5
    - norm(reportAnalysis?.count || 0, 10) * 20
    - norm(reportAnalysis?.highRiskCount || 0, 5) * 30,
    0,
    100
  );
  const environmentSafetyScore = clamp(100 - Number(situation?.weatherRisk || 20), 0, 100);
  const warningPointCount = (protectionAnalysis?.narrowRoadCount || 0) + (protectionAnalysis?.noCctvCount || 0) + childAccidentClusters.length + (reportAnalysis?.highRiskCount || 0);
  const safeInfraCount = (protectionAnalysis?.count || 0) + (protectionAnalysis?.cctvTotal || 0) + yellowCarpets.length + securityLightCount + smartStreetLights.length + speedCameras.length;
  const dataCoverageCount = yellowCarpets.length + accidentClusters.length + speedCameras.length + securityLights.length + smartStreetLights.length + pedestrianRoads.length + (protectionAnalysis?.count || 0);
  const scoreDebug = {
    routeLenM,
    protection: {
      formula: "protectionCount>0 ? clamp(75 + cctvCoverage*25 - noCctvRatio*40 - narrowRoadRatio*35, 0, 100) : 45",
      variables: { protectionCount, cctvTotal, noCctvCount, narrowRoadCount, cctvCoverage, noCctvRatio, narrowRoadRatio, protectionInfraScore },
    },
    walking: {
      formula: "raw=clamp(yellowDensity*22 + pedestrianSafetyFacilityScore*18 + speedReductionFacilityScore*18 + roadWidthScore*24 + protectionScore*12 + cctvCoverage*8 + lowSpeedCameraDensityForWalk*8 - pedestrianAccidentPenalty*20 - highRiskReportNorm*8, 0, 100); sparseData이면 max(raw,48)",
      variables: { yellowCarpetCount: yellowCarpets.length, yellowDensity, pedestrianSafetyFacilityCount, pedestrianSafetyFacilityScore, speedReductionFacilityCount, speedReductionFacilityScore, averageRoadWidth, roadWidthScore, protectionScore, cctvCoverage, lowSpeedCameraDensityForWalk, pedestrianAccidentCount, pedestrianAccidentPenalty, highRiskReportNorm: norm(reportAnalysis?.highRiskCount || 0, 5), walkingEnvDataSparse, walkingEnvRawScore, walkingEnvScore },
    },
    lighting: {
      formula: "raw=clamp(lightDensity*45 + smartDensity*30 + smartCctvRatio*15 + emergencyLightRatio*10 - oldLightRatio*20, 0, 100); 조명 데이터 0건이면 50점 중립 처리",
      variables: { securityLightCount, smartStreetLightCount: smartStreetLights.length, oldSecurityLightCount, lightDensity, smartDensity, smartLightWithCctvCount, smartCctvRatio, emergencyLightCount, emergencyLightRatio, oldLightRatio, lightingDataMissing, lightingRawScore, lightingScore },
    },
    speed: {
      formula: "raw=clamp(schoolCamDensity*24 + lowSpeedCamDensity*22 + speedCameraDensity*8 + reductionDensity*26 + lowSpeedCamRatio*10 + lowSpeedRoadRate*10, 0, 100); 의미 있는 속도제어 인프라가 있으면 max(raw,42)",
      variables: { schoolZoneCameraCount, lowSpeedCameraCount, speedCameraCount: speedCameras.length, speedReductionFacilityCount, lowSpeedRoadCount, pedestrianRoadCount: pedestrianRoads.length, schoolCamDensity, lowSpeedCamDensity, speedCameraDensity, reductionDensity, lowSpeedCamRatio, lowSpeedRoadRate, hasMeaningfulSpeedControl, speedControlRawScore, speedControlScore }
    },
    accident: {
      formula: "clamp(clusterRisk*0.45 + fatalRisk*0.18 + injuryRisk*0.14 + caseRisk*0.15 + reportRisk*0.08, 0, 100)",
      variables: { childAccidentClusterCount: childAccidentClusters.length, accidentCaseCount, fatalCount, seriousInjuryCount, highRiskReportCount: reportAnalysis?.highRiskCount || 0, clusterRisk, fatalRisk, injuryRisk, caseRisk, reportRisk, accidentRisk },
    },
    crosswalk: {
      formula: "clamp(crosswalkYellowDensity*35 + protectionScore*30 + schoolCamDensity*15 + lowSpeedCamDensity*10 - clusterPenalty*20 - reportPenalty*10, 0, 100)",
      variables: { yellowCarpetCount: yellowCarpets.length, protectionCount, childAccidentClusterCount: childAccidentClusters.length, highRiskReportCount: reportAnalysis?.highRiskCount || 0, crosswalkYellowDensity, protectionScore, schoolCamDensity, lowSpeedCamDensity, clusterPenalty, reportPenalty, crosswalkSafetyScore }
    },
    environment: {
      formula: "clamp(100 - situation.weatherRisk, 0, 100)",
      variables: { weatherRisk: situation?.weatherRisk || 20, environmentSafetyScore },
    },
    report: {
      formula: "clamp(100 - reportPenalty*0.5 - norm(reportCount,10)*20 - norm(highRiskCount,5)*30, 0, 100)",
      variables: { reportPenaltyValue: reportAnalysis?.penalty || 0, reportCount: reportAnalysis?.count || 0, highRiskCount: reportAnalysis?.highRiskCount || 0, reportSafetyScore },
    },
  };

  return {
    radiusMeters,
    yellowCarpetCount: yellowCarpets.length,
    accidentClusterCount: accidentClusters.length,
    childAccidentClusterCount: childAccidentClusters.length,
    accidentCaseCount,
    fatalCount,
    seriousInjuryCount,
    speedCameraCount: speedCameras.length,
    lowSpeedCameraCount,
    schoolZoneCameraCount,
    securityLightCount,
    securityLightPointCount: securityLights.length,
    smartStreetLightCount: smartStreetLights.length,
    smartLightWithCctvCount,
    emergencyLightCount,
    pedestrianRoadCount: pedestrianRoads.length,
    pedestrianSafetyFacilityCount,
    speedReductionFacilityCount,
    lowSpeedRoadCount,
    averageRoadWidth,
    protectionInfraScore,
    lightingScore,
    walkingEnvScore,
    speedControlScore,
    accidentRisk,
    crosswalkSafetyScore,
    reportSafetyScore,
    environmentSafetyScore,
    warningPointCount,
    safeInfraCount,
    dataCoverageCount,
    scoreDebug,
    nearby: { yellowCarpets: yellowCarpets.slice(0, 5), accidentClusters: accidentClusters.slice(0, 5), speedCameras: speedCameras.slice(0, 5), securityLights: securityLights.slice(0, 5), smartStreetLights: smartStreetLights.slice(0, 5), pedestrianRoads: pedestrianRoads.slice(0, 5) }
  };
}

function decodeCsvBuffer(buffer, preferredKeywords = []) {
  let utf8 = "";
  let euckr = "";
  try { utf8 = new TextDecoder("utf-8").decode(buffer); } catch (error) { utf8 = ""; }
  try { euckr = new TextDecoder("euc-kr").decode(buffer); } catch (error) { euckr = ""; }

  const commonKeywords = ["학교명", "시도교육청", "교육지원청", "대상시설명", "시설종류", "위도", "경도", "CCTV", "보호구역", "도로폭"];
  const keywords = [...preferredKeywords, ...commonKeywords];

  function score(text) {
    const value = String(text || "");
    const keywordScore = keywords.reduce((sum, keyword) => sum + (value.includes(keyword) ? 1 : 0), 0) * 10;
    const brokenPenalty = (value.match(/�/g) || []).length;
    const mojibakePenalty = (value.match(/[ÃÂìíêëð]/g) || []).length;
    return keywordScore - brokenPenalty - mojibakePenalty;
  }

  return score(utf8) >= score(euckr) ? utf8 : euckr;
}

function decodeSchoolCsvBuffer(buffer) {
  return decodeCsvBuffer(buffer, ["학교명", "시도교육청", "교육지원청", "학교급구분"]);
}

function decodeProtectionZoneCsvBuffer(buffer) {
  return decodeCsvBuffer(buffer, ["시설종류", "대상시설명", "위도", "경도", "CCTV설치여부", "CCTV설치대수", "보호구역도로폭"]);
}

function buildOffices(schools) {
  const map = new Map();
  schools.forEach((school) => {
    const code = school.officeCode || "unknown";
    if (!map.has(code)) map.set(code, { code, name: school.officeName || "미분류 교육청", count: 0, latSum: 0, lonSum: 0 });
    const item = map.get(code);
    item.count += 1;
    item.latSum += Number(school.lat || 0);
    item.lonSum += Number(school.lon || 0);
  });
  return Array.from(map.values()).map((item) => ({ code: item.code, name: item.name, count: item.count, lat: item.latSum / item.count, lon: item.lonSum / item.count })).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

function distanceKm(a, b) {
  if (!a || !b) return null;
  const r = 6371;
  const toRad = (v) => (Number(v) * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function routeMetrics(origin, school, route) {
  if (!isValidOriginPoint(origin)) return null;
  const straight = distanceKm(origin, school);
  if (!straight) return null;
  const routeKm = straight * route.distanceFactor;
  const minutes = Math.round((routeKm / 4.2) * 60 * route.timeFactor);
  return { straight, routeKm, minutes };
}

function analyzeUserReports(school, origin, reports, radiusMeters) {
  const center = origin || school;
  const radiusKm = Number(radiusMeters || 500) / 1000;
  const typeWeights = {
    "불법 주정차": 12,
    "공사/장애물": 10,
    "신호등 고장": 14,
    "보도 파손": 9,
    "시야 방해": 11,
    "기타 위험": 7,
  };
  const nearby = (reports || [])
    .map((report) => ({ ...report, distanceKm: report.lat && report.lon ? distanceKm(center, report) : 999 }))
    .filter((report) => Number.isFinite(report.distanceKm) && report.distanceKm <= Math.max(radiusKm, 0.25))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 20);
  const penalty = nearby.reduce((sum, report) => sum + (typeWeights[report.type] || 7) * Math.max(0.35, 1 - report.distanceKm / Math.max(radiusKm, 0.25)), 0);
  const highRiskCount = nearby.filter((report) => ["신호등 고장", "불법 주정차", "시야 방해"].includes(report.type)).length;
  return {
    centerLabel: origin ? "출발지 주변" : "학교 주변",
    count: nearby.length,
    highRiskCount,
    penalty: clamp(penalty, 0, 35),
    nearby,
  };
}

function ReportImpactCard({ analysis }) {
  const items = analysis?.nearby || [];
  return <Card><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}><div><h2 style={{ margin: 0 }}>위험 제보 반영</h2><p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.7, fontSize: 14 }}>지도 핀으로 등록된 제보 중 현재 분석 반경 안의 제보를 안전 점수에 반영합니다.</p></div><Badge tone={items.length ? "red" : "gray"}>{items.length}건</Badge></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 14 }}><div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 16, padding: 14 }}><div style={{ color: "#be123c", fontSize: 12, fontWeight: 900 }}>제보 위험 보정</div><div style={{ marginTop: 6, fontSize: 28, fontWeight: 950 }}>{Math.round(analysis?.penalty || 0)}</div></div><div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 16, padding: 14 }}><div style={{ color: "#9a3412", fontSize: 12, fontWeight: 900 }}>고위험 제보</div><div style={{ marginTop: 6, fontSize: 28, fontWeight: 950 }}>{analysis?.highRiskCount || 0}</div></div></div>{items.length === 0 ? <p style={{ color: "#64748b", lineHeight: 1.7 }}>현재 분석 반경 안에 반영된 위험 제보가 없습니다.</p> : <div style={{ display: "grid", gap: 10, marginTop: 14 }}>{items.slice(0, 6).map((report) => <div key={report.id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><b>{report.type}</b><span style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>{Math.round(report.distanceKm * 1000)}m</span></div><p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>{report.memo || "상세 설명 없음"}</p></div>)}</div>}</Card>;
}

function analyzeProtectionZones(school, zones, radiusMeters) {
  const radiusKm = Number(radiusMeters || 500) / 1000;
  const nearby = (zones || [])
    .map((zone) => ({ ...zone, distanceKm: distanceKm(school, zone) }))
    .filter((zone) => Number.isFinite(zone.distanceKm) && zone.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const cctvTotal = nearby.reduce((sum, zone) => sum + Number(zone.cctvCount || 0), 0);
  const roadWidths = nearby.map((zone) => Number(zone.roadWidth || 0)).filter((value) => value > 0);
  const averageRoadWidth = roadWidths.length ? roadWidths.reduce((a, b) => a + b, 0) / roadWidths.length : 0;
  const narrowRoadCount = nearby.filter((zone) => zone.roadWidth > 0 && zone.roadWidth < 6).length;
  const noCctvCount = nearby.filter((zone) => Number(zone.cctvCount || 0) === 0 && !String(zone.cctvInstalled || "").includes("Y") && !String(zone.cctvInstalled || "").includes("있")).length;

  const infrastructureScore = clamp(55 + Math.min(cctvTotal * 3, 24) + Math.min(nearby.length * 4, 18) - narrowRoadCount * 5 - noCctvCount * 3, 0, 100);
  const riskPenalty = clamp(narrowRoadCount * 6 + noCctvCount * 4 - Math.min(cctvTotal * 1.5, 12), 0, 35);

  return {
    radiusMeters,
    count: nearby.length,
    cctvTotal,
    averageRoadWidth,
    narrowRoadCount,
    noCctvCount,
    infrastructureScore,
    riskPenalty,
    nearby: nearby.slice(0, 8)
  };
}

function getTone(score) {
  if (score >= 75) return { label: "안전", bg: "#dcfce7", fg: "#166534", border: "#bbf7d0" };
  if (score >= 55) return { label: "주의", bg: "#fef3c7", fg: "#92400e", border: "#fde68a" };
  return { label: "위험", bg: "#ffe4e6", fg: "#be123c", border: "#fecdd3" };
}

function Badge({ children, tone = "blue" }) {
  const colors = { blue: { bg: "#e0f2fe", fg: "#0369a1" }, green: { bg: "#dcfce7", fg: "#166534" }, yellow: { bg: "#fef3c7", fg: "#92400e" }, red: { bg: "#ffe4e6", fg: "#be123c" }, dark: { bg: "#0f172a", fg: "#ffffff" }, gray: { bg: "#f1f5f9", fg: "#475569" } };
  const color = colors[tone] || colors.blue;
  return <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 900, background: color.bg, color: color.fg }}>{children}</span>;
}

function Card({ children, style, className }) {
  return <div className={className} style={{ ...styles.card, ...style }}>{children}</div>;
}

function CollapsibleSection({ title, children, defaultOpen = true, className = "", style }) {
  return (
    <Card className={`collapsible-section ${className}`} style={style}>
      <details open={defaultOpen}>
        <summary className="collapsible-summary">{title}</summary>
        <div className="collapsible-content">{children}</div>
      </details>
    </Card>
  );
}

function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem("gilnuri-admin") === "ok");
  const [adminError, setAdminError] = useState("");
  async function login(password) {
    setAdminError("");
    try {
      const response = await fetch(apiUrl("/api/dev-auth"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "관리자 인증에 실패했습니다.");
      localStorage.setItem("gilnuri-admin", "ok");
      setIsAdmin(true);
      return true;
    } catch (error) {
      setAdminError(error.message || "관리자 인증에 실패했습니다.");
      return false;
    }
  }
  function logout() {
    localStorage.removeItem("gilnuri-admin");
    setIsAdmin(false);
  }
  return { isAdmin, adminError, login, logout };
}

function StatCard({ icon, title, value, helper, color = "#0284c7", imageSrc, imageAlt }) {
  return <Card className="stat-card" style={imageSrc ? { minHeight: 250, overflow: "hidden" } : undefined}><div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}><div style={{ minWidth: 0, flex: 1 }}><div style={{ color: "#64748b", fontSize: 14, fontWeight: 800 }}>{title}</div><div className="stat-value" style={{ marginTop: 8, fontSize: 32, fontWeight: 950, lineHeight: 1.08, whiteSpace: "nowrap", wordBreak: "keep-all" }}>{value}</div><div style={{ marginTop: 8, color: "#64748b", fontSize: 13, lineHeight: 1.5, wordBreak: "keep-all" }}>{helper}</div></div><div style={{ width: 58, minWidth: 58, display: "grid", placeItems: "center" }}><div style={{ width: 58, height: 58, borderRadius: 22, background: `${color}18`, display: "grid", placeItems: "center", fontSize: 27 }}>{icon}</div></div></div>{imageSrc ? <div style={{ marginTop: 8, height: 138, display: "grid", placeItems: "center", overflow: "visible" }}><img src={imageSrc} alt={imageAlt || title} style={{ width: 230, maxWidth: "130%", height: 170, objectFit: "contain", display: "block", transform: "scale(1.18)", transformOrigin: "center", filter: "drop-shadow(0 18px 24px rgba(15,23,42,0.16))" }} /></div> : null}</Card>;
}


const MASCOT_IMAGES = {
  analyzing: "/mascots/Analyt_ing.png",
  dustBad: "/mascots/dust_bad.png",
  caution: "/mascots/mod_caution.png",
  danger: "/mascots/mod_danger.png",
  safe: "/mascots/mod_safe.png",
  report: "/mascots/report.png",
  reported: "/mascots/reported.png",
  weatherCloudy: "/mascots/wea_bad.png",
  weatherGood: "/mascots/wea_good.png",
  weatherRain: "/mascots/wea_rain.png",
  weatherSnow: "/mascots/wea_snow.png",
  weatherWind: "/mascots/wea_wind.png",
};

function getWeatherMascotKey(situation) {
  const weatherText = String(situation?.weatherText || "");
  const label = String(situation?.label || "");
  const precipitation = Number(situation?.precipitation || 0);
  const wind = Number(situation?.wind || 0);
  const merged = `${weatherText} ${label}`;
  if (merged.includes("눈")) return "weatherSnow";
  if (precipitation > 0 || merged.includes("비") || merged.includes("소나기") || merged.includes("이슬비") || merged.includes("뇌우")) return "weatherRain";
  if (wind >= 9 || merged.includes("강풍") || merged.includes("바람")) return "weatherWind";
  if (merged.includes("흐림") || merged.includes("구름") || merged.includes("안개")) return "weatherCloudy";
  return "weatherGood";
}

function getMascotKey({ isLoading, tab, reportMascotFlash, score, situation }) {
  if (isLoading) return "analyzing";
  if (reportMascotFlash) return "reported";
  if (tab === "report") return "report";
  if (score < 55) return "danger";
  if (score < 75) return "caution";
  const airLabel = situation?.airInfo?.label || "";
  if (airLabel === "나쁨" || airLabel === "매우 나쁨") return "dustBad";
  const weatherKey = getWeatherMascotKey(situation);
  if (weatherKey !== "weatherGood") return weatherKey;
  return "safe";
}

function MascotImage({ variant = "safe", size = 180, alt = "길누리 마스코트", style }) {
  const src = MASCOT_IMAGES[variant] || MASCOT_IMAGES.safe;
  return <img src={src} alt={alt} style={{ width: size, maxWidth: "100%", height: "auto", objectFit: "contain", display: "block", filter: "drop-shadow(0 18px 26px rgba(15,23,42,0.16))", ...style }} />;
}

function Bar({ label, value, danger = false }) {
  const width = clamp(value, 0, 100);
  return <div style={{ marginTop: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14, fontWeight: 900 }}><span>{label}</span><span>{Math.round(width)}</span></div><div style={{ marginTop: 8, height: 11, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}><div style={{ height: "100%", width: `${width}%`, background: danger ? "#fb7185" : "#34d399", borderRadius: 999 }} /></div></div>;
}

function weatherCodeText(code) {
  const map = { 0: "맑음", 1: "대체로 맑음", 2: "부분적으로 흐림", 3: "흐림", 45: "안개", 48: "짙은 안개", 51: "약한 이슬비", 53: "이슬비", 55: "강한 이슬비", 61: "약한 비", 63: "비", 65: "강한 비", 71: "약한 눈", 73: "눈", 75: "강한 눈", 80: "약한 소나기", 81: "소나기", 82: "강한 소나기", 95: "뇌우" };
  return map[code] || "날씨 정보";
}

function airGrade(pm25, pm10) {
  const p25 = Number(pm25 || 0);
  const p10 = Number(pm10 || 0);
  if (p25 > 75 || p10 > 150) return { label: "매우 나쁨", score: 90, tone: "red" };
  if (p25 > 35 || p10 > 80) return { label: "나쁨", score: 70, tone: "red" };
  if (p25 > 15 || p10 > 30) return { label: "보통", score: 40, tone: "yellow" };
  return { label: "좋음", score: 10, tone: "green" };
}

async function requestAiSafetyAnalysis(payload) {
  const response = await fetch(apiUrl("/api/safety-risk-analysis"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("AI 분석 서버 응답 오류");
  return response.json();
}

function localAiSafetyAnalysis({ selectedSchool, selectedOffice, weatherData, airData, routeMetricsValue, origin, selectedReportAnalysis, publicSafetyAnalysis }) {
  const current = weatherData?.current || {};
  const air = airData?.current || {};
  const precipitation = Number(current.precipitation || current.rain || 0);
  const weatherCode = Number(current.weather_code || 0);
  const wind = Number(current.wind_speed_10m || 0);
  const temperature = Number(current.temperature_2m || 0);
  const pm25 = Number(air.pm2_5 || 0);
  const pm10 = Number(air.pm10 || 0);
  const hour = new Date().getHours();
  const signals = [];
  let weatherArticleScore = 0;
  let trafficArticleScore = 0;
  let alertLevel = "낮음";
  const rainyCodes = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95];
  const snowCodes = [71, 73, 75];
  const fogCodes = [45, 48];
  if (precipitation > 0 || rainyCodes.includes(weatherCode)) { weatherArticleScore += 24; signals.push("비 또는 젖은 노면으로 미끄럼·시야 저하 위험 증가"); }
  if (snowCodes.includes(weatherCode) || temperature <= 0) { weatherArticleScore += 22; signals.push("저온·눈·빙판 가능성으로 보행 안전 주의"); }
  if (fogCodes.includes(weatherCode)) { weatherArticleScore += 16; signals.push("안개로 운전자와 보행자 시야 저하 가능"); }
  if (wind >= 9) { weatherArticleScore += 14; signals.push("강풍으로 우산 사용과 도로 주변 보행 주의"); }
  if (temperature >= 30) { weatherArticleScore += 12; signals.push("고온으로 탈수·피로 위험 증가"); }
  if (pm25 > 35 || pm10 > 80) { weatherArticleScore += 20; signals.push("미세먼지 나쁨 수준으로 마스크 착용 권장"); }
  else if (pm25 > 15 || pm10 > 30) { weatherArticleScore += 9; signals.push("대기질 보통 수준, 민감 학생은 주의"); }
  if (hour >= 7 && hour <= 9) { trafficArticleScore += 18; signals.push("등교 시간대 차량·보행자 혼잡 가능"); }
  if (hour >= 17 && hour <= 19) { trafficArticleScore += 12; signals.push("하교·퇴근 시간대 교통 혼잡 가능"); }
  if (routeMetricsValue && routeMetricsValue.routeKm >= 1.5) { trafficArticleScore += 13; signals.push("도보 이동 거리가 길어 위험 노출 시간이 증가"); }
  if (publicSafetyAnalysis?.childAccidentClusterCount > 0) {
    trafficArticleScore += Math.min(publicSafetyAnalysis.childAccidentClusterCount * 16, 28);
    signals.push(`반경 안 어린이·스쿨존 사고다발지역 ${publicSafetyAnalysis.childAccidentClusterCount}곳 확인`);
  }
  if (publicSafetyAnalysis?.walkingEnvScore < 55) {
    trafficArticleScore += 12;
    signals.push("보행자우선도로·도로폭·보행안전시설 기준 보행 환경 점수가 낮은 편");
  }
  if (publicSafetyAnalysis?.speedControlScore < 55) {
    trafficArticleScore += 10;
    signals.push("제한속도·단속카메라·속도저감시설 기준 차량 속도 주의 필요");
  }
  if (publicSafetyAnalysis?.yellowCarpetCount > 0) {
    trafficArticleScore = Math.max(0, trafficArticleScore - Math.min(publicSafetyAnalysis.yellowCarpetCount * 3, 9));
    signals.push(`횡단보도 옐로카펫 ${publicSafetyAnalysis.yellowCarpetCount}곳 확인`);
  }
  if (!origin) { trafficArticleScore += 6; signals.push("출발지 미설정으로 실제 통학 경로 분석 한계 존재"); }
  if (selectedReportAnalysis?.count > 0) {
    trafficArticleScore += Math.min(Number(selectedReportAnalysis.penalty || 0) * 0.8, 28);
    signals.push(`분석 반경 안 위험 제보 ${selectedReportAnalysis.count}건 반영`);
  }
  if (selectedReportAnalysis?.highRiskCount > 0) {
    trafficArticleScore += Math.min(Number(selectedReportAnalysis.highRiskCount || 0) * 6, 18);
    signals.push(`고위험 제보 ${selectedReportAnalysis.highRiskCount}건으로 보행 주의 필요`);
  }
  const totalScore = clamp(Math.round(weatherArticleScore * 0.58 + trafficArticleScore * 0.42), 0, 45);
  if (totalScore >= 34) alertLevel = "높음";
  else if (totalScore >= 18) alertLevel = "보통";
  const summary = signals.length ? `${selectedOffice?.name || "선택 지역"} ${selectedSchool.name} 주변은 ${signals.slice(0, 2).join(", ")} 신호가 있습니다.` : `${selectedOffice?.name || "선택 지역"} ${selectedSchool.name} 주변은 기상·교통 위험 신호가 낮은 편입니다.`;
  return {
    source: "local-fallback",
    score: totalScore,
    weatherArticleScore: clamp(weatherArticleScore, 0, 100),
    trafficArticleScore: clamp(trafficArticleScore, 0, 100),
    alertLevel,
    hits: signals.slice(0, 4),
    summary,
    recommendation: alertLevel === "높음" ? "안전 우선 경로를 추천하고, 보호자 확인 또는 여유 있는 출발이 필요합니다." : alertLevel === "보통" ? "균형 경로 이상을 추천하며, 횡단보도와 차량 진입 구간을 주의하세요." : "일반적인 안전 수칙을 지키면 등굣길 위험은 낮은 편입니다."
  };
}

function buildAiSituation({ weather, air, aiRisk, hour }) {
  const current = weather?.current || {};
  const precipitation = Number(current.precipitation || current.rain || 0);
  const weatherCode = Number(current.weather_code || 0);
  const wind = Number(current.wind_speed_10m || 0);
  const airInfo = airGrade(air?.current?.pm2_5, air?.current?.pm10);
  const isNight = hour < 7 || hour >= 18;
  const isRain = precipitation > 0 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(weatherCode);
  const isWind = wind >= 9;
  const labels = [];
  let weatherRisk = 20;
  let timeRisk = isNight ? 65 : 30;
  if (isRain) { labels.push("비/젖은 노면"); weatherRisk += 35; }
  if (airInfo.score >= 70) { labels.push("미세먼지"); weatherRisk += 25; } else if (airInfo.score >= 40) { labels.push("대기질 보통"); weatherRisk += 10; }
  if (isWind) { labels.push("강풍"); weatherRisk += 18; }
  if (isNight) labels.push("어두운 시간");
  if (aiRisk?.hits?.length) labels.push(...aiRisk.hits.slice(0, 2));
  const aiAuxRisk = Math.min(Number(aiRisk?.score || 0), 45);
  weatherRisk = clamp(weatherRisk + aiAuxRisk * 0.45, 5, 100);
  timeRisk = clamp(timeRisk + aiAuxRisk * 0.2, 5, 100);
  const mainLabel = labels.length > 0 ? labels.slice(0, 2).join(" · ") : "평상시";
  let tip = "평소처럼 신호와 차량 진입 구간을 확인하세요.";
  if (isRain) tip = "비가 오거나 노면이 젖어 있을 수 있으니 횡단보도 앞에서 한 번 더 멈추세요.";
  if (airInfo.score >= 70) tip = "미세먼지 농도가 높습니다. 마스크를 준비하고 오래 머무르는 구간은 피하세요.";
  if (isNight) tip = "어두운 시간대입니다. 밝은 길과 CCTV가 있는 길을 우선 선택하세요.";
  if (aiRisk?.recommendation) tip = aiRisk.recommendation;
  return { label: mainLabel, weatherRisk, timeRisk, tip, airInfo, weatherText: weatherCodeText(weatherCode), precipitation, wind };
}

function SafetyMap({ routeId, selectedPoint, setSelectedPoint, userReports }) {
  const paths = { safe: "M 12 82 C 24 70, 30 60, 40 58 C 55 56, 58 42, 70 36 C 78 32, 84 25, 90 18", balanced: "M 12 82 C 24 72, 34 67, 44 56 C 54 45, 66 42, 90 18", fast: "M 12 82 C 34 70, 44 62, 52 48 C 62 34, 76 26, 90 18" };
  const reportPoints = userReports.map((report, index) => ({ id: `report-${report.id}`, x: 30 + ((index * 17) % 48), y: 24 + ((index * 23) % 52), level: "high", label: report.type, detail: report.memo || "사용자가 등록한 위험 제보입니다.", source: "사용자 제보" }));
  const points = [...baseRiskPoints, ...reportPoints];
  const selected = points.find((item) => item.id === selectedPoint) || points[0];
  return <div style={{ position: "relative", height: 430, borderRadius: 24, overflow: "hidden", background: "#f1f5f9", border: "1px solid #e2e8f0" }}><svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 100 100" preserveAspectRatio="none"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(100,116,139,0.24)" strokeWidth="0.4" /></pattern></defs><rect width="100" height="100" fill="url(#grid)" /><path d="M 0 25 H 100 M 0 50 H 100 M 0 75 H 100 M 25 0 V 100 M 50 0 V 100 M 75 0 V 100" stroke="rgba(148,163,184,0.35)" strokeWidth="2" /><path d={paths[routeId]} fill="none" stroke="#0ea5e9" strokeWidth="3.6" strokeLinecap="round" /><path d={paths[routeId]} fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="3 3" /></svg><div style={{ position: "absolute", left: "8%", top: "76%", background: "white", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 950, boxShadow: "0 8px 18px rgba(15,23,42,0.12)" }}>👥 출발지</div><div style={{ position: "absolute", right: "7%", top: "11%", background: "white", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 950, boxShadow: "0 8px 18px rgba(15,23,42,0.12)" }}>🏫 학교</div>{points.map((point) => { const color = point.level === "high" ? "#f43f5e" : point.level === "medium" ? "#f59e0b" : "#34d399"; return <button key={point.id} onClick={() => setSelectedPoint(point.id)} title={point.label} style={{ position: "absolute", left: `${point.x}%`, top: `${point.y}%`, transform: "translate(-50%, -50%)", width: selectedPoint === point.id ? 23 : 16, height: selectedPoint === point.id ? 23 : 16, borderRadius: 999, border: "4px solid white", background: color, boxShadow: "0 8px 20px rgba(15,23,42,0.25)", cursor: "pointer" }} />; })}<div style={{ position: "absolute", left: 16, bottom: 16, background: "rgba(255,255,255,0.95)", borderRadius: 20, padding: 16, boxShadow: "0 10px 25px rgba(15,23,42,0.12)" }}><div style={{ fontWeight: 950 }}>위험도 지도</div><div style={{ marginTop: 10, fontSize: 12, color: "#475569", lineHeight: 1.9 }}>🔴 고위험<br />🟡 주의<br />🟢 안전 요소</div></div>{selected && <div style={{ position: "absolute", top: 16, right: 16, width: 285, background: "rgba(255,255,255,0.96)", borderRadius: 22, padding: 18, boxShadow: "0 15px 30px rgba(15,23,42,0.16)" }}><Badge tone={selected.level === "high" ? "red" : selected.level === "medium" ? "yellow" : "green"}>{selected.level === "high" ? "고위험" : selected.level === "medium" ? "주의" : "안전 요소"}</Badge><h3 style={{ margin: "12px 0 6px", fontSize: 18 }}>{selected.label}</h3><p style={{ margin: 0, color: "#64748b", fontSize: 14, lineHeight: 1.7 }}>{selected.detail}</p><p style={{ margin: "12px 0 0", color: "#94a3b8", fontSize: 12, fontWeight: 900 }}>출처: {selected.source}</p></div>}</div>;
}

function loadLeafletAssets() {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }

    const existingCss = document.querySelector('link[data-leaflet="true"]');
    if (!existingCss) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.dataset.leaflet = "true";
      document.head.appendChild(link);
    }

    const existingScript = document.querySelector('script[data-leaflet="true"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.L));
      existingScript.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.dataset.leaflet = "true";
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function markerIconHtml(label, color, emoji) {
  return `<div style="display:grid;place-items:center;width:34px;height:34px;border-radius:18px;background:${color};color:white;border:3px solid white;box-shadow:0 8px 18px rgba(15,23,42,.25);font-size:16px;font-weight:900;">${emoji || label}</div>`;
}

function RealSchoolMap({ school, origin, route, routeGeometry = [], routeSource = "", selectedProtectionAnalysis, userReports = [], mapVersion, mapStatus, mapReady, setMapReady, analysisRadius }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef([]);
  const [leafletStatus, setLeafletStatus] = useState("지도 준비 중...");

  useEffect(() => {
    let cancelled = false;
    let resizeTimer = null;

    async function renderLeafletMap() {
      if (!mapEl.current || !school?.lat || !school?.lon) return;
      setMapReady(false);
      setLeafletStatus("Leaflet 지도 불러오는 중...");

      try {
        const L = await loadLeafletAssets();
        if (cancelled || !mapEl.current) return;

        if (!mapRef.current) {
          mapRef.current = L.map(mapEl.current, {
            zoomControl: true,
            scrollWheelZoom: true,
            attributionControl: true,
          });
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors",
          }).addTo(mapRef.current);
        }

        const map = mapRef.current;
        layersRef.current.forEach((layer) => layer.remove());
        layersRef.current = [];

        const schoolLatLng = [school.lat, school.lon];
        const bounds = L.latLngBounds([schoolLatLng]);

        const schoolIcon = L.divIcon({
          className: "safe-route-marker",
          html: markerIconHtml("S", "#0284c7", "🏫"),
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        const schoolMarker = L.marker(schoolLatLng, { icon: schoolIcon }).bindPopup(`<b>${school.name}</b><br/>선택 학교`);
        schoolMarker.addTo(map);
        layersRef.current.push(schoolMarker);

        if (origin?.lat && origin?.lon) {
          const originLatLng = [origin.lat, origin.lon];
          bounds.extend(originLatLng);
          const originIcon = L.divIcon({
            className: "safe-route-marker",
            html: markerIconHtml("H", "#10b981", "🏠"),
            iconSize: [34, 34],
            iconAnchor: [17, 17],
          });
          const originMarker = L.marker(originLatLng, { icon: originIcon }).bindPopup(`<b>${origin.label || "출발지"}</b><br/>출발 위치`);
          originMarker.addTo(map);
          layersRef.current.push(originMarker);
        }

        const radius = L.circle(schoolLatLng, {
          radius: Number(analysisRadius || 500),
          color: "#0284c7",
          weight: 2,
          opacity: 0.75,
          fillColor: "#38bdf8",
          fillOpacity: 0.08,
        }).bindPopup(`학교 주변 분석 반경 ${analysisRadius}m`);
        radius.addTo(map);
        layersRef.current.push(radius);

        if (Array.isArray(routeGeometry) && routeGeometry.length > 1) {
          const linePoints = routeGeometry
            .filter((point) => Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lon)))
            .map((point) => [Number(point.lat), Number(point.lon)]);
          if (linePoints.length > 1) {
            linePoints.forEach((point) => bounds.extend(point));
            const routeLine = L.polyline(linePoints, {
              color: "#2563eb",
              weight: 6,
              opacity: 0.84,
              lineCap: "round",
              lineJoin: "round",
            }).bindPopup("실제 도보 경로");
            routeLine.addTo(map);
            layersRef.current.push(routeLine);
          }
        }

        (selectedProtectionAnalysis?.nearby || []).filter((zone) => zone.lat && zone.lon).slice(0, 20).forEach((zone) => {
          const latLng = [Number(zone.lat), Number(zone.lon)];
          bounds.extend(latLng);
          const icon = L.divIcon({
            className: "safe-route-marker",
            html: markerIconHtml("Z", "#16a34a", "🛡️"),
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });
          const marker = L.marker(latLng, { icon }).bindPopup(`<b>${zone.facilityName || "보호구역"}</b><br/>CCTV ${zone.cctvCount || 0}대${zone.roadWidth ? `<br/>도로폭 ${zone.roadWidth}m` : ""}`);
          marker.addTo(map);
          layersRef.current.push(marker);
        });

        (userReports || []).filter((report) => report.lat && report.lon).slice(0, 30).forEach((report) => {
          const latLng = [Number(report.lat), Number(report.lon)];
          bounds.extend(latLng);
          const icon = L.divIcon({
            className: "safe-route-marker",
            html: markerIconHtml("R", "#e11d48", "⚠️"),
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });
          const marker = L.marker(latLng, { icon }).bindPopup(`<b>${report.type || "위험 제보"}</b><br/>${report.memo || "상세 설명 없음"}`);
          marker.addTo(map);
          layersRef.current.push(marker);
        });

        map.fitBounds(bounds.pad(0.22), { maxZoom: origin ? 16 : 17, animate: false });
        resizeTimer = window.setTimeout(() => map.invalidateSize(), 120);
        setLeafletStatus("실제 좌표 기반 지도 표시 중");
        setMapReady(true);
      } catch (error) {
        console.warn("Leaflet map failed:", error);
        setLeafletStatus("지도를 불러오지 못했습니다. 네트워크 상태를 확인해 주세요.");
        setMapReady(false);
      }
    }

    renderLeafletMap();
    return () => {
      cancelled = true;
      if (resizeTimer) window.clearTimeout(resizeTimer);
    };
  }, [school, origin, routeGeometry, routeSource, selectedProtectionAnalysis, userReports, analysisRadius, mapVersion, setMapReady]);

  const openUrl = origin?.lat && origin?.lon
    ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${origin.lat},${origin.lon};${school.lat},${school.lon}`
    : `https://www.openstreetmap.org/?mlat=${school.lat}&mlon=${school.lon}#map=16/${school.lat}/${school.lon}`;

  return <Card style={{ padding: 0, overflow: "hidden" }}><div style={{ padding: 18, borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}><div><h2 style={{ margin: 0 }}>실제 통학 지도</h2><p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.7 }}>학교, 출발지, 선택 경로, 보호구역, 위험 제보를 실제 좌표 기반으로 표시합니다.</p></div><a href={openUrl} target="_blank" rel="noreferrer" style={{ ...styles.button, background: "#0f172a", color: "white", textDecoration: "none" }}>OpenStreetMap 열기</a></div><div style={{ position: "relative", height: 460, background: "#e2e8f0" }}><div ref={mapEl} style={{ position: "absolute", inset: 0 }} />{!mapReady ? <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(248,250,252,0.75)", zIndex: 4 }}><div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 18, padding: "12px 16px", color: "#475569", fontWeight: 900 }}>{leafletStatus}</div></div> : null}<div style={{ position: "absolute", left: 16, bottom: 16, zIndex: 5, background: "rgba(255,255,255,0.94)", border: "1px solid #e2e8f0", borderRadius: 16, padding: "10px 12px", fontSize: 12, fontWeight: 900, color: "#0369a1" }}>🏫 학교 · 🏠 출발지 · 🛡️ 보호구역 · ⚠️ 위험 제보 · 파란선 경로</div></div><div style={{ padding: 14, color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>{mapStatus || leafletStatus}</div></Card>;
}

function RadiusAnalysis({ school, origin, route, routeMetricsOverride, analysisRadius, score, situation, publicSafetyAnalysis }) {
  const metrics = routeMetricsOverride || routeMetrics(origin, school, route);
  const estimatedRiskSpots = Math.max(0, Math.round(publicSafetyAnalysis?.warningPointCount || 0));
  const estimatedSafeAssets = Math.max(0, Math.round(publicSafetyAnalysis?.safeInfraCount || 0));
  const summaryTone = score >= 75 ? "green" : score >= 55 ? "yellow" : "red";
  return <Card><div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}><div><h2 style={{ margin: 0 }}>{origin ? "출발지 기반 등굣길 분석" : `학교 주변 ${analysisRadius}m 반경 분석`}</h2><p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.7, fontSize: 14 }}>{origin ? "집 또는 현재 위치에서 학교까지의 거리와 예상 이동 시간을 반영합니다." : "출발지를 설정하면 실제 등굣길 거리와 예상 시간을 함께 계산합니다."}</p></div><Badge tone={summaryTone}>{score >= 75 ? "안전권" : score >= 55 ? "주의권" : "위험권"}</Badge></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 16 }}><div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14 }}><div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>예상 거리</div><div style={{ marginTop: 6, fontSize: 28, fontWeight: 950 }}>{metrics ? `${metrics.routeKm.toFixed(2)}km` : "미설정"}</div></div><div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 16, padding: 14 }}><div style={{ color: "#0369a1", fontSize: 12, fontWeight: 900 }}>예상 시간</div><div style={{ marginTop: 6, fontSize: 28, fontWeight: 950 }}>{metrics ? `${metrics.minutes}분` : "-"}</div></div><div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 16, padding: 14 }}><div style={{ color: "#9a3412", fontSize: 12, fontWeight: 900 }}>주의 지점</div><div style={{ marginTop: 6, fontSize: 28, fontWeight: 950 }}>{estimatedRiskSpots}곳</div></div><div style={{ background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: 16, padding: 14 }}><div style={{ color: "#166534", fontSize: 12, fontWeight: 900 }}>안전 인프라</div><div style={{ marginTop: 6, fontSize: 28, fontWeight: 950 }}>{estimatedSafeAssets}개</div></div></div></Card>;
}

function inferProtectionZoneRegion(zones) {
  const items = Array.isArray(zones) ? zones : [];
  if (!items.length) return { region: "미확인", count: 0, confidence: 0 };
  const candidates = [
    ["서울", "서울특별시"], ["부산", "부산광역시"], ["대구", "대구광역시"], ["인천", "인천광역시"],
    ["광주", "광주광역시"], ["대전", "대전광역시"], ["울산", "울산광역시"], ["세종", "세종특별자치시"],
    ["경기", "경기도"], ["강원", "강원특별자치도"], ["충북", "충청북도"], ["충청북도", "충청북도"],
    ["충남", "충청남도"], ["충청남도", "충청남도"], ["전북", "전북특별자치도"], ["전라북도", "전북특별자치도"],
    ["전남", "전라남도"], ["전라남도", "전라남도"], ["경북", "경상북도"], ["경상북도", "경상북도"],
    ["경남", "경상남도"], ["경상남도", "경상남도"], ["제주", "제주특별자치도"]
  ];
  const counts = new Map();
  items.forEach((zone) => {
    const text = `${zone.roadAddress || ""} ${zone.lotAddress || ""} ${zone.agency || ""}`;
    candidates.forEach(([key, label]) => {
      if (text.includes(key)) counts.set(label, (counts.get(label) || 0) + 1);
    });
  });
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return { region: "미확인", count: items.length, confidence: 0 };
  return { region: sorted[0][0], count: items.length, confidence: Math.round((sorted[0][1] / items.length) * 100) };
}

function officeMatchesZoneRegion(officeName, zoneRegion) {
  if (!zoneRegion || zoneRegion === "미확인") return true;
  const office = String(officeName || "");
  const normalizedRegion = String(zoneRegion).replace("특별자치시", "").replace("특별자치도", "").replace("특별시", "").replace("광역시", "").replace("도", "");
  return office.includes(normalizedRegion) || zoneRegion.includes(office.replace("교육청", ""));
}

function DemoReadinessCard({ selectedOffice, protectionZoneRegion, protectionZones, selectedProtectionAnalysis, aiRisk, origin, weatherData, airData }) {
  const hasProtectionData = Array.isArray(protectionZones) && protectionZones.length > 0;
  const regionMatches = officeMatchesZoneRegion(selectedOffice?.name, protectionZoneRegion?.region);
  const readyItems = [
    { label: "시연 지역", ok: !hasProtectionData || regionMatches, detail: hasProtectionData ? `보호구역 자료 추정 지역: ${protectionZoneRegion.region} (${protectionZoneRegion.count.toLocaleString("ko-KR")}건)` : "보호구역 CSV 미연결" },
    { label: "출발지", ok: Boolean(origin), detail: origin ? "출발지 기반 거리·시간 계산 가능" : "설정 탭에서 출발지 설정 필요" },
    { label: "실시간 환경", ok: Boolean(weatherData?.current && airData?.current), detail: weatherData?.current && airData?.current ? "날씨·미세먼지 조회 완료" : "날씨·AI 분석 실행 필요" },
    { label: "AI 결과", ok: Boolean(aiRisk), detail: aiRisk ? `${aiRisk.source?.startsWith("server-gemini") ? "Gemini" : "보조"} 분석 결과 있음` : "아직 분석 전" },
  ];
  return <Card><h2 style={{ marginTop: 0 }}>시연 안정성 체크</h2><p style={{ color: "#64748b", lineHeight: 1.7, marginTop: -4 }}>현재 시연 조건이 데이터 범위와 맞는지 확인합니다.</p><div style={{ display: "grid", gap: 10 }}>{readyItems.map((item) => <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: item.ok ? "#f0fdf4" : "#fff7ed", border: `1px solid ${item.ok ? "#bbf7d0" : "#fed7aa"}`, borderRadius: 16, padding: 14 }}><div><b>{item.label}</b><p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 13 }}>{item.detail}</p></div><Badge tone={item.ok ? "green" : "yellow"}>{item.ok ? "정상" : "주의"}</Badge></div>)}</div>{hasProtectionData && !regionMatches ? <div style={{ marginTop: 12, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 16, padding: 14, color: "#9a3412", lineHeight: 1.7, fontWeight: 800 }}>현재 선택 지역은 {selectedOffice?.name}이고, 업로드된 보호구역 자료는 {protectionZoneRegion.region} 자료로 추정됩니다. 보호구역 분석을 정확히 보려면 {protectionZoneRegion.region} 관할 학교를 선택해 주세요.</div> : null}{hasProtectionData && regionMatches && selectedProtectionAnalysis?.count === 0 ? <div style={{ marginTop: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, color: "#475569", lineHeight: 1.7 }}>자료 지역은 맞지만 현재 분석 반경 안에 매칭된 보호구역이 없습니다. 1km 반경으로 넓혀 확인해 보세요.</div> : null}</Card>;
}

function ProtectionZoneCard({ analysis, status }) {
  const items = analysis?.nearby || [];
  return <Card><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}><div><h2 style={{ margin: 0 }}>어린이보호구역 CSV 데이터</h2><p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.7, fontSize: 14 }}>업로드된 CSV에서 선택 학교 주변 반경 안의 보호구역, CCTV, 도로폭을 계산해 안전 점수에 반영합니다.</p></div><Badge tone={analysis?.count ? "green" : "gray"}>{analysis?.count || 0}곳</Badge></div>{status ? <p style={{ color: "#64748b", fontSize: 13 }}>{status}</p> : null}<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 14 }}><div style={{ background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: 16, padding: 14 }}><div style={{ color: "#166534", fontSize: 12, fontWeight: 900 }}>보호구역 수</div><div style={{ marginTop: 6, fontSize: 28, fontWeight: 950 }}>{analysis?.count || 0}</div></div><div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 16, padding: 14 }}><div style={{ color: "#0369a1", fontSize: 12, fontWeight: 900 }}>CCTV 총수</div><div style={{ marginTop: 6, fontSize: 28, fontWeight: 950 }}>{analysis?.cctvTotal || 0}</div></div><div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 16, padding: 14 }}><div style={{ color: "#9a3412", fontSize: 12, fontWeight: 900 }}>좁은 도로</div><div style={{ marginTop: 6, fontSize: 28, fontWeight: 950 }}>{analysis?.narrowRoadCount || 0}</div></div><div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14 }}><div style={{ color: "#475569", fontSize: 12, fontWeight: 900 }}>인프라 점수</div><div style={{ marginTop: 6, fontSize: 28, fontWeight: 950 }}>{Math.round(analysis?.infrastructureScore || 0)}</div></div></div>{items.length === 0 ? <p style={{ color: "#64748b", lineHeight: 1.7 }}>아직 반경 안에 매칭된 보호구역이 없습니다. 설정에서 어린이보호구역 CSV를 업로드하거나 분석 반경을 넓혀 보세요.</p> : <div style={{ display: "grid", gap: 10, marginTop: 14 }}>{items.map((zone) => <div key={zone.id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><b>{zone.facilityName}</b><span style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>{Math.round(zone.distanceKm * 1000)}m</span></div><p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>{zone.facilityType} · CCTV {zone.cctvCount || 0}대{zone.roadWidth ? ` · 도로폭 ${zone.roadWidth}m` : ""}</p></div>)}</div>}</Card>;
}

function formatScheduleDate(yyyymmdd) {
  const text = String(yyyymmdd || "");
  if (text.length !== 8) return text || "날짜 미상";
  return `${text.slice(4, 6)}/${text.slice(6, 8)}`;
}

function gradeText(item) {
  const grades = [];
  if (item.grade1 === "Y") grades.push("1학년");
  if (item.grade2 === "Y") grades.push("2학년");
  if (item.grade3 === "Y") grades.push("3학년");
  if (item.grade4 === "Y") grades.push("4학년");
  if (item.grade5 === "Y") grades.push("5학년");
  if (item.grade6 === "Y") grades.push("6학년");
  return grades.length ? grades.join(", ") : "대상 학년 미표시";
}

function AcademicScheduleCard({ schedule }) {
  const items = schedule?.items || [];
  return <Card><h2 style={{ marginTop: 0 }}>이번 주 학사일정</h2>{!schedule?.configured ? <p style={{ color: "#64748b", lineHeight: 1.7 }}>NEIS 학사일정 API가 아직 연결되지 않았습니다.</p> : items.length === 0 ? <p style={{ color: "#64748b", lineHeight: 1.7 }}>이번 주 등록된 주요 학사일정이 없습니다.</p> : <div style={{ display: "grid", gap: 10 }}>{items.slice(0, 8).map((item, index) => <div key={`${item.date}-${item.eventName}-${index}`} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><b>{formatScheduleDate(item.date)} · {item.eventName}</b><Badge tone={item.eventName.includes("휴업") || item.eventName.includes("방학") ? "gray" : item.eventName.includes("체험") || item.eventName.includes("수련") || item.eventName.includes("행사") ? "yellow" : "blue"}>{gradeText(item)}</Badge></div>{item.eventContent ? <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 13 }}>{item.eventContent}</p> : null}</div>)}</div>}{schedule?.method ? <p style={{ margin: "12px 0 0", color: "#94a3b8", fontSize: 12 }}>조회 방식: {schedule.method}</p> : null}</Card>;
}

function NaverNewsTitlesCard({ newsItems }) {
  const items = Array.isArray(newsItems) ? newsItems : [];
  return <Card><h2 style={{ marginTop: 0 }}>AI가 참고한 지역 뉴스 제목</h2>{items.length === 0 ? <p style={{ color: "#64748b", lineHeight: 1.7 }}>아직 참고한 뉴스 제목이 없습니다. Naver 뉴스 API 키가 없거나 관련 기사가 없으면 날씨·미세먼지·학사일정 중심으로 분석합니다.</p> : <div style={{ display: "grid", gap: 10 }}>{items.slice(0, 6).map((item, index) => <a key={`${item.title}-${index}`} href={item.link || "#"} target="_blank" rel="noreferrer" style={{ display: "block", textDecoration: "none", color: "inherit", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14 }}><b>{item.title}</b><div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>{item.query || "Naver 뉴스 검색"}</div>{item.description ? <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 13, lineHeight: 1.55 }}>{item.description}</p> : null}</a>)}</div>}</Card>;
}

function ServiceBrandCard() {
  return <Card style={{ background: "linear-gradient(135deg, #0f172a, #075985)", color: "white" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}><div><div style={{ color: "#7dd3fc", fontWeight: 950, fontSize: 13 }}>SERVICE IDENTITY</div><h2 style={{ margin: "8px 0 10px", fontSize: 30 }}>길누리</h2><p style={{ margin: 0, color: "#dbeafe", lineHeight: 1.75, maxWidth: 720 }}>학생의 집과 학교 사이를 공공데이터와 AI로 분석해, 오늘의 등굣길 위험도와 안전 행동을 차분하게 안내하는 통학 안전 서비스입니다.</p></div><div style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 22, padding: 16, minWidth: 220 }}><div style={{ color: "#bae6fd", fontSize: 12, fontWeight: 950 }}>핵심 가치</div><div style={{ marginTop: 8, display: "grid", gap: 8, color: "#f8fafc", fontWeight: 850 }}><span>데이터 기반 판단</span><span>학생 눈높이 권고</span><span>근거가 보이는 AI</span></div></div></div><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}><Badge tone="dark">학교·학구도</Badge><Badge tone="dark">보호구역</Badge><Badge tone="dark">날씨·미세먼지</Badge><Badge tone="dark">학사일정</Badge><Badge tone="dark">뉴스</Badge><Badge tone="dark">AI 분석</Badge></div></Card>;
}

function DataSourceStatusCard({ schoolDataStatus, protectionZoneStatus, publicSafetyDataStatus, publicSafetyAnalysis, aiRisk, weatherData, airData, origin, protectionZones }) {
  const aiLabel = aiRisk?.source?.startsWith("server-gemini") ? "Gemini 분석" : aiRisk?.source?.includes("server-fallback") ? "서버 보조 분석" : aiRisk ? "브라우저 보조 분석" : "분석 전";
  const rows = [
    { name: "학교·학구도 CSV", ok: Boolean(schoolDataStatus && !schoolDataStatus.includes("기본 샘플")), detail: schoolDataStatus || "기본 데이터 사용 중" },
    { name: "어린이보호구역 CSV", ok: Boolean(protectionZones?.length), detail: protectionZoneStatus || "미연결" },
    { name: "보행·조명·사고 CSV", ok: Number(publicSafetyAnalysis?.dataCoverageCount || 0) > 0, detail: publicSafetyDataStatus || "미연결" },
    { name: "실시간 날씨", ok: Boolean(weatherData?.current), detail: weatherData?.current ? "학교 좌표 기준 조회 완료" : "날씨·AI 분석 실행 전" },
    { name: "실시간 미세먼지", ok: Boolean(airData?.current), detail: airData?.current ? "학교 좌표 기준 조회 완료" : "날씨·AI 분석 실행 전" },
    { name: "출발지", ok: Boolean(origin), detail: origin ? `${origin.label} (${origin.lat.toFixed(5)}, ${origin.lon.toFixed(5)})` : "미설정" },
    { name: "AI 분석", ok: Boolean(aiRisk), detail: aiLabel },
  ];

  return <Card><h2 style={{ marginTop: 0 }}>데이터 연결 상태</h2><p style={{ color: "#64748b", lineHeight: 1.7, marginTop: -4 }}>현재 분석에 실제로 반영된 데이터와 대체 분석 여부를 한눈에 확인합니다.</p><div style={{ display: "grid", gap: 10 }}>{rows.map((row) => <div key={row.name} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14 }}><div><b>{row.name}</b><p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>{row.detail}</p></div><Badge tone={row.ok ? "green" : "yellow"}>{row.ok ? "연결됨" : "확인 필요"}</Badge></div>)}</div></Card>;
}

function TodayInsightCard({ score, currentTone, situation, aiRisk, selectedRouteMetrics, selectedProtectionAnalysis, mascotKey = "safe" }) {
  const sourceLabel = aiRisk?.source?.startsWith("server-gemini") ? "Gemini AI 분석" : aiRisk?.source?.includes("server-fallback") ? "공공데이터 기반 보조 분석" : aiRisk ? "브라우저 보조 분석" : "분석 전";
  const routeText = selectedRouteMetrics ? `예상 ${selectedRouteMetrics.routeKm.toFixed(2)}km · 약 ${selectedRouteMetrics.minutes}분` : "출발지 미설정";
  const protectionText = selectedProtectionAnalysis?.count ? `보호구역 ${selectedProtectionAnalysis.count}곳·CCTV ${selectedProtectionAnalysis.cctvTotal}대 반영` : "보호구역 반경 매칭 없음";
  const sentence = aiRisk?.recommendation || situation.tip || "날씨·AI 분석을 실행하면 오늘의 등굣길 판단이 표시됩니다.";
  const toneBg = score >= 75 ? "#ecfdf5" : score >= 55 ? "#fffbeb" : "#fff1f2";
  const toneBorder = score >= 75 ? "#bbf7d0" : score >= 55 ? "#fde68a" : "#fecdd3";
  const toneFg = score >= 75 ? "#166534" : score >= 55 ? "#92400e" : "#be123c";
  return <Card className="today-insight-card" style={{ background: toneBg, borderColor: toneBorder }}><div className="today-insight-layout" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}><div><div style={{ color: toneFg, fontSize: 13, fontWeight: 950 }}>오늘의 한 줄 판단</div><h2 className="today-insight-title" style={{ margin: "8px 0 10px", fontSize: 28, lineHeight: 1.25 }}>오늘은 <span style={{ color: toneFg }}>{currentTone.label}</span> 단계입니다.</h2><p style={{ margin: 0, color: "#334155", lineHeight: 1.75, fontWeight: 800 }}>{sentence}</p></div><div className="today-insight-visual" style={{ minWidth: 150, display: "grid", placeItems: "center", gap: 8 }}><MascotImage variant={mascotKey} size={190} /><div style={{ minWidth: 92, height: 70, borderRadius: 24, background: "rgba(255,255,255,0.78)", display: "grid", placeItems: "center", border: `1px solid ${toneBorder}` }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 30, fontWeight: 950, color: toneFg }}>{score}</div><div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>/100</div></div></div></div></div><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}><Badge tone={score >= 75 ? "green" : score >= 55 ? "yellow" : "red"}>{currentTone.label}</Badge><Badge tone="blue">{situation.label}</Badge><Badge tone="gray">{routeText}</Badge><Badge tone="gray">{protectionText}</Badge><Badge tone={aiRisk?.source?.startsWith("server-gemini") ? "green" : "yellow"}>{sourceLabel}</Badge></div>{aiRisk?.backendWarning ? <p style={{ margin: "14px 0 0", color: "#92400e", background: "rgba(255,255,255,0.62)", border: "1px solid #fde68a", borderRadius: 14, padding: 12, fontSize: 13, lineHeight: 1.6, fontWeight: 800 }}>AI 서버가 혼잡하여 공공데이터 기반 보조 분석을 사용했습니다. 서비스는 계속 정상 작동합니다.</p> : null}</Card>;
}

function DataSourceReferencesCard() {
  const sources = [
    { name: "학교·학구도 데이터", desc: "학교 위치, 학교급, 교육청, 위도·경도 기반 학교 선택과 통학권 분석" },
    { name: "어린이보호구역 CSV", desc: "직접 내려받은 보호구역 위치, CCTV 설치 수, 도로폭 기반 학교 주변 안전 인프라 분석" },
    { name: "옐로카펫·사고다발지역·단속카메라 CSV", desc: "횡단 안전시설, 사고다발지역, 제한속도·무인단속카메라를 학교 주변 반경으로 필터링" },
    { name: "보안등·스마트가로등 CSV", desc: "야간 조명, CCTV 포함 스마트가로등, 위급상황신고 가능 시설을 조명 안전성에 반영" },
    { name: "보행자우선도로 CSV", desc: "도로폭, 제한속도, 속도저감시설, 보행안전시설, 보행자 사고 건수를 보행 환경 점수에 반영" },
    { name: "Open-Meteo Forecast API", desc: "학교 좌표 기준 실시간 기온, 강수, 풍속, 날씨 코드 조회" },
    { name: "Open-Meteo Air Quality API", desc: "학교 좌표 기준 PM2.5, PM10 등 대기질 정보 조회" },
    { name: "NEIS 학사일정", desc: "시험, 체험활동, 수련활동, 휴업일 등 이동 패턴 변화 요인 반영" },
    { name: "Naver 뉴스 검색 API", desc: "최근 7일 지역 날씨·교통·보행 안전 관련 뉴스 제목 수집" },
    { name: "Gemini AI 분석", desc: "수집된 데이터를 종합해 위험 점수, 위험 신호, 학생용 권고문 생성" }
  ];
  return <CollapsibleSection title="사용 데이터 출처" defaultOpen={false}><p style={{ color: "#64748b", lineHeight: 1.7, marginTop: 0 }}>서비스가 안전 점수와 권고문을 만들 때 사용하는 데이터 종류입니다.</p><div style={{ display: "grid", gap: 10 }}>{sources.map((source) => <details key={source.name} className="source-details"><summary>{source.name}</summary><div><p style={{ margin: 0, color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>{source.desc}</p></div></details>)}</div></CollapsibleSection>;
}

function routeDistanceFromPoints(points) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += distanceKm(points[i - 1], points[i]);
  return total;
}

function routeWalkingMinutes(km) {
  return Math.max(1, Math.round((Number(km || 0) / 4.2) * 60));
}

function midpointPoint(a, b) {
  return { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
}

function offsetPointFromLine(a, b, strength = 0.002, direction = 1) {
  const mid = midpointPoint(a, b);
  const dx = b.lon - a.lon;
  const dy = b.lat - a.lat;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  return { lat: mid.lat + direction * (dx / length) * strength, lon: mid.lon - direction * (dy / length) * strength };
}

function pointLineDistanceKm(point, a, b) {
  const x0 = point.lon;
  const y0 = point.lat;
  const x1 = a.lon;
  const y1 = a.lat;
  const x2 = b.lon;
  const y2 = b.lat;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return distanceKm(point, a);
  const t = Math.max(0, Math.min(1, ((x0 - x1) * dx + (y0 - y1) * dy) / lengthSquared));
  const projection = { lat: y1 + t * dy, lon: x1 + t * dx };
  return distanceKm(point, projection);
}

function signedLineSide(point, a, b) {
  return Math.sign((b.lon - a.lon) * (point.lat - a.lat) - (b.lat - a.lat) * (point.lon - a.lon)) || 1;
}

function routeCorridorKm(baseKm, mode = "normal") {
  const base = mode === "strict" ? baseKm * 0.08 : baseKm * 0.12;
  return clamp(base, 0.06, mode === "strict" ? 0.16 : 0.24);
}

function projectedRatioOnLine(point, a, b) {
  const x0 = point.lon;
  const y0 = point.lat;
  const x1 = a.lon;
  const y1 = a.lat;
  const x2 = b.lon;
  const y2 = b.lat;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return 0;
  return clamp(((x0 - x1) * dx + (y0 - y1) * dy) / lengthSquared, 0, 1);
}

function pointAtRouteRatio(a, b, ratio) {
  return { lat: a.lat + (b.lat - a.lat) * ratio, lon: a.lon + (b.lon - a.lon) * ratio };
}

function offsetAtRouteRatio(a, b, ratio, offsetKm, direction = 1) {
  const base = pointAtRouteRatio(a, b, ratio);
  const dx = b.lon - a.lon;
  const dy = b.lat - a.lat;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const latKm = 1 / 111;
  const lonKm = 1 / (111 * Math.cos((base.lat * Math.PI) / 180) || 1);
  return {
    lat: base.lat + direction * (dx / length) * offsetKm * latKm,
    lon: base.lon - direction * (dy / length) * offsetKm * lonKm,
  };
}

function pointSegmentDistanceKm(point, a, b) {
  const x0 = Number(point.lon);
  const y0 = Number(point.lat);
  const x1 = Number(a.lon);
  const y1 = Number(a.lat);
  const x2 = Number(b.lon);
  const y2 = Number(b.lat);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return distanceKm(point, a);
  const t = clamp(((x0 - x1) * dx + (y0 - y1) * dy) / lengthSquared, 0, 1);
  const projection = { lat: y1 + t * dy, lon: x1 + t * dx };
  return distanceKm(point, projection);
}

function pointGeometryDistanceKm(point, geometry) {
  const points = Array.isArray(geometry) ? geometry.map(normalizeRoutePoint).filter(Boolean) : [];
  if (points.length < 2) return 999;
  let best = 999;
  for (let i = 1; i < points.length; i += 1) {
    best = Math.min(best, pointSegmentDistanceKm(point, points[i - 1], points[i]));
  }
  return best;
}

function reportTypeWeight(type) {
  if (type === "신호등 고장") return 18;
  if (type === "불법 주정차") return 15;
  if (type === "시야 방해") return 14;
  if (type === "공사/장애물") return 13;
  if (type === "보도 파손") return 11;
  return 8;
}

function routeReportProximityPenalty(geometry, selectedReportAnalysis) {
  const reports = (selectedReportAnalysis?.nearby || []).filter((report) => report.lat && report.lon);
  if (!reports.length) return { penalty: 0, closeReports: [] };
  let penalty = 0;
  const closeReports = [];
  reports.forEach((report) => {
    const distanceM = pointGeometryDistanceKm(report, geometry) * 1000;
    const weight = reportTypeWeight(report.type);
    if (distanceM <= 45) {
      penalty += weight;
      closeReports.push({ ...report, routeDistanceM: Math.round(distanceM) });
    } else if (distanceM <= 90) {
      penalty += weight * 0.55;
      closeReports.push({ ...report, routeDistanceM: Math.round(distanceM) });
    } else if (distanceM <= 140) {
      penalty += weight * 0.25;
    }
  });
  return { penalty: clamp(penalty, 0, 40), closeReports: closeReports.slice(0, 3) };
}

function candidateWaypoints(origin, school, selectedProtectionAnalysis, selectedReportAnalysis) {
  const baseKm = distanceKm(origin, school);
  const strictCorridor = routeCorridorKm(baseKm, "strict");
  const normalCorridor = routeCorridorKm(baseKm, "normal");

  const directZones = (selectedProtectionAnalysis?.nearby || [])
    .filter((zone) => zone.lat && zone.lon)
    .map((zone) => ({
      ...zone,
      lineDistanceKm: pointLineDistanceKm(zone, origin, school),
      routeRatio: projectedRatioOnLine(zone, origin, school),
    }))
    .filter((zone) => zone.routeRatio >= 0.08 && zone.routeRatio <= 0.92)
    .filter((zone) => zone.lineDistanceKm <= strictCorridor)
    .sort((a, b) => (b.cctvCount || 0) - (a.cctvCount || 0) || a.lineDistanceKm - b.lineDistanceKm)
    .slice(0, 2);

  const hazardReports = (selectedReportAnalysis?.nearby || [])
    .filter((report) => report.lat && report.lon)
    .map((report) => ({
      ...report,
      lineDistanceKm: pointLineDistanceKm(report, origin, school),
      routeRatio: projectedRatioOnLine(report, origin, school),
      side: signedLineSide(report, origin, school),
    }))
    .filter((report) => report.routeRatio >= 0.05 && report.routeRatio <= 0.95)
    .filter((report) => report.lineDistanceKm <= normalCorridor)
    .sort((a, b) => a.lineDistanceKm - b.lineDistanceKm)
    .slice(0, 2);

  const hazardAvoidPoints = hazardReports.flatMap((report) => {
    const avoidDirection = -report.side;
    const offsetKm = clamp(normalCorridor * 2.4, 0.18, 0.42);
    const before = clamp(report.routeRatio - 0.08, 0.06, 0.9);
    const after = clamp(report.routeRatio + 0.08, 0.1, 0.94);
    return [
      offsetAtRouteRatio(origin, school, before, offsetKm, avoidDirection),
      offsetAtRouteRatio(origin, school, after, offsetKm, avoidDirection),
    ];
  });

  const balancedWaypoint = directZones[0]
    ? { lat: directZones[0].lat, lon: directZones[0].lon }
    : hazardAvoidPoints[0] || null;

  const safeWaypoints = [
    ...directZones.map((zone) => ({ lat: zone.lat, lon: zone.lon })),
    ...hazardAvoidPoints,
  ]
    .sort((a, b) => projectedRatioOnLine(a, origin, school) - projectedRatioOnLine(b, origin, school))
    .slice(0, 4);

  const safeFallback = hazardReports[0]
    ? offsetAtRouteRatio(origin, school, hazardReports[0].routeRatio, clamp(normalCorridor * 1.25, 0.1, 0.24), -hazardReports[0].side)
    : null;

  return [
    { id: "fast", title: "빠른 경로", waypoints: [origin, school], viaZones: [], avoidedReports: [], mode: "direct-fast" },
    { id: "balanced", title: "균형 경로", waypoints: balancedWaypoint ? [origin, balancedWaypoint, school] : [origin, school], viaZones: directZones.slice(0, 1), avoidedReports: hazardReports.slice(0, 1), mode: directZones[0] ? "near-route-zone" : hazardReports[0] ? "avoid-near-route-report" : "same-as-fast" },
    { id: "safe", title: "안전 우선 경로", waypoints: safeWaypoints.length ? [origin, ...safeWaypoints, school] : safeFallback ? [origin, safeFallback, school] : [origin, school], viaZones: directZones, avoidedReports: hazardReports, mode: safeWaypoints.length ? "near-route-safe" : safeFallback ? "avoid-near-route-report" : "same-as-fast" }
  ];
}

function normalizeRoutePoint(point) {
  const lat = Number(point?.lat);
  const lon = Number(point?.lon ?? point?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < 33 || lat > 39 || lon < 124 || lon > 132) return null;
  return { lat, lon };
}

async function fetchOsrmFootRoute(waypoints) {
  const points = (waypoints || []).map(normalizeRoutePoint).filter(Boolean);
  if (points.length < 2) throw new Error("경로 계산에 필요한 좌표가 부족합니다.");
  const response = await fetch(apiUrl("/api/foot-route"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ points })
  });
  if (!response.ok) throw new Error(`foot-route api ${response.status}`);
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || "foot route failed");
  return {
    distanceKm: Number(data.distanceKm || 0),
    minutes: Math.max(1, Math.round(Number(data.durationMinutes || 0))),
    geometry: Array.isArray(data.geometry) && data.geometry.length ? data.geometry : waypoints,
    source: data.source || "server-foot-route"
  };
}

function chooseRecommendedRoute(routes, fallbackId = "safe") {
  const items = Array.isArray(routes) ? routes : [];
  if (!items.length) return null;
  const avoidable = items.filter((item) => !item.closeReports?.length && item.routeSource === "osrm-foot");
  const realRoutes = items.filter((item) => item.routeSource === "osrm-foot");
  const pool = avoidable.length ? avoidable : realRoutes.length ? realRoutes : items;
  return pool.slice().sort((a, b) => b.utility - a.utility)[0] || items.find((item) => item.id === fallbackId) || items[0];
}

function routePlanWarning(routes) {
  const items = Array.isArray(routes) ? routes : [];
  if (!items.length) return "경로 후보를 아직 계산하지 못했습니다.";
  const realRoutes = items.filter((item) => item.routeSource === "osrm-foot");
  if (!realRoutes.length) return "실제 도보 경로 API가 응답하지 않아 지도에는 경로선을 표시하지 않습니다.";
  if (realRoutes.every((item) => item.closeReports?.length)) return "모든 실제 도보 경로가 위험 제보 근처를 지납니다. 보호자 확인 또는 다른 출발 경로 검토가 필요합니다.";
  return "";
}

function buildFallbackRoutePlan(origin, school, selectedProtectionAnalysis, situation, aiRisk, selectedReportAnalysis) {
  if (!origin || !school) return { recommendedId: "safe", routes: [], source: "none" };
  const candidates = candidateWaypoints(origin, school, selectedProtectionAnalysis, selectedReportAnalysis);
  const baseKm = distanceKm(origin, school);
  const weatherRisk = Number(situation?.weatherRisk || 0);
  const aiRiskScore = Number(aiRisk?.score || 0);
  const protectionBonus = Math.min((selectedProtectionAnalysis?.cctvTotal || 0) * 1.2 + (selectedProtectionAnalysis?.count || 0) * 2, 24);
  const narrowPenalty = Math.min((selectedProtectionAnalysis?.narrowRoadCount || 0) * 3, 18);
  const reportPenalty = Math.min((selectedReportAnalysis?.penalty || 0) * 0.55 + (selectedReportAnalysis?.highRiskCount || 0) * 4, 24);
  const baseSafetyById = { fast: 64, balanced: 72, safe: 80 };
  const reasonById = {
    fast: "이동 거리를 가장 짧게 잡아 시간 부담을 줄입니다. 날씨가 나쁘거나 혼잡할 때는 주의가 필요합니다.",
    balanced: "빠른 경로에서 크게 벗어나지 않는 범위 안에서 보호구역 경유 또는 위험 제보 회피를 함께 고려합니다.",
    safe: candidates.find((item) => item.id === "safe")?.viaZones?.length ? "빠른 경로의 길목에 가까운 보호구역·CCTV 지점을 우선 활용하고, 위험 제보 지점은 가능한 한 피하도록 계산했습니다." : "경로상 가까운 보호구역이 부족해 위험 제보 위치를 피하는 최소 우회 경로로 계산했습니다."
  };

  const routes = candidates.map((candidate) => {
    const distance = Math.max(routeDistanceFromPoints(candidate.waypoints), baseKm);
    const extraMinutes = routeWalkingMinutes(distance) - routeWalkingMinutes(baseKm);
    const geometryReport = routeReportProximityPenalty(candidate.waypoints, selectedReportAnalysis);
    const safetyScore = clamp(Math.round((baseSafetyById[candidate.id] || 70) - weatherRisk * 0.08 - aiRiskScore * 0.14 + protectionBonus * (candidate.id === "safe" ? 0.55 : candidate.id === "balanced" ? 0.25 : 0.05) - narrowPenalty * 0.16 - reportPenalty * (candidate.id === "fast" ? 0.45 : candidate.id === "balanced" ? 0.3 : 0.18) - geometryReport.penalty * 0.8 - Math.max(0, extraMinutes) * 0.45), 0, 100);
    const utility = safetyScore - Math.max(0, extraMinutes) * 0.9 - geometryReport.penalty * 0.35;
    return { ...candidate, points: candidate.waypoints, distanceKm: distance, minutes: routeWalkingMinutes(distance), extraMinutes, safetyScore, closeReports: geometryReport.closeReports, routeReportPenalty: geometryReport.penalty, utility, reason: reasonById[candidate.id], routeSource: "fallback-coordinate" };
  });

  const recommended = chooseRecommendedRoute(routes, "safe");
  return { recommendedId: recommended?.id || "safe", routes, source: "fallback-coordinate", warning: routePlanWarning(routes) };
}

function scoreRealRoute(route, context) {
  const { id, baseKm, selectedProtectionAnalysis, selectedReportAnalysis, situation, aiRisk } = context;
  const weatherRisk = Number(situation?.weatherRisk || 0);
  const aiRiskScore = Number(aiRisk?.score || 0);
  const protectionBonus = Math.min((selectedProtectionAnalysis?.cctvTotal || 0) * 1.2 + (selectedProtectionAnalysis?.count || 0) * 2, 24);
  const narrowPenalty = Math.min((selectedProtectionAnalysis?.narrowRoadCount || 0) * 3, 18);
  const generalReportPenalty = Math.min((selectedReportAnalysis?.penalty || 0) * 0.35 + (selectedReportAnalysis?.highRiskCount || 0) * 3, 18);
  const geometryReport = routeReportProximityPenalty(route.geometry || route.points || [], selectedReportAnalysis);
  const extraMinutes = route.minutes - routeWalkingMinutes(baseKm);
  const baseSafetyById = { fast: 64, balanced: 74, safe: 82 };
  const safetyScore = clamp(Math.round((baseSafetyById[id] || 70) - weatherRisk * 0.08 - aiRiskScore * 0.14 + protectionBonus * (id === "safe" ? 0.45 : id === "balanced" ? 0.24 : 0.04) - narrowPenalty * 0.16 - generalReportPenalty * 0.25 - geometryReport.penalty * 0.85 - Math.max(0, extraMinutes) * 0.35), 0, 100);
  return { safetyScore, extraMinutes, closeReports: geometryReport.closeReports, routeReportPenalty: geometryReport.penalty, utility: safetyScore - Math.max(0, extraMinutes) * 0.9 - geometryReport.penalty * 0.35 };
}

function RouteRecommendationCard({ origin, school, selectedProtectionAnalysis, selectedReportAnalysis, situation, aiRisk, routeId, setRouteId, onRoutePlanChange }) {
  const fallbackPlan = useMemo(() => buildFallbackRoutePlan(origin, school, selectedProtectionAnalysis, situation, aiRisk, selectedReportAnalysis), [origin, school, selectedProtectionAnalysis, situation, aiRisk, selectedReportAnalysis]);
  const [realPlan, setRealPlan] = useState(null);
  const [routingStatus, setRoutingStatus] = useState("출발지를 설정하면 실제 도보 경로를 계산합니다.");

  useEffect(() => {
    let cancelled = false;
    async function loadRoutes() {
      if (!origin || !school) {
        setRealPlan(null);
        setRoutingStatus("출발지를 설정하면 실제 도보 경로를 계산합니다.");
        return;
      }
      setRoutingStatus("OpenStreetMap 도보 경로 계산 중...");
      const candidates = candidateWaypoints(origin, school, selectedProtectionAnalysis, selectedReportAnalysis);
      const baseKm = distanceKm(origin, school);
      const routes = [];
      for (const candidate of candidates) {
        try {
          const route = await fetchOsrmFootRoute(candidate.waypoints);
          const scored = scoreRealRoute(route, { id: candidate.id, baseKm, selectedProtectionAnalysis, selectedReportAnalysis, situation, aiRisk });
          routes.push({ ...candidate, ...route, points: route.geometry, ...scored, reason: candidate.id === "fast" ? "실제 도보망 기준 최단 통학 경로입니다." : candidate.id === "balanced" ? "빠른 경로에서 크게 벗어나지 않는 범위 안에서 보호구역 경유 또는 위험 제보 회피를 고려한 절충 경로입니다." : "경로상 가까운 보호구역·CCTV 지점을 우선 활용하고 위험 제보 지점을 가능한 한 피하도록 계산한 안전 우선 경로입니다.", routeSource: "osrm-foot" });
        } catch (error) {
          const fallbackRoute = fallbackPlan.routes.find((item) => item.id === candidate.id);
          if (fallbackRoute) routes.push({ ...fallbackRoute, routeSource: "fallback-after-osrm-error", routeError: error?.message || "route failed" });
        }
      }
      if (cancelled) return;
      const recommended = chooseRecommendedRoute(routes, fallbackPlan.recommendedId);
      const nextPlan = { recommendedId: recommended?.id || fallbackPlan.recommendedId, routes, source: routes.some((item) => item.routeSource === "osrm-foot") ? "osrm-foot" : "fallback-coordinate", warning: routePlanWarning(routes) };
      setRealPlan(nextPlan);
      onRoutePlanChange?.(nextPlan);
      setRoutingStatus(routes.some((item) => item.routeSource === "osrm-foot") ? "실제 도보 경로 계산 완료" : "실제 경로 API가 응답하지 않아 좌표 기반 보조 경로를 표시합니다.");
    }
    loadRoutes();
    return () => { cancelled = true; };
  }, [origin, school, selectedProtectionAnalysis, selectedReportAnalysis, situation, aiRisk]);

  useEffect(() => {
    if (!realPlan && fallbackPlan?.routes?.length) onRoutePlanChange?.(fallbackPlan);
  }, [realPlan, fallbackPlan, onRoutePlanChange]);

  if (!origin) return <Card><h2 style={{ marginTop: 0 }}>길찾기 및 경로 추천</h2><p style={{ color: "#64748b", lineHeight: 1.7 }}>출발지를 설정하면 실제 도보 경로 API를 호출해 빠른 경로, 균형 경로, 안전 우선 경로를 비교합니다.</p></Card>;

  const plan = realPlan || fallbackPlan;
  const osmUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${origin.lat}%2C${origin.lon}%3B${school.lat}%2C${school.lon}`;
  return <Card><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}><div><h2 style={{ margin: 0 }}>길찾기 및 경로 추천</h2><p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.7 }}>출발지와 학교 좌표, 보호구역·CCTV·날씨·AI 위험도를 반영해 3가지 통학 경로 후보를 비교합니다.</p></div><a href={osmUrl} target="_blank" rel="noreferrer" style={{ ...styles.button, background: "#0f172a", color: "white", textDecoration: "none" }}>OpenStreetMap에서 확인</a></div><div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}><Badge tone={plan.source === "osrm-foot" ? "green" : "yellow"}>{plan.source === "osrm-foot" ? "실제 도보 경로 API" : "좌표 기반 보조 경로"}</Badge><Badge tone="gray">{routingStatus}</Badge></div>{plan.warning ? <div style={{ marginTop: 12, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 16, padding: 14, color: "#92400e", fontWeight: 900, lineHeight: 1.7 }}>{plan.warning}</div> : null}<div style={{ display: "grid", gap: 12, marginTop: 16 }}>{plan.routes.map((item) => { const isRecommended = item.id === plan.recommendedId; const isSelected = item.id === routeId; return <div key={item.id} style={{ background: isRecommended ? "#ecfdf5" : "#f8fafc", border: `1px solid ${isRecommended ? "#bbf7d0" : "#e2e8f0"}`, borderRadius: 18, padding: 16 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}><div><b style={{ fontSize: 17 }}>{item.title}</b>{isRecommended ? <span style={{ marginLeft: 8 }}><Badge tone="green">추천</Badge></span> : null}{item.closeReports?.length ? <span style={{ marginLeft: 8 }}><Badge tone="red">위험 제보 근접</Badge></span> : item.avoidedReports?.length ? <span style={{ marginLeft: 8 }}><Badge tone="green">회피 성공</Badge></span> : null}{isSelected ? <span style={{ marginLeft: 8 }}><Badge tone="blue">선택 중</Badge></span> : null}</div><button onClick={() => setRouteId(item.id)} style={{ ...styles.button, background: isSelected ? "#0284c7" : item.closeReports?.length ? "#fee2e2" : "#e2e8f0", color: isSelected ? "white" : item.closeReports?.length ? "#be123c" : "#0f172a", padding: "9px 12px" }}>{item.closeReports?.length ? "주의하고 선택" : "이 경로 선택"}</button></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginTop: 12 }}><div><div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>예상 거리</div><b>{item.distanceKm.toFixed(2)}km</b></div><div><div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>도보 시간</div><b>약 {item.minutes}분</b></div><div><div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>경로 안전도</div><b>{item.safetyScore}점</b></div><div><div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>추가 시간</div><b>{item.extraMinutes > 0 ? `+${item.extraMinutes}분` : "없음"}</b></div></div><p style={{ margin: "10px 0 0", color: "#475569", lineHeight: 1.65 }}>{item.reason}</p>{item.viaZones?.length ? <p style={{ margin: "8px 0 0", color: "#166534", fontSize: 13, fontWeight: 800 }}>길목 활용 보호구역: {item.viaZones.map((zone) => zone.facilityName).join(", ")}</p> : null}{item.avoidedReports?.length ? <p style={{ margin: "8px 0 0", color: "#be123c", fontSize: 13, fontWeight: 800 }}>회피 고려 제보: {item.avoidedReports.map((report) => report.type).join(", ")}</p> : null}{item.closeReports?.length ? <div style={{ margin: "10px 0 0", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 14, padding: 12, color: "#92400e", fontSize: 13, fontWeight: 850, lineHeight: 1.65 }}>이 경로는 위험 제보 근처를 완전히 피하지 못했습니다: {item.closeReports.map((report) => `${report.type} ${report.routeDistanceM}m`).join(", ")}. 가능하면 추천 경로를 우선 선택하세요.</div> : null}</div>; })}</div><p style={{ margin: "14px 0 0", color: "#94a3b8", fontSize: 12, lineHeight: 1.6 }}>실제 경로 API가 사용 가능한 경우 실제 도보망 거리와 시간을 표시합니다. API 응답 실패 시 서비스 중단 없이 좌표 기반 보조 경로로 대체됩니다.</p></Card>;
}

function EvidenceSummaryCard({ aiRisk, selectedProtectionAnalysis, situation, selectedRouteMetrics }) {
  const scheduleCount = aiRisk?.academicSchedule?.items?.length || 0;
  const newsCount = Array.isArray(aiRisk?.naverNewsTitles) ? aiRisk.naverNewsTitles.length : 0;
  const protectionCount = selectedProtectionAnalysis?.count || 0;
  const cctvTotal = selectedProtectionAnalysis?.cctvTotal || 0;
  const routeText = selectedRouteMetrics ? `${selectedRouteMetrics.routeKm.toFixed(2)}km · 약 ${selectedRouteMetrics.minutes}분` : "출발지 미설정";
  return <Card><h2 style={{ marginTop: 0 }}>분석 근거 요약</h2><p style={{ color: "#64748b", lineHeight: 1.7, marginTop: -4 }}>오늘의 안전 점수는 아래 데이터를 함께 반영해 계산합니다.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}><div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 16, padding: 14 }}><div style={{ color: "#0369a1", fontSize: 12, fontWeight: 900 }}>기상·대기질</div><div style={{ marginTop: 6, fontWeight: 950 }}>{situation.weatherText} · {situation.airInfo?.label}</div><p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 12 }}>날씨와 미세먼지를 실시간 데이터로 반영</p></div><div style={{ background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: 16, padding: 14 }}><div style={{ color: "#166534", fontSize: 12, fontWeight: 900 }}>보호구역</div><div style={{ marginTop: 6, fontWeight: 950 }}>{protectionCount}곳 · CCTV {cctvTotal}대</div><p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 12 }}>반경 내 안전 인프라와 좁은 도로를 반영</p></div><div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 16, padding: 14 }}><div style={{ color: "#9a3412", fontSize: 12, fontWeight: 900 }}>학사일정</div><div style={{ marginTop: 6, fontWeight: 950 }}>{scheduleCount}건</div><p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 12 }}>체험활동·시험·휴업 등 이동 패턴 변화를 반영</p></div><div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14 }}><div style={{ color: "#475569", fontSize: 12, fontWeight: 900 }}>뉴스·경로</div><div style={{ marginTop: 6, fontWeight: 950 }}>뉴스 {newsCount}건 · {routeText}</div><p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 12 }}>지역 위험 신호와 출발지 기반 거리를 반영</p></div></div>{aiRisk?.summary ? <div style={{ marginTop: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, lineHeight: 1.75, color: "#334155" }}><b>AI 요약</b><p style={{ margin: "6px 0 0" }}>{aiRisk.summary}</p></div> : null}</Card>;
}

function DebugFormulaBlock({ title, formula, variables }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 12, background: "#f8fafc", marginTop: 10 }}>
      <div style={{ fontWeight: 950, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#334155", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", background: "white", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, overflowX: "auto" }}>{formula}</div>
      <pre style={{ margin: "8px 0 0", fontSize: 12, color: "#475569", whiteSpace: "pre-wrap", wordBreak: "break-word", background: "white", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>{JSON.stringify(variables || {}, null, 2)}</pre>
    </div>
  );
}

function AdminAuthPanel({ isAdmin, adminError, onLogin, onLogout }) {
  const [password, setPassword] = useState("");
  return (
    <Card className="admin-card">
      <h2 style={{ marginTop: 0 }}>관리자 인증</h2>
      <p style={{ color: "#64748b", lineHeight: 1.7, marginTop: 0 }}>공유 링크, 개발용 제보 관리, 계산식 디버그는 관리자 인증 후 관리 탭에서만 표시됩니다.</p>
      {isAdmin ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <b style={{ color: "#15803d" }}>관리자 인증 완료</b>
          <button style={{ ...styles.button, background: "#e2e8f0", color: "#0f172a" }} onClick={onLogout}>관리자 해제</button>
        </div>
      ) : (
        <div className="admin-form">
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onLogin(password); }} placeholder="관리자 비밀번호" style={styles.input} />
          <button style={{ ...styles.button, background: "#0f172a", color: "white" }} onClick={() => onLogin(password)}>인증</button>
        </div>
      )}
      {adminError ? <p style={{ color: "#be123c", fontWeight: 900 }}>{adminError}</p> : null}
      
    </Card>
  );
}

function DeveloperDebugPanel({ publicSafetyAnalysis, selectedProtectionAnalysis, selectedReportAnalysis, displayRouteMetrics, situation, aiRisk, route, score, riskIndex, protectionZoneStatus, publicSafetyDataStatus }) {
  const debug = publicSafetyAnalysis?.scoreDebug || {};
  const routeKm = Number(displayRouteMetrics?.routeKm || 0);
  const routeSafetyScore = clamp(100 - norm(Math.max(0, routeKm - 1), 4) * 30, 0, 100);
  const accidentSafetyScore = clamp(100 - Number(publicSafetyAnalysis?.accidentRisk || 0), 0, 100);
  const aiAuxPenalty = Math.min(Number(aiRisk?.score || 0) * 0.25, 6);
  const baseFormula = "accidentSafety*0.18 + speedControl*0.20 + walkingEnv*0.20 + lighting*0.07 + crosswalk*0.10 + protectionInfra*0.10 + environment*0.12 + report*0.02 + route*0.01 - aiAuxPenalty(aiScore*0.25, cap 6)";
  const baseVariables = {
    score,
    riskIndex,
    routeTitle: route?.title,
    routeScoreDelta: route?.scoreDelta,
    routeKm,
    routeSafetyScore,
    aiScore: aiRisk?.score || 0,
    aiAuxPenalty,
    accidentSafetyScore,
    protectionInfraScore: publicSafetyAnalysis?.protectionInfraScore,
    walkingEnvScore: publicSafetyAnalysis?.walkingEnvScore,
    lightingScore: publicSafetyAnalysis?.lightingScore,
    speedControlScore: publicSafetyAnalysis?.speedControlScore,
    accidentRisk: publicSafetyAnalysis?.accidentRisk,
    crosswalkSafetyScore: publicSafetyAnalysis?.crosswalkSafetyScore,
    environmentSafetyScore: publicSafetyAnalysis?.environmentSafetyScore,
    reportSafetyScore: publicSafetyAnalysis?.reportSafetyScore,
  };

  return (
    <Card>
      <details>
        <summary style={{ cursor: "pointer", fontWeight: 950, color: "#0f172a" }}>개발자 디버그: 실제 데이터·계산식 보기</summary>
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 12 }}><b>보호구역 CSV</b><p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 12 }}>{protectionZoneStatus}</p></div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 12 }}><b>보행·조명·사고 CSV</b><p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 12 }}>{publicSafetyDataStatus}</p></div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 12 }}><b>집계 범위</b><p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 12 }}>routeLenM {debug.routeLenM || "-"} · routeKm {routeKm || "-"}</p></div>
          </div>
          <DebugFormulaBlock title="최종 종합 안전 지수" formula={baseFormula} variables={baseVariables} />
          <DebugFormulaBlock title="보호구역 안전 인프라" formula={debug.protection?.formula} variables={{ ...(debug.protection?.variables || {}), rawProtectionAnalysis: selectedProtectionAnalysis }} />
          <DebugFormulaBlock title="보행 환경 안전성" formula={debug.walking?.formula} variables={debug.walking?.variables} />
          <DebugFormulaBlock title="조명·야간 안전성" formula={debug.lighting?.formula} variables={debug.lighting?.variables} />
          <DebugFormulaBlock title="차량 속도 제어성" formula={debug.speed?.formula} variables={debug.speed?.variables} />
          <DebugFormulaBlock title="사고 위험도" formula={debug.accident?.formula} variables={debug.accident?.variables} />
          <DebugFormulaBlock title="횡단 안전성" formula={debug.crosswalk?.formula} variables={debug.crosswalk?.variables} />
          <DebugFormulaBlock title="기상·대기 안전성" formula={debug.environment?.formula} variables={debug.environment?.variables} />
          <DebugFormulaBlock title="위험 제보 안전성" formula={debug.report?.formula} variables={{ ...(debug.report?.variables || {}), rawReportAnalysis: selectedReportAnalysis }} />
          <DebugFormulaBlock title="근처 데이터 샘플(최대 5개씩)" formula="publicSafetyAnalysis.nearby" variables={publicSafetyAnalysis?.nearby} />
        </div>
      </details>
    </Card>
  );
}

function SafetyScorePanel({ score, currentTone, publicSafetyAnalysis, riskIndex }) {
  const aiAuxNote = "AI 위험 점수는 보조 감점으로만 반영하고, 주요 지표는 CSV·날씨·제보 실제 데이터 기반입니다.";
  return <Card className="safety-score-card"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ color: "#64748b", fontWeight: 950 }}>종합 안전 지수</div><div className="score-hero-number" style={{ fontSize: 64, fontWeight: 950, letterSpacing: -3 }}>{score}<span style={{ fontSize: 24, color: "#94a3b8" }}>/100</span></div></div><span style={{ background: currentTone.bg, color: currentTone.fg, border: `1px solid ${currentTone.border}`, borderRadius: 999, padding: "7px 12px", fontWeight: 950 }}>{currentTone.label}</span></div><Bar label="보호구역 안전 인프라" value={publicSafetyAnalysis.protectionInfraScore} /><Bar label="보행 환경 안전성" value={publicSafetyAnalysis.walkingEnvScore} /><Bar label="조명·야간 안전성" value={publicSafetyAnalysis.lightingScore} /><Bar label="차량 속도 제어성" value={publicSafetyAnalysis.speedControlScore} /><Bar label="사고 위험도" value={publicSafetyAnalysis.accidentRisk} danger /><Bar label="종합 위험 지수" value={riskIndex} danger /><p style={{ margin: "12px 0 0", color: "#64748b", fontSize: 12, lineHeight: 1.6, fontWeight: 800 }}>{aiAuxNote}</p></Card>;
}

function AiRiskPanel({ aiRisk, aiError }) {
  return <Card><h2 style={{ marginTop: 0 }}>AI 기상·교통 위험 분석</h2>{aiError ? <p style={{ color: "#be123c", lineHeight: 1.7 }}>{aiError}</p> : null}{!aiRisk ? <p style={{ color: "#64748b" }}>아직 AI 분석을 실행하지 않았습니다. 설정 후 날씨·AI 분석을 눌러 주세요.</p> : <div style={{ display: "grid", gap: 12 }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 18, padding: 16 }}><div><b>AI 보조 위험 점수</b><p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>Gemini·보조 분석이 만든 참고 점수입니다. 종합 안전 지수에는 작은 보정값으로만 반영됩니다.</p></div><div style={{ fontSize: 34, fontWeight: 950 }}>{aiRisk.score}<span style={{ fontSize: 16, color: "#94a3b8" }}>/45</span></div></div><div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 18, padding: 16 }}><b>분석 요약</b><p style={{ margin: "8px 0 0", color: "#334155", lineHeight: 1.75 }}>{aiRisk.summary}</p></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}><div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 16, padding: 14 }}><div style={{ color: "#9a3412", fontSize: 12, fontWeight: 900 }}>기상 위험</div><div style={{ marginTop: 6, fontSize: 26, fontWeight: 950 }}>{aiRisk.weatherArticleScore}</div></div><div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 16, padding: 14 }}><div style={{ color: "#991b1b", fontSize: 12, fontWeight: 900 }}>교통 위험</div><div style={{ marginTop: 6, fontSize: 26, fontWeight: 950 }}>{aiRisk.trafficArticleScore}</div></div><div style={{ background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: 16, padding: 14 }}><div style={{ color: "#166534", fontSize: 12, fontWeight: 900 }}>권고 수준</div><div style={{ marginTop: 6, fontSize: 22, fontWeight: 950 }}>{aiRisk.alertLevel}</div></div></div><div style={{ display: "grid", gap: 8 }}>{aiRisk.hits.map((hit) => <div key={hit} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: 12, color: "#334155", fontWeight: 800 }}>• {hit}</div>)}</div><p style={{ margin: 0, color: "#475569", lineHeight: 1.7, fontWeight: 800 }}>{aiRisk.recommendation}</p><p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>분석 방식: {aiRisk.source?.startsWith("server-gemini") ? "Gemini AI 분석" : aiRisk.source?.includes("server-fallback") ? "서버 보조 규칙 분석" : aiRisk.source === "server-ai" ? "서버 AI 분석" : "브라우저 내 보조 규칙 분석"}</p></div>}</Card>;
}

function AiGuide({ school, route, score, situation, userType, userReports, origin }) {
  const reportText = userReports.length > 0 ? `최근 위험 제보 ${userReports.length}건도 함께 반영했습니다.` : "현재 추가 제보는 없습니다.";
  const ageText = userType === "elementary" ? "초등학생은 보호자와 약속한 길로만 이동하고" : userType === "middle" ? "중학생은 이어폰 볼륨을 낮추고" : userType === "high" ? "고등학생은 야간 이동이나 긴 통학거리에서 밝은 길과 대중교통 환승 구간을 우선 확인하고" : "보호자는 학생이 실제로 걷는 길을 함께 확인하고";
  const originText = origin ? "출발지에서 학교까지의 거리도 함께 반영했습니다." : "출발지를 설정하면 실제 등굣길 거리까지 반영할 수 있습니다.";
  return <Card style={{ background: "linear-gradient(135deg, #f0f9ff, #ffffff)" }}><div style={{ display: "flex", gap: 12, alignItems: "center" }}><div style={{ width: 50, height: 50, borderRadius: 18, background: "#e0f2fe", display: "grid", placeItems: "center", fontSize: 25 }}>🤖</div><div><div style={{ color: "#0369a1", fontWeight: 950, fontSize: 14 }}>AI 안전 안내</div><h3 style={{ margin: "3px 0 0", fontSize: 22 }}>오늘의 등굣길 행동 요령</h3></div></div><div style={{ marginTop: 18, background: "white", border: "1px solid #e2e8f0", borderRadius: 20, padding: 18, lineHeight: 1.85, color: "#334155" }}>오늘 {school.name} 주변 안전 점수는 <b>{score}점</b>입니다. AI가 판단한 현재 상황은 <b>{situation.label}</b>입니다. {situation.tip} 선택한 <b>{route.title}</b>은 {route.description} {originText} {ageText} 횡단보도에서는 신호가 바뀐 직후 바로 건너지 마세요. {reportText}</div></Card>;
}

function Checklist({ userType, situation, origin }) {
  const base = ["횡단보도 앞에서 일단 멈추기", "좌우 차량을 한 번 더 확인하기", "휴대폰을 보며 걷지 않기"];
  const extra = [];
  if (!origin) extra.push("설정에서 출발지 등록하기");
  if (situation.label.includes("비") || situation.label.includes("침수")) extra.push("우산으로 시야가 가리지 않게 들기");
  if (situation.label.includes("미세먼지") || situation.label.includes("대기질")) extra.push("마스크 준비하고 오래 머무르는 구간 피하기");
  if (situation.label.includes("어두운")) extra.push("밝은 길과 CCTV가 있는 길 이용하기");
  if (userType === "elementary") extra.push("보호자와 약속한 길로만 가기");
  if (userType === "middle") extra.push("이어폰은 한쪽만 끼거나 볼륨 낮추기");
  if (userType === "high") extra.push("야간 자율학습 후에는 밝은 길과 대중교통 정류장 주변으로 이동하기");
  return <Card><h2 style={{ marginTop: 0 }}>안전 체크리스트</h2><div style={{ display: "grid", gap: 10 }}>{[...base, ...extra].map((item, index) => <label key={item} style={{ display: "flex", gap: 10, alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 13, fontWeight: 800 }}><input type="checkbox" defaultChecked={index < 2} />{item}</label>)}</div></Card>;
}

function ReportLocationPicker({ school, origin, analysisRadius, selectedPin, setSelectedPin }) {
  const schoolLat = Number(school?.lat || 0);
  const schoolLon = Number(school?.lon || 0);
  const originLat = Number(origin?.lat || schoolLat);
  const originLon = Number(origin?.lon || schoolLon);
  const km = analysisRadius / 1000;
  const minLat = Math.min(schoolLat, originLat) - Math.max(0.003, km / 111 + 0.002);
  const maxLat = Math.max(schoolLat, originLat) + Math.max(0.003, km / 111 + 0.002);
  const minLon = Math.min(schoolLon, originLon) - Math.max(0.004, km / (111 * Math.cos((schoolLat * Math.PI) / 180)) + 0.003);
  const maxLon = Math.max(schoolLon, originLon) + Math.max(0.004, km / (111 * Math.cos((schoolLat * Math.PI) / 180)) + 0.003);
  const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${schoolLat},${schoolLon}`;
  const lonSpan = maxLon - minLon || 0.001;
  const latSpan = maxLat - minLat || 0.001;
  const pinX = selectedPin ? clamp(((selectedPin.lon - minLon) / lonSpan) * 100, 0, 100) : null;
  const pinY = selectedPin ? clamp(((maxLat - selectedPin.lat) / latSpan) * 100, 0, 100) : null;

  function selectByClick(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const xRatio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const yRatio = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    const lon = minLon + lonSpan * xRatio;
    const lat = maxLat - latSpan * yRatio;
    setSelectedPin({ lat, lon, label: "지도에서 선택한 위험 위치" });
  }

  return <Card style={{ padding: 0, overflow: "hidden" }}><div style={{ padding: 18, borderBottom: "1px solid #e2e8f0" }}><h2 style={{ margin: 0 }}>제보 위치 선택</h2><p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.7, fontSize: 14 }}>지도에서 위험한 위치를 클릭하면 빨간 핀이 찍히고, 제보가 그 위치 좌표와 함께 저장됩니다.</p></div><div onClick={selectByClick} style={{ position: "relative", height: 360, background: "#e2e8f0", cursor: "crosshair" }}><iframe title="제보 위치 선택 지도" src={embedUrl} style={{ width: "100%", height: "100%", border: 0, pointerEvents: "none" }} loading="lazy" />{pinX !== null && pinY !== null ? <div style={{ position: "absolute", left: `${pinX}%`, top: `${pinY}%`, transform: "translate(-50%, -100%)", zIndex: 5, textAlign: "center", pointerEvents: "none" }}><div style={{ fontSize: 34, filter: "drop-shadow(0 6px 10px rgba(15,23,42,0.28))" }}>📍</div><div style={{ marginTop: -5, background: "white", border: "1px solid #fecdd3", borderRadius: 999, padding: "4px 8px", color: "#be123c", fontSize: 11, fontWeight: 950, whiteSpace: "nowrap" }}>제보 위치</div></div> : null}<div style={{ position: "absolute", left: 16, bottom: 16, zIndex: 4, background: "rgba(255,255,255,0.94)", border: "1px solid #e2e8f0", borderRadius: 16, padding: "10px 12px", fontSize: 12, fontWeight: 900, color: "#475569" }}>{selectedPin ? `${selectedPin.lat.toFixed(6)}, ${selectedPin.lon.toFixed(6)}` : "지도에서 위치를 클릭하세요"}</div></div><div style={{ padding: 14, display: "flex", gap: 8, flexWrap: "wrap" }}><button onClick={() => setSelectedPin({ lat: schoolLat, lon: schoolLon, label: "학교 주변" })} style={{ ...styles.button, background: "#e2e8f0", color: "#0f172a" }}>학교 주변으로 지정</button>{origin ? <button onClick={() => setSelectedPin({ lat: origin.lat, lon: origin.lon, label: "출발지 주변" })} style={{ ...styles.button, background: "#e2e8f0", color: "#0f172a" }}>출발지 주변으로 지정</button> : null}<button onClick={() => setSelectedPin(null)} style={{ ...styles.button, background: "#fff1f2", color: "#be123c" }}>핀 지우기</button></div></Card>;
}

function ReportForm({ onAddReport, selectedPin, setSelectedPin, school, origin }) {
  const [type, setType] = useState(reportTypes[0]);
  const [memo, setMemo] = useState("");
  const [message, setMessage] = useState("");
  function submitReport() {
    const reportLat = selectedPin?.lat || origin?.lat || school?.lat;
    const reportLon = selectedPin?.lon || origin?.lon || school?.lon;
    const locationLabel = selectedPin?.label || (origin ? "출발지 주변" : "학교 주변");
    onAddReport({ id: Date.now(), type, memo: memo.trim(), lat: reportLat, lon: reportLon, locationLabel, createdAt: new Date().toLocaleString("ko-KR") });
    setMemo("");
    setSelectedPin?.(null);
    setMessage("위험 제보가 지도 핀과 함께 반영되었습니다.");
    window.setTimeout(() => setMessage(""), 1600);
  }
  return <Card><div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 10 }}><div style={{ minWidth: 0 }}><h2 style={{ margin: 0 }}>위험 제보</h2><p style={{ color: "#64748b", lineHeight: 1.7, margin: "8px 0 0" }}>지도에서 핀으로 위치를 지정한 뒤 위험 유형을 등록하면 실제 지도와 안전 점수에 반영됩니다.</p></div><div style={{ width: 118, minWidth: 104, height: 118, borderRadius: 28, background: message ? "#ecfdf5" : "#fff7ed", border: `1px solid ${message ? "#bbf7d0" : "#fed7aa"}`, display: "grid", placeItems: "center", overflow: "hidden" }}><img src={message ? MASCOT_IMAGES.reported : MASCOT_IMAGES.report} alt={message ? "위험 제보 완료 마스코트" : "위험 제보 마스코트"} style={{ width: "126%", height: "126%", objectFit: "contain", display: "block", filter: "drop-shadow(0 12px 18px rgba(15,23,42,0.14))" }} /></div></div><div style={{ background: selectedPin ? "#fff1f2" : "#f8fafc", border: `1px solid ${selectedPin ? "#fecdd3" : "#e2e8f0"}`, borderRadius: 16, padding: 12, marginBottom: 10 }}><b>{selectedPin ? "선택된 제보 위치" : "제보 위치 미선택"}</b><p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>{selectedPin ? `${selectedPin.label} · ${selectedPin.lat.toFixed(6)}, ${selectedPin.lon.toFixed(6)}` : "핀을 선택하지 않으면 학교 또는 출발지 주변 제보로 저장됩니다."}</p></div><select value={type} onChange={(event) => setType(event.target.value)} style={styles.input}>{reportTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select><textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="예: 정문 앞에 불법 주정차 차량이 많아요." style={{ ...styles.input, minHeight: 100, marginTop: 10, resize: "vertical" }} /><button onClick={submitReport} style={{ ...styles.button, width: "100%", marginTop: 10, background: "#0f172a", color: "white" }}>위험 제보하기</button>{message ? <p style={{ margin: "10px 0 0", color: "#166534", fontWeight: 900, fontSize: 13 }}>{message}</p> : null}</Card>;
}

function DevReportManager({ userReports, setUserReports }) {
  function deleteReport(id) {
    setUserReports((prev) => (prev || []).filter((report) => report.id !== id));
  }

  function clearReports() {
    setUserReports([]);
  }

  return <Card><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}><div><h2 style={{ margin: 0 }}>개발용 제보 관리</h2><p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.7 }}>테스트 중 등록한 위험 제보를 개별 삭제하거나 전체 초기화할 수 있습니다.</p></div><Badge tone={userReports?.length ? "red" : "gray"}>{userReports?.length || 0}건</Badge></div>{!userReports?.length ? <p style={{ color: "#64748b", lineHeight: 1.7 }}>삭제할 제보가 없습니다.</p> : <div style={{ display: "grid", gap: 10, marginTop: 14 }}>{userReports.map((report) => <div key={report.id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}><div><b>{report.type || "위험 제보"}</b><p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>{report.memo || "상세 설명 없음"}</p><p style={{ margin: "5px 0 0", color: "#94a3b8", fontSize: 12 }}>{report.locationLabel || "제보 위치"}{report.lat && report.lon ? ` · ${Number(report.lat).toFixed(5)}, ${Number(report.lon).toFixed(5)}` : ""}</p></div><button onClick={() => deleteReport(report.id)} style={{ ...styles.button, background: "#fee2e2", color: "#be123c", padding: "8px 10px", fontSize: 12 }}>삭제</button></div></div>)}</div>}{userReports?.length ? <button onClick={clearReports} style={{ ...styles.button, width: "100%", marginTop: 12, background: "#fff1f2", color: "#be123c" }}>위험 제보 전체 삭제</button> : null}</Card>;
}

function BackendHealthCard() {
  const [health, setHealth] = useState(null);
  const [status, setStatus] = useState("백엔드 연결 상태를 확인 중입니다...");
  const [isLoading, setIsLoading] = useState(false);

  async function checkHealth() {
    setIsLoading(true);
    setStatus("백엔드 연결 상태를 확인 중입니다...");
    try {
      const response = await fetch(apiUrl("/api/health"));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setHealth(data);
      setStatus("백엔드 연결 확인 완료");
    } catch (error) {
      setHealth(null);
      setStatus("백엔드 연결 실패. 서버 실행 상태와 API 주소를 확인해 주세요.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    checkHealth();
  }, []);

  const rows = health ? [
    { label: "Gemini", ok: health.geminiKeyConfigured, detail: health.model || "모델 정보 없음" },
    { label: "Naver 뉴스", ok: health.naverKeyConfigured, detail: health.newsRecentDays ? `최근 ${health.newsRecentDays}일 기사 제한` : "뉴스 설정 확인" },
    { label: "NEIS", ok: health.neisKeyConfigured, detail: "학사일정 API" },
    { label: "캐시", ok: true, detail: `분석 ${health.cache?.analysis || 0} · 뉴스 ${health.cache?.news || 0} · 일정 ${health.cache?.schedule || 0}` },
  ] : [];

  return <Card><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}><div><h2 style={{ margin: 0 }}>백엔드 연결 상태</h2><p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.7 }}>AI 분석, 뉴스, 학사일정, 주소 검색, 도보 경로 API가 정상 연결되어 있는지 확인합니다.</p></div><button onClick={checkHealth} disabled={isLoading} style={{ ...styles.button, background: "#e2e8f0", color: "#0f172a", opacity: isLoading ? 0.65 : 1 }}>{isLoading ? "확인 중" : "다시 확인"}</button></div><p style={{ margin: "12px 0", color: health ? "#166534" : "#92400e", fontSize: 13, fontWeight: 900 }}>{status}</p>{health ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>{rows.map((row) => <div key={row.label} style={{ background: row.ok ? "#f0fdf4" : "#fff7ed", border: `1px solid ${row.ok ? "#bbf7d0" : "#fed7aa"}`, borderRadius: 16, padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><b>{row.label}</b><Badge tone={row.ok ? "green" : "yellow"}>{row.ok ? "정상" : "확인"}</Badge></div><p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>{row.detail}</p></div>)}</div> : <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 16, padding: 14, color: "#92400e", lineHeight: 1.7 }}>백엔드가 꺼져 있으면 날씨·AI 분석, 주소 검색, 실제 도보 경로, AI 상담이 제한됩니다. 개발 중에는 <b>npm run server</b>를 먼저 실행해 주세요.</div>}</Card>;
}

function SavedOriginsCard({ savedOrigins, setSavedOrigins, selectedSchool, setOrigin, setOriginLatInput, setOriginLonInput, setOriginStatus, setMapReady, setMapStatus, resetLiveAnalysis }) {
  function selectOrigin(item) {
    const nextOrigin = { label: item.label || "저장된 출발지", lat: Number(item.lat), lon: Number(item.lon) };
    setOrigin(nextOrigin);
    setOriginLatInput(String(nextOrigin.lat));
    setOriginLonInput(String(nextOrigin.lon));
    setOriginStatus(`저장된 출발지를 불러왔습니다. 학교까지 직선거리 약 ${distanceKm(nextOrigin, selectedSchool).toFixed(2)}km`);
    setMapReady(false);
    setMapStatus("출발지가 바뀌었습니다. 오늘 안전 분석을 실행하면 지도를 다시 불러옵니다.");
    resetLiveAnalysis?.();
  }

  function removeOrigin(item) {
    setSavedOrigins((prev) => (prev || []).filter((origin) => Math.abs(Number(origin.lat) - Number(item.lat)) > 0.00001 || Math.abs(Number(origin.lon) - Number(item.lon)) > 0.00001));
  }

  function clearOrigins() {
    setSavedOrigins([]);
  }

  return <Card><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}><div><h2 style={{ margin: 0 }}>저장된 출발지</h2><p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.7 }}>주소 검색, 현재 위치, 직접 입력으로 설정한 출발지를 자동으로 기억합니다.</p></div><Badge tone={savedOrigins?.length ? "green" : "gray"}>{savedOrigins?.length || 0}곳</Badge></div>{!savedOrigins?.length ? <p style={{ color: "#64748b", lineHeight: 1.7 }}>아직 저장된 출발지가 없습니다. 출발지를 한 번 설정하면 여기에 자동으로 저장됩니다.</p> : <div style={{ display: "grid", gap: 10, marginTop: 14 }}>{savedOrigins.map((item, index) => <div key={`${item.lat}-${item.lon}-${index}`} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}><div><b>{item.label || "저장된 출발지"}</b><p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 12 }}>{Number(item.lat).toFixed(6)}, {Number(item.lon).toFixed(6)} · 학교까지 약 {distanceKm(item, selectedSchool).toFixed(2)}km</p>{item.savedAt ? <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 11 }}>저장: {item.savedAt}</p> : null}</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "end" }}><button onClick={() => selectOrigin(item)} style={{ ...styles.button, background: "#0284c7", color: "white", padding: "8px 10px", fontSize: 12 }}>불러오기</button><button onClick={() => removeOrigin(item)} style={{ ...styles.button, background: "#fee2e2", color: "#be123c", padding: "8px 10px", fontSize: 12 }}>삭제</button></div></div></div>)}</div>}{savedOrigins?.length ? <button onClick={clearOrigins} style={{ ...styles.button, background: "#f1f5f9", color: "#475569", marginTop: 12 }}>저장 출발지 전체 삭제</button> : null}</Card>;
}

function ShareSettingsCard({ officeCode, schoolId, routeId, userType, analysisRadius, origin }) {
  const [message, setMessage] = useState("현재 선택 상태를 URL에 담아 공유할 수 있습니다.");

  async function copyShareUrl() {
    const url = buildShareUrl({ officeCode, schoolId, routeId, userType, analysisRadius, origin });
    try {
      await navigator.clipboard.writeText(url);
      setMessage("공유 링크를 클립보드에 복사했습니다.");
    } catch (error) {
      setMessage(url);
    }
  }

  function applyToAddressBar() {
    const url = buildShareUrl({ officeCode, schoolId, routeId, userType, analysisRadius, origin });
    window.history.replaceState({}, "", url);
    setMessage("현재 주소창에 공유용 설정을 반영했습니다.");
  }

  return <Card><h2 style={{ marginTop: 0 }}>공유 링크</h2><p style={{ color: "#64748b", lineHeight: 1.7, marginTop: -4 }}>선택한 학교, 출발지, 경로 유형, 분석 반경을 URL에 담아 보고서나 시연 링크로 공유할 수 있습니다.</p><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><button onClick={copyShareUrl} style={{ ...styles.button, background: "#0f172a", color: "white" }}>공유 링크 복사</button><button onClick={applyToAddressBar} style={{ ...styles.button, background: "#e2e8f0", color: "#0f172a" }}>주소창에 반영</button></div><p style={{ margin: "10px 0 0", color: message.startsWith("http") ? "#475569" : "#166534", fontSize: 13, fontWeight: 850, wordBreak: "break-all" }}>{message}</p></Card>;
}

function AddressOriginSearch({ selectedSchool, setOrigin, setOriginLatInput, setOriginLonInput, setOriginStatus, setMapReady, setMapStatus, resetLiveAnalysis }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("주소나 장소명을 입력하면 출발지 좌표를 자동으로 찾습니다.");
  const [isSearching, setIsSearching] = useState(false);

  async function searchAddress() {
    const keyword = query.trim();
    if (!keyword) {
      setStatus("검색할 주소나 장소명을 입력해 주세요.");
      return;
    }
    setIsSearching(true);
    setStatus("주소 검색 중...");
    try {
      const response = await fetch(apiUrl(`/api/geocode?q=${encodeURIComponent(keyword)}`));
      const data = await response.json();
      const items = Array.isArray(data.results) ? data.results : [];
      setResults(items);
      setStatus(items.length ? `${items.length}개 후보를 찾았습니다. 아래에서 출발지를 선택하세요.` : "검색 결과가 없습니다. 더 구체적인 주소나 장소명을 입력해 주세요.");
    } catch (error) {
      setResults([]);
      setStatus("주소 검색에 실패했습니다. 백엔드 서버가 켜져 있는지 확인해 주세요.");
    } finally {
      setIsSearching(false);
    }
  }

  function selectResult(item) {
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setStatus("선택한 검색 결과의 좌표가 올바르지 않습니다.");
      return;
    }
    const nextOrigin = { label: item.label || query || "주소 검색 출발지", lat, lon };
    setOrigin(nextOrigin);
    setOriginLatInput(String(lat));
    setOriginLonInput(String(lon));
    setOriginStatus(`주소 검색으로 출발지를 설정했습니다. 학교까지 직선거리 약 ${distanceKm(nextOrigin, selectedSchool).toFixed(2)}km`);
    setStatus("출발지 설정 완료");
    setMapReady(false);
    setMapStatus("출발지가 바뀌었습니다. 오늘 안전 분석을 실행하면 지도를 다시 불러옵니다.");
    resetLiveAnalysis?.();
  }

  return <Card><h2 style={{ marginTop: 0 }}>주소로 출발지 찾기</h2><p style={{ color: "#64748b", lineHeight: 1.7, marginTop: -4 }}>위도·경도를 몰라도 주소, 동네명, 아파트명, 장소명으로 출발지를 설정할 수 있습니다.</p><div style={{ display: "flex", gap: 8 }}><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") searchAddress(); }} placeholder="예: 세종특별자치시 아름동, ○○아파트" style={styles.input} /><button onClick={searchAddress} disabled={isSearching} style={{ ...styles.button, background: "#0284c7", color: "white", minWidth: 96, opacity: isSearching ? 0.65 : 1 }}>{isSearching ? "검색 중" : "검색"}</button></div><p style={{ margin: "10px 0 0", color: results.length ? "#166534" : "#64748b", fontSize: 13, fontWeight: 850 }}>{status}</p>{results.length ? <div style={{ display: "grid", gap: 10, marginTop: 12 }}>{results.map((item, index) => <button key={`${item.lat}-${item.lon}-${index}`} onClick={() => selectResult(item)} style={{ textAlign: "left", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, cursor: "pointer" }}><b>{item.label}</b><p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 12 }}>{Number(item.lat).toFixed(6)}, {Number(item.lon).toFixed(6)} · 학교까지 약 {distanceKm(item, selectedSchool).toFixed(2)}km</p></button>)}</div> : null}</Card>;
}

function OriginSettings({ origin, setOrigin, originLatInput, setOriginLatInput, originLonInput, setOriginLonInput, originStatus, setOriginStatus, setMapReady, setMapStatus }) {
  function useCurrentLocation() {
    if (!navigator.geolocation) { setOriginStatus("이 브라우저는 현재 위치 기능을 지원하지 않습니다."); return; }
    setOriginStatus("현재 위치를 가져오는 중...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setOrigin({ lat, lon, label: "현재 위치" });
        setOriginLatInput(String(lat));
        setOriginLonInput(String(lon));
        setOriginStatus("현재 위치를 출발지로 설정했습니다. 위치는 브라우저 안에서만 사용됩니다.");
        setMapReady(false);
        setMapStatus("출발지가 바뀌었습니다. 날씨·AI 분석을 실행하면 경로 지도를 다시 불러옵니다.");
      },
      () => setOriginStatus("위치 권한이 거부되었거나 현재 위치를 가져오지 못했습니다.")
    );
  }
  function applyManualOrigin() {
    const lat = Number(originLatInput);
    const lon = Number(originLonInput);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) { setOriginStatus("위도와 경도를 숫자로 입력해 주세요."); return; }
    setOrigin({ lat, lon, label: "직접 입력한 출발지" });
    setOriginStatus("직접 입력한 좌표를 출발지로 설정했습니다.");
    setMapReady(false);
    setMapStatus("출발지가 바뀌었습니다. 날씨·AI 분석을 실행하면 경로 지도를 다시 불러옵니다.");
  }
  return <Card><h2 style={{ marginTop: 0 }}>출발지 설정</h2><p style={{ color: "#64748b", lineHeight: 1.7 }}>실제 경로 분석을 위해 집 위치나 현재 위치가 필요합니다. 출발지는 저장하지 않고 이번 화면 분석에만 사용합니다.</p><button onClick={useCurrentLocation} style={{ ...styles.button, width: "100%", background: "#0284c7", color: "white" }}>내 현재 위치 사용</button><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}><input value={originLatInput} onChange={(e) => setOriginLatInput(e.target.value)} placeholder="출발지 위도" style={styles.input} /><input value={originLonInput} onChange={(e) => setOriginLonInput(e.target.value)} placeholder="출발지 경도" style={styles.input} /></div><button onClick={applyManualOrigin} style={{ ...styles.button, width: "100%", marginTop: 10, background: "#0f172a", color: "white" }}>입력 좌표 적용</button>{origin ? <p style={{ color: "#166534", fontWeight: 900, fontSize: 13 }}>현재 출발지: {origin.label} ({origin.lat.toFixed(5)}, {origin.lon.toFixed(5)})</p> : null}<p style={{ color: origin ? "#166534" : "#64748b", fontSize: 13, lineHeight: 1.7 }}>{originStatus}</p></Card>;
}

function buildChatContext({ selectedSchool, selectedOffice, origin, score, situation, aiRisk, selectedProtectionAnalysis, selectedReportAnalysis, publicSafetyAnalysis, displayRouteMetrics }) {
  return {
    school: selectedSchool ? { name: selectedSchool.name, type: selectedSchool.type, office: selectedOffice?.name, address: selectedSchool.address } : null,
    origin: origin ? { label: origin.label, lat: origin.lat, lon: origin.lon } : null,
    score,
    weather: situation ? { label: situation.label, weatherText: situation.weatherText, air: situation.airInfo?.label, tip: situation.tip } : null,
    aiRisk: aiRisk ? { source: aiRisk.source, alertLevel: aiRisk.alertLevel, summary: aiRisk.summary, recommendation: aiRisk.recommendation, hits: aiRisk.hits } : null,
    protection: selectedProtectionAnalysis ? { count: selectedProtectionAnalysis.count, cctvTotal: selectedProtectionAnalysis.cctvTotal, narrowRoadCount: selectedProtectionAnalysis.narrowRoadCount } : null,
    reports: selectedReportAnalysis ? { count: selectedReportAnalysis.count, highRiskCount: selectedReportAnalysis.highRiskCount, penalty: selectedReportAnalysis.penalty } : null,
    publicSafety: publicSafetyAnalysis ? {
      yellowCarpetCount: publicSafetyAnalysis.yellowCarpetCount,
      childAccidentClusterCount: publicSafetyAnalysis.childAccidentClusterCount,
      lightingScore: publicSafetyAnalysis.lightingScore,
      walkingEnvScore: publicSafetyAnalysis.walkingEnvScore,
      speedControlScore: publicSafetyAnalysis.speedControlScore,
      accidentRisk: publicSafetyAnalysis.accidentRisk,
      warningPointCount: publicSafetyAnalysis.warningPointCount,
      safeInfraCount: publicSafetyAnalysis.safeInfraCount
    } : null,
    route: displayRouteMetrics ? { routeKm: displayRouteMetrics.routeKm, minutes: displayRouteMetrics.minutes } : null,
  };
}

function localSafetyAnswer(question, context) {
  const q = String(question || "");
  const schoolName = context?.school?.name || "선택 학교";
  if (!q.trim()) return "궁금한 내용을 입력해 주세요.";
  if (q.includes("마스크") || q.includes("미세먼지")) return context?.weather?.air && context.weather.air !== "좋음" ? `현재 대기질은 ${context.weather.air} 수준입니다. 민감한 학생은 마스크 착용과 장시간 실외활동 주의가 좋습니다.` : "현재 대기질 위험은 높지 않은 편입니다. 다만 민감한 학생은 개인 상태에 따라 마스크를 준비해도 좋습니다.";
  if (q.includes("우산") || q.includes("비") || q.includes("날씨")) return `${schoolName} 주변 날씨는 ${context?.weather?.weatherText || "분석 전"}입니다. 강수나 강풍이 있으면 미끄럼과 시야 저하에 주의하세요.`;
  if (q.includes("경로") || q.includes("길") || q.includes("거리")) return context?.route ? `현재 선택 경로는 약 ${context.route.routeKm.toFixed(2)}km, 도보 약 ${context.route.minutes}분입니다. 안전 점수가 낮거나 날씨가 나쁘면 안전 우선 경로를 선택하는 것이 좋습니다.` : "출발지를 먼저 설정하면 거리와 도보 시간을 바탕으로 경로 안내를 받을 수 있습니다.";
  if (q.includes("보호구역") || q.includes("CCTV")) return `분석 반경 안 보호구역은 ${context?.protection?.count || 0}곳, CCTV는 ${context?.protection?.cctvTotal || 0}대입니다. 추가 안전 인프라는 ${context?.publicSafety?.safeInfraCount || 0}개로 집계됩니다.`;
  if (q.includes("보행") || q.includes("조명") || q.includes("가로등")) return `현재 보행 환경 점수는 ${Math.round(context?.publicSafety?.walkingEnvScore || 0)}점, 조명·야간 안전성은 ${Math.round(context?.publicSafety?.lightingScore || 0)}점입니다. 이 값은 보행자우선도로·보안등·스마트가로등 CSV를 학교 주변 반경으로 필터링해 계산합니다.`;
  if (q.includes("사고") || q.includes("단속") || q.includes("속도")) return `반경 안 어린이·스쿨존 사고다발지역은 ${context?.publicSafety?.childAccidentClusterCount || 0}곳이고, 사고 위험도는 ${Math.round(context?.publicSafety?.accidentRisk || 0)}입니다. 차량 속도 제어성은 ${Math.round(context?.publicSafety?.speedControlScore || 0)}점입니다.`;
  if (q.includes("제보") || q.includes("위험")) return `현재 반영된 위험 제보는 ${context?.reports?.count || 0}건입니다. 신호등 고장, 불법 주정차, 시야 방해 제보는 안전 점수에 더 크게 반영됩니다.`;
  if (context?.aiRisk?.recommendation) return context.aiRisk.recommendation;
  return `현재 ${schoolName}의 종합 안전 지수는 ${context?.score ?? "분석 전"}점입니다. 오늘 안전 분석을 실행하면 더 구체적인 권고를 받을 수 있습니다.`;
}

function SafetyChatCard({ selectedSchool, selectedOffice, origin, score, situation, aiRisk, selectedProtectionAnalysis, selectedReportAnalysis, publicSafetyAnalysis, displayRouteMetrics }) {
  const [messages, setMessages] = useState([{ role: "assistant", content: "안녕하세요. 길누리 상담입니다. 오늘 등굣길, 경로, 날씨, 미세먼지, 보호구역, 위험 제보에 대해 질문해 주세요." }]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const context = useMemo(() => buildChatContext({ selectedSchool, selectedOffice, origin, score, situation, aiRisk, selectedProtectionAnalysis, selectedReportAnalysis, publicSafetyAnalysis, displayRouteMetrics }), [selectedSchool, selectedOffice, origin, score, situation, aiRisk, selectedProtectionAnalysis, selectedReportAnalysis, publicSafetyAnalysis, displayRouteMetrics]);

  async function sendMessage() {
    const question = input.trim();
    if (!question || isThinking) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setIsThinking(true);
    try {
      const response = await fetch(apiUrl("/api/safety-chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context, history: messages.slice(-6) })
      });
      if (!response.ok) throw new Error(`chat api ${response.status}`);
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer || localSafetyAnswer(question, context), source: data.source || "server" }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: localSafetyAnswer(question, context), source: "local-fallback" }]);
    } finally {
      setIsThinking(false);
    }
  }

  return <Card><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><div><h2 style={{ margin: 0 }}>길누리 상담</h2><p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.7 }}>현재 선택된 학교·경로·날씨·보호구역·제보 데이터를 바탕으로 질문에 답합니다.</p></div><Badge tone={aiRisk?.source?.startsWith("server-gemini") ? "green" : "yellow"}>Gemini 연결형</Badge></div><div style={{ marginTop: 14, display: "grid", gap: 10, maxHeight: 340, overflowY: "auto", paddingRight: 4 }}>{messages.map((message, index) => <div key={index} style={{ justifySelf: message.role === "user" ? "end" : "start", maxWidth: "86%", background: message.role === "user" ? "#0284c7" : "#f8fafc", color: message.role === "user" ? "white" : "#0f172a", border: `1px solid ${message.role === "user" ? "#0284c7" : "#e2e8f0"}`, borderRadius: 18, padding: "12px 14px", lineHeight: 1.65, fontWeight: 750 }}>{message.content}{message.source === "local-fallback" ? <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 11 }}>보조 규칙 답변</div> : null}</div>)}{isThinking ? <div style={{ justifySelf: "start", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 18, padding: "12px 14px", color: "#64748b", fontWeight: 850 }}>답변 생성 중...</div> : null}</div><div style={{ display: "flex", gap: 8, marginTop: 14 }}><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendMessage(); }} placeholder="예: 오늘 우산 필요해? 안전 우선 경로가 좋아?" style={styles.input} /><button onClick={sendMessage} disabled={isThinking} style={{ ...styles.button, background: "#0f172a", color: "white", minWidth: 84, opacity: isThinking ? 0.65 : 1 }}>전송</button></div><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>{["오늘 뭐 조심해야 해?", "마스크 필요해?", "안전 우선 경로가 좋아?", "보호구역은 충분해?"].map((sample) => <button key={sample} onClick={() => setInput(sample)} style={{ ...styles.button, background: "#e2e8f0", color: "#0f172a", padding: "8px 10px", fontSize: 12 }}>{sample}</button>)}</div></Card>;
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("Gilnuri app error:", error, errorInfo);
  }

  resetApp = () => {
    this.setState({ error: null, errorInfo: null });
    window.location.reload();
  };

  clearLocalData = () => {
    try {
      window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
      window.localStorage.removeItem(REPORTS_STORAGE_KEY);
      window.localStorage.removeItem(ORIGINS_STORAGE_KEY);
    } catch (error) {}
    this.resetApp();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const message = this.state.error?.message || "알 수 없는 화면 오류";
    return <div style={{ minHeight: "100vh", background: "#f8fafc", display: "grid", placeItems: "center", padding: 20, fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}><div style={{ maxWidth: 680, width: "100%", background: "white", border: "1px solid #e2e8f0", borderRadius: 28, padding: 28, boxShadow: "0 18px 50px rgba(15,23,42,0.12)" }}><div style={{ display: "inline-flex", padding: "7px 12px", borderRadius: 999, background: "#fff1f2", color: "#be123c", fontWeight: 950, fontSize: 13 }}>화면 오류 감지</div><h1 style={{ margin: "16px 0 8px", fontSize: 30, letterSpacing: -1 }}>길누리 화면을 불러오지 못했습니다.</h1><p style={{ color: "#64748b", lineHeight: 1.8 }}>일시적인 렌더링 오류이거나, 저장된 설정과 새 코드가 충돌했을 수 있습니다. 새로고침 또는 저장 데이터 초기화를 시도해 주세요.</p><div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, color: "#475569", fontSize: 13, lineHeight: 1.6, wordBreak: "break-all" }}><b>오류 메시지</b><br />{message}</div><div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}><button onClick={this.resetApp} style={{ ...styles.button, background: "#0284c7", color: "white" }}>새로고침</button><button onClick={this.clearLocalData} style={{ ...styles.button, background: "#fee2e2", color: "#be123c" }}>저장 데이터 초기화</button></div><p style={{ margin: "14px 0 0", color: "#94a3b8", fontSize: 12, lineHeight: 1.6 }}>개발 중이라면 브라우저 Console의 첫 번째 빨간 오류를 확인하면 원인을 빠르게 찾을 수 있습니다.</p></div></div>;
  }
}

function App() {
  const { isAdmin, adminError, login: loginAdmin, logout: logoutAdmin } = useAdminAuth();
  const savedSettings = useMemo(() => ({ ...readSavedSettings(), ...readUrlSettings() }), []);

  useEffect(() => {
    ensureBrandFonts();
  }, []);
  const [allSchools, setAllSchools] = useState(defaultSchools);
  const [schoolDataStatus, setSchoolDataStatus] = useState("기본 샘플 학교 데이터 사용 중");
  const [protectionZones, setProtectionZones] = useState([]);
  const [protectionZoneStatus, setProtectionZoneStatus] = useState("어린이보호구역 CSV를 업로드하거나 public/protection_zones.csv를 자동 로드합니다.");
  const [publicSafetyDatasets, setPublicSafetyDatasets] = useState({ yellowCarpets: [], accidentClusters: [], speedCameras: [], securityLights: [], pedestrianRoads: [], smartStreetLights: [] });
  const [publicSafetyDataStatus, setPublicSafetyDataStatus] = useState("보행·조명·사고 CSV 자동 로드 대기 중");
  const [officeCode, setOfficeCode] = useState(savedSettings.officeCode || defaultSchools[0].officeCode);
  const [schoolId, setSchoolId] = useState(savedSettings.schoolId || defaultSchools[0].id);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolTypeFilter, setSchoolTypeFilter] = useState("전체");
  const [routeId, setRouteId] = useState(savedSettings.routeId || "safe");
  const [userType, setUserType] = useState(savedSettings.userType || "elementary");
  const [tab, setTab] = useState("today");
  const [selectedPoint, setSelectedPoint] = useState(1);
  const [userReports, setUserReports] = useState(() => readSavedReports());
  const [weatherData, setWeatherData] = useState(null);
  const [airData, setAirData] = useState(null);
  const [aiRisk, setAiRisk] = useState(null);
  const [routePlan, setRoutePlan] = useState(null);
  const [aiRiskError, setAiRiskError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [mapVersion, setMapVersion] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [mapStatus, setMapStatus] = useState("날씨·AI 분석을 실행하면 학교 주변 지도를 함께 불러옵니다.");
  const [analysisRadius, setAnalysisRadius] = useState(Number(savedSettings.analysisRadius || 500));
  const [origin, setOrigin] = useState(savedSettings.origin || null);
  const [savedOrigins, setSavedOrigins] = useState(() => readSavedOrigins());
  const [originLatInput, setOriginLatInput] = useState(savedSettings.origin?.lat ? String(savedSettings.origin.lat) : "");
  const [originLonInput, setOriginLonInput] = useState(savedSettings.origin?.lon ? String(savedSettings.origin.lon) : "");
  const [originStatus, setOriginStatus] = useState(savedSettings.origin ? "저장된 출발지를 불러왔습니다." : "출발지를 설정하면 실제 등굣길 거리와 예상 시간이 계산됩니다.");
  const [selectedReportPin, setSelectedReportPin] = useState(null);
  const [reportMascotFlash, setReportMascotFlash] = useState(false);

  useEffect(() => {
    writeSavedReports(userReports);
  }, [userReports]);

  useEffect(() => {
    writeSavedOrigins(savedOrigins);
  }, [savedOrigins]);

  useEffect(() => {
    if (!origin) return;
    setSavedOrigins((prev) => upsertSavedOrigin(prev, origin));
  }, [origin]);

  useEffect(() => {
    writeSavedSettings({
      officeCode,
      schoolId,
      routeId,
      userType,
      analysisRadius,
      origin,
    });
  }, [officeCode, schoolId, routeId, userType, analysisRadius, origin]);

  useEffect(() => {
    if (!savedSettings.officeCode && !savedSettings.schoolId) return;
    const savedOfficeExists = allSchools.some((school) => school.officeCode === savedSettings.officeCode);
    const savedSchoolExists = allSchools.some((school) => school.id === savedSettings.schoolId);
    if (savedOfficeExists && savedSettings.officeCode && officeCode !== savedSettings.officeCode) setOfficeCode(savedSettings.officeCode);
    if (savedSchoolExists && savedSettings.schoolId && schoolId !== savedSettings.schoolId) setSchoolId(savedSettings.schoolId);
  }, [allSchools]);

  useEffect(() => {
    async function loadPublicCsv() {
      try {
        const response = await fetch("/schools.csv", { cache: "no-store" });
        if (!response.ok) return;
        const buffer = await response.arrayBuffer();
        const text = decodeSchoolCsvBuffer(buffer);
        const parsed = parseSchoolLocationCsv(text);
        applySchoolData(parsed, "public/schools.csv 자동 로드 완료");
      } catch (error) {}
    }
    loadPublicCsv();
  }, []);

  // 어린이보호구역은 API를 사용하지 않고 CSV 파일로만 반영합니다.
  // 자동 로드를 쓰려면 public/protection_zones.csv 파일을 준비하세요.

  const offices = useMemo(() => buildOffices(allSchools), [allSchools]);
  const selectedOffice = offices.find((item) => item.code === officeCode) || offices[0];
  const schoolsInOffice = allSchools.filter((item) => item.officeCode === selectedOffice?.code);
  const schoolTypes = ["전체", ...Array.from(new Set(schoolsInOffice.map((item) => item.type || "학교")))];
  const filteredSchools = schoolsInOffice
    .filter((item) => {
      const typeOk = schoolTypeFilter === "전체" || item.type === schoolTypeFilter;
      const q = schoolSearch.trim();
      const searchOk = !q || item.name.includes(q) || String(item.address || "").includes(q) || String(item.supportOfficeName || "").includes(q);
      return typeOk && searchOk;
    })
    .slice()
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ko-KR", { sensitivity: "base" }));
  const selectedSchool = allSchools.find((item) => item.id === schoolId) || filteredSchools[0] || schoolsInOffice[0] || allSchools[0];
  const selectedSchoolInFiltered = filteredSchools.some((item) => item.id === selectedSchool?.id);
  const schoolOptions = selectedSchoolInFiltered || !selectedSchool
    ? filteredSchools
    : [selectedSchool, ...filteredSchools.filter((item) => item.id !== selectedSchool.id)];
  const route = routeOptions.find((item) => item.id === routeId) || routeOptions[0];
  const selectedRouteMetrics = routeMetrics(origin, selectedSchool, route);
  const selectedRouteFromPlan = routePlan?.routes?.find((item) => item.id === routeId) || routePlan?.routes?.find((item) => item.id === routePlan?.recommendedId) || null;
  const selectedRouteGeometryForMap = useMemo(() => {
    const isRealRoute = selectedRouteFromPlan?.routeSource === "osrm-foot" || selectedRouteFromPlan?.source === "osrm-foot";
    if (!isRealRoute) return [];
    const raw = selectedRouteFromPlan?.points || selectedRouteFromPlan?.geometry || [];
    const normalized = Array.isArray(raw)
      ? raw.map(normalizeRoutePoint).filter(Boolean)
      : [];
    return normalized.length > 1 ? normalized : [];
  }, [selectedRouteFromPlan]);
  const displayRouteMetrics = selectedRouteFromPlan ? { straight: selectedRouteMetrics?.straight || distanceKm(origin, selectedSchool), routeKm: selectedRouteFromPlan.distanceKm, minutes: selectedRouteFromPlan.minutes } : selectedRouteMetrics;
  const selectedProtectionAnalysis = useMemo(() => analyzeProtectionZones(selectedSchool, protectionZones, analysisRadius), [selectedSchool, protectionZones, analysisRadius]);
  const selectedReportAnalysis = useMemo(() => analyzeUserReports(selectedSchool, origin, userReports, analysisRadius), [selectedSchool, origin, userReports, analysisRadius]);

  useEffect(() => {
    let cancelled = false;

    async function loadPublicProtectionZoneCsv() {
      const candidatePaths = ["/data/protection_zones.csv", "/protection_zones.csv"];
      setProtectionZoneStatus("어린이보호구역 CSV 자동 로드 확인 중...");

      let lastError = null;
      for (const path of candidatePaths) {
        try {
          const response = await fetch(path, { cache: "no-store" });
          if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
          const buffer = await response.arrayBuffer();
          const text = decodeCsvBuffer(buffer, ["대상시설명", "시설명", "위도", "경도", "CCTV설치대수", "보호구역도로폭"]);
          const parsed = parseProtectionZoneCsv(text);
          if (!parsed.length) throw new Error(`${path}에서 위도·경도가 있는 보호구역 행을 찾지 못했습니다.`);
          if (cancelled) return;
          setProtectionZones(parsed);
          setProtectionZoneStatus(`${path} 자동 로드 완료: ${parsed.length.toLocaleString("ko-KR")}개 보호구역`);
          return;
        } catch (error) {
          lastError = error;
        }
      }

      if (cancelled) return;
      setProtectionZones([]);
      setProtectionZoneStatus(`자동 로드할 protection_zones.csv를 읽지 못했습니다. public/data/protection_zones.csv 또는 public/protection_zones.csv를 확인하세요. (${lastError?.message || "확인 필요"})`);
    }

    loadPublicProtectionZoneCsv();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadPublicSafetyCsvs() {
      const configs = [
        { key: "yellowCarpets", label: "옐로카펫", path: "/data/yellow_carpets.csv", parser: parseYellowCarpetCsv, keywords: ["시설명", "옐로카펫", "위도", "경도"] },
        { key: "accidentClusters", label: "사고다발지역", path: "/data/accident_clusters.csv", parser: parseAccidentClusterCsv, keywords: ["사고건수", "사고유형구분", "위도", "경도"] },
        { key: "speedCameras", label: "무인단속카메라", path: "/data/speed_cameras.csv", parser: parseSpeedCameraCsv, keywords: ["무인교통단속카메라", "단속구분", "제한속도", "위도", "경도"] },
        { key: "securityLights", label: "보안등", path: "/data/security_lights.csv", parser: parseSecurityLightCsv, keywords: ["보안등위치명", "설치개수", "위도", "경도"] },
        { key: "pedestrianRoads", label: "보행자우선도로", path: "/data/pedestrian_priority_roads.csv", parser: parsePedestrianPriorityRoadCsv, keywords: ["보행자우선도로", "시작점위도", "종료점경도", "도로폭"] },
        { key: "smartStreetLights", label: "스마트가로등", path: "/data/smart_street_lights.csv", parser: parseSmartStreetLightCsv, keywords: ["스마트가로등", "CCTV유무", "위급상황신고가능여부", "위도", "경도"] },
      ];
      const next = { yellowCarpets: [], accidentClusters: [], speedCameras: [], securityLights: [], pedestrianRoads: [], smartStreetLights: [] };
      const statusParts = [];
      for (const config of configs) {
        try {
          const response = await fetch(config.path, { cache: "no-store" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const buffer = await response.arrayBuffer();
          const text = decodeCsvBuffer(buffer, config.keywords);
          const parsed = config.parser(text);
          next[config.key] = parsed;
          statusParts.push(`${config.label} ${parsed.length.toLocaleString("ko-KR")}건`);
        } catch (error) {
          statusParts.push(`${config.label} 없음`);
        }
      }
      if (cancelled) return;
      setPublicSafetyDatasets(next);
      setPublicSafetyDataStatus(statusParts.join(" · "));
    }
    loadPublicSafetyCsvs();
    return () => { cancelled = true; };
  }, []);

  function resetLiveAnalysis() {
    setWeatherData(null);
    setAirData(null);
    setAiRisk(null);
    setAiRiskError("");
    setLastUpdated("");
    setMapReady(false);
  }

  function handleAddReport(report) {
    setUserReports((prev) => [report, ...prev].slice(0, 20));
    setReportMascotFlash(true);
    window.setTimeout(() => setReportMascotFlash(false), 1800);
  }

  function applySchoolData(parsed, message) {
    setAllSchools(parsed);
    const nextOffices = buildOffices(parsed);
    const savedOffice = parsed.some((item) => item.officeCode === savedSettings.officeCode) ? savedSettings.officeCode : "";
    const savedSchool = parsed.find((item) => item.id === savedSettings.schoolId);
    const firstOffice = nextOffices.find((item) => item.code === savedOffice) || nextOffices[0];
    const firstSchool = savedSchool || parsed.find((item) => item.officeCode === firstOffice?.code) || parsed[0];
    setOfficeCode(firstOffice?.code || firstSchool.officeCode);
    setSchoolId(firstSchool.id);
    setSchoolSearch("");
    setSchoolTypeFilter("전체");
    resetLiveAnalysis();
    setSchoolDataStatus(`${message}: ${parsed.length.toLocaleString("ko-KR")}개 학교`);
  }

  function changeOffice(nextCode) {
    const first = allSchools.find((item) => item.officeCode === nextCode);
    setOfficeCode(nextCode);
    setSchoolId(first?.id || "");
    setSchoolSearch("");
    setSchoolTypeFilter("전체");
    resetLiveAnalysis();
    setMapStatus("학교가 바뀌었습니다. 날씨·AI 분석을 실행하면 지도를 다시 불러옵니다.");
  }

  function selectSchool(nextId, options = {}) {
    const nextSchool = allSchools.find((item) => item.id === nextId);
    if (!nextSchool) return;
    if (nextSchool.officeCode && nextSchool.officeCode !== officeCode) setOfficeCode(nextSchool.officeCode);
    setSchoolId(nextSchool.id);
    if (options.clearSearch) setSchoolSearch("");
    resetLiveAnalysis();
    setMapStatus("학교가 바뀌었습니다. 날씨·AI 분석을 실행하면 지도를 다시 불러옵니다.");
  }

  async function handleSchoolCsvFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const text = decodeSchoolCsvBuffer(buffer);
      const parsed = parseSchoolLocationCsv(text);
      applySchoolData(parsed, `${file.name} 로드 완료`);
    } catch (error) {
      setSchoolDataStatus(error.message || "학교 위치 CSV를 읽지 못했습니다.");
    }
  }

  async function handleProtectionZoneCsvFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const text = decodeProtectionZoneCsvBuffer(buffer);
      const parsed = parseProtectionZoneCsv(text);
      setProtectionZones(parsed);
      setProtectionZoneStatus(`${file.name} 로드 완료: ${parsed.length.toLocaleString("ko-KR")}개 보호구역`);
      resetLiveAnalysis();
    } catch (error) {
      setProtectionZoneStatus(error.message || "어린이보호구역 CSV를 읽지 못했습니다.");
    }
  }

  async function analyzeLiveSafety() {
    setIsLoading(true);
    setAiRiskError("");
    setMapReady(false);
    setMapStatus(origin ? "출발지와 학교 주변 실제 지도를 불러오는 중..." : "학교 주변 실제 지도를 불러오는 중...");
    setMapVersion((value) => value + 1);
    try {
      const lat = selectedSchool.lat;
      const lon = selectedSchool.lon;
      const forecastUrl = apiUrl(`/api/weather?lat=${lat}&lon=${lon}`);
      const airUrl = apiUrl(`/api/air-quality?lat=${lat}&lon=${lon}`);
      const weatherResponse = await fetch(forecastUrl);
      const airResponse = await fetch(airUrl);
      if (!weatherResponse.ok) throw new Error("날씨 데이터를 불러오지 못했습니다.");
      if (!airResponse.ok) throw new Error("미세먼지 데이터를 불러오지 못했습니다.");
      const weatherJson = await weatherResponse.json();
      const airJson = await airResponse.json();
      if (weatherJson.ok === false) {
        console.warn("Weather fallback used:", weatherJson.error || "weather unavailable");
      }
      if (airJson.ok === false) {
        console.warn("Air quality fallback used:", airJson.error || "air quality unavailable");
      }
      setWeatherData(weatherJson);
      setAirData(airJson);

      const routeMetricsValue = displayRouteMetrics || routeMetrics(origin, selectedSchool, route);
      const payload = {
        school: selectedSchool,
        office: selectedOffice,
        origin,
        route,
        routeMetrics: routeMetricsValue,
        protectionZoneAnalysis: selectedProtectionAnalysis,
        publicSafetyAnalysis,
        reportAnalysis: selectedReportAnalysis,
        weather: weatherJson,
        air: airJson,
        instruction: "해당 지역의 기상정보와 교통상황 관련 기사·위험 신호를 종합해 등굣길 위험 점수, 근거, 권고문을 JSON으로 반환"
      };

      try {
        const serverResult = await requestAiSafetyAnalysis(payload);
        setAiRisk({ source: "server-ai", hits: [], ...serverResult });
      } catch (error) {
        const fallback = localAiSafetyAnalysis({ selectedSchool, selectedOffice, weatherData: weatherJson, airData: airJson, routeMetricsValue, origin, selectedReportAnalysis, publicSafetyAnalysis });
        setAiRisk(fallback);
        setAiRiskError("AI 분석 서버가 연결되지 않아 브라우저 내 보조 분석으로 대체했습니다. 백엔드를 연결하면 실제 기사 분석 결과를 이 영역에 표시합니다.");
      }

      setLastUpdated(new Date().toLocaleString("ko-KR"));
      setTab("today");
    } catch (error) {
      setAiRiskError(error.message || "실시간 데이터 분석 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  const weatherCurrent = weatherData?.current || {};
  const airCurrent = airData?.current || {};
  const situation = useMemo(
    () => buildAiSituation({ weather: weatherData, air: airData, aiRisk, hour: new Date().getHours() }),
    [weatherData, airData, aiRisk]
  );
  const publicSafetyAnalysis = useMemo(() => analyzePublicSafetyDatasets(selectedSchool, publicSafetyDatasets, selectedProtectionAnalysis, selectedReportAnalysis, situation, analysisRadius), [selectedSchool, publicSafetyDatasets, selectedProtectionAnalysis, selectedReportAnalysis, situation, analysisRadius]);

  useEffect(() => {
    let cancelled = false;
    async function loadRoutePlanInBackground() {
      if (!normalizeRoutePoint(origin) || !normalizeRoutePoint(selectedSchool)) {
        setRoutePlan(null);
        return;
      }

      const fallbackPlan = buildFallbackRoutePlan(origin, selectedSchool, selectedProtectionAnalysis, situation, aiRisk, selectedReportAnalysis);
      setRoutePlan(fallbackPlan);

      const candidates = candidateWaypoints(origin, selectedSchool, selectedProtectionAnalysis, selectedReportAnalysis);
      const baseKm = distanceKm(origin, selectedSchool);
      const routes = [];

      for (const candidate of candidates) {
        try {
          const routeResult = await fetchOsrmFootRoute(candidate.waypoints);
          const scored = scoreRealRoute(routeResult, { id: candidate.id, baseKm, selectedProtectionAnalysis, selectedReportAnalysis, situation, aiRisk });
          routes.push({
            ...candidate,
            ...routeResult,
            points: routeResult.geometry,
            ...scored,
            reason: candidate.id === "fast" ? "실제 도보망 기준 최단 통학 경로입니다." : candidate.id === "balanced" ? "빠른 경로에서 크게 벗어나지 않는 범위 안에서 보호구역 경유 또는 위험 제보 회피를 고려한 절충 경로입니다." : "경로상 가까운 보호구역·CCTV 지점을 우선 활용하고 위험 제보 지점을 가능한 한 피하도록 계산한 안전 우선 경로입니다.",
            routeSource: routeResult.source || "server-foot-route"
          });
        } catch (error) {
          const fallbackRoute = fallbackPlan.routes.find((item) => item.id === candidate.id);
          if (fallbackRoute) routes.push({ ...fallbackRoute, routeSource: "fallback-after-route-error" });
        }
      }

      if (cancelled || !routes.length) return;
      const recommended = chooseRecommendedRoute(routes, fallbackPlan.recommendedId);
      setRoutePlan({
        recommendedId: recommended?.id || fallbackPlan.recommendedId,
        routes,
        source: routes.some((item) => item.routeSource === "osrm-foot") ? "osrm-foot" : "fallback-coordinate",
        warning: routePlanWarning(routes)
      });
    }

    loadRoutePlanInBackground();
    return () => { cancelled = true; };
  }, [origin, selectedSchool, selectedProtectionAnalysis, selectedReportAnalysis, situation, aiRisk]);

  const baseScore = useMemo(() => {
    const routeKm = Number(displayRouteMetrics?.routeKm || 0);
    const routeSafetyScore = clamp(100 - norm(Math.max(0, routeKm - 1), 4) * 30, 0, 100);
    const accidentSafetyScore = clamp(100 - Number(publicSafetyAnalysis.accidentRisk || 0), 0, 100);
    const aiAuxPenalty = Math.min(Number(aiRisk?.score || 0) * 0.25, 6);
    const dataBasedScore =
      accidentSafetyScore * 0.18
      + publicSafetyAnalysis.speedControlScore * 0.20
      + publicSafetyAnalysis.walkingEnvScore * 0.20
      + publicSafetyAnalysis.lightingScore * 0.07
      + publicSafetyAnalysis.crosswalkSafetyScore * 0.10
      + publicSafetyAnalysis.protectionInfraScore * 0.10
      + publicSafetyAnalysis.environmentSafetyScore * 0.12
      + publicSafetyAnalysis.reportSafetyScore * 0.02
      + routeSafetyScore * 0.01;
    return Math.round(clamp(dataBasedScore - aiAuxPenalty, 0, 100));
  }, [publicSafetyAnalysis, displayRouteMetrics, aiRisk]);

  const score = Math.round(clamp(baseScore + route.scoreDelta, 0, 100));
  const currentTone = getTone(score);
  const riskIndex = 100 - score;
  const mascotKey = getMascotKey({ isLoading, tab, reportMascotFlash, score, situation });
  const weatherMascotKey = getWeatherMascotKey(situation);
  const tabs = [["today", "오늘의 등굣길"], ["routes", "경로 비교"], ["report", "위험 제보"], ["info", "정보"], ["settings", "설정"], ...(isAdmin ? [["admin", "관리"]] : [])];

  return <div style={styles.page}><style>{`*{box-sizing:border-box}button,select,input,textarea{font-family:inherit}button:hover{transform:translateY(-1px)}
.collapsible-section details{width:100%}.collapsible-summary{cursor:pointer;font-weight:950;font-size:28px;color:#0f172a;list-style:none}.collapsible-summary::-webkit-details-marker{display:none}.collapsible-summary:after{content:'접기';float:right;font-size:13px;background:#eef2f7;color:#475569;border-radius:999px;padding:8px 12px;margin-top:2px}.collapsible-section details:not([open]) .collapsible-summary:after{content:'펼치기'}.collapsible-content{margin-top:22px}.dev-only{display:block}.mobile-only{display:none}.source-details{border:1px solid #e2e8f0;border-radius:18px;padding:16px;background:#f8fafc}.source-details summary{cursor:pointer;font-weight:950;color:#0f172a}.source-details div{margin-top:12px}.admin-card{border:1px solid #dbeafe!important;background:linear-gradient(180deg,#f8fbff,#ffffff)!important}.admin-form{display:flex;gap:10px;flex-wrap:wrap}.admin-form input{flex:1;min-width:180px}
@media(max-width:640px){body{font-size:14px!important}.mobile-only{display:block}.desktop-only{display:none!important}.collapsible-section{padding:18px!important;border-radius:22px!important}.collapsible-summary{font-size:22px;line-height:1.25}.collapsible-summary:after{font-size:11px;padding:6px 9px}.collapsible-content{margin-top:14px}.admin-form{display:grid;grid-template-columns:1fr}.admin-form input,.admin-form button{width:100%!important}.source-details{padding:12px}.source-details p{font-size:13px!important;line-height:1.55!important}h1{font-size:30px!important;line-height:1.14!important;letter-spacing:-1px!important}h2{font-size:24px!important;line-height:1.18!important;letter-spacing:-0.8px!important}h3{font-size:20px!important;line-height:1.22!important}p{font-size:14px!important;line-height:1.55!important}.leaflet-container{min-height:330px!important}input,select,textarea,button{font-size:15px!important}.main-grid,.hero-grid,.two-grid{gap:14px!important}.card-mobile-tight{padding:18px!important}.main-grid>div{gap:14px!important}.hero-grid{display:none!important}.today-insight-card{padding:18px!important}.today-insight-layout{display:grid!important;grid-template-columns:1fr!important;gap:10px!important}.today-insight-title{font-size:25px!important;line-height:1.2!important;word-break:keep-all!important}.today-insight-visual{min-width:0!important;display:flex!important;justify-content:space-between!important;align-items:center!important}.today-insight-visual img{width:118px!important;max-width:38vw!important}.today-insight-visual>div{width:74px!important;min-width:74px!important;height:58px!important;border-radius:18px!important}.score-hero-number{font-size:48px!important;letter-spacing:-2px!important}.score-hero-number span{font-size:18px!important}.stat-card{padding:18px!important;min-height:auto!important}.stat-value{font-size:28px!important;white-space:normal!important;word-break:keep-all!important;overflow-wrap:anywhere!important}.stat-card img{max-height:120px!important;transform:none!important}.safety-score-card{padding:18px!important}.safety-score-card .score-hero-number{font-size:52px!important}.safety-score-card [style*='font-size: 14px']{font-size:13px!important}.safety-score-card [style*='height: 11px']{height:9px!important}header>div{padding:10px 14px!important;gap:10px!important}header img{width:50px!important;height:50px!important}header button{padding:12px 14px!important;border-radius:18px!important;font-size:15px!important}header [style*='font-size: 22px']{font-size:20px!important}header [style*='font-size: 13px']{font-size:12px!important;line-height:1.25!important}main{padding:16px 14px 48px!important}section[style*='border-radius: 20px']{padding:6px!important;gap:6px!important}section[style*='border-radius: 20px'] button{padding:9px 11px!important;font-size:13px!important}.leaflet-control-container{font-size:12px!important}.card, .collapsible-section{max-width:100%!important}
.dashboard-grid{align-items:stretch!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:14px!important}
.dashboard-grid>div{min-height:190px!important;padding:22px 24px!important;overflow:hidden!important}
.dashboard-grid>div h2,.dashboard-grid>div h3{margin-top:0!important}
.dashboard-grid img{max-width:46%!important;height:auto!important;object-fit:contain!important}
.dashboard-grid>div:nth-child(3) img{max-width:48%!important;position:absolute!important;right:18px!important;bottom:4px!important}
.dashboard-grid>div:nth-child(4){min-height:150px!important}
.dashboard-grid>div:nth-child(4) img{max-width:36%!important;position:absolute!important;right:18px!important;bottom:8px!important}
@media(max-width:1100px){.dashboard-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.dashboard-grid>div{min-height:170px!important}.dashboard-grid>div:nth-child(3){min-height:210px!important}}
@media(max-width:920px){.hero-grid,.main-grid,.two-grid{grid-template-columns:1fr!important}.dashboard-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.sticky-panel{position:static!important}}
@media(max-width:640px){.dashboard-grid{grid-template-columns:1fr!important;gap:12px!important}.dashboard-grid>div{min-height:auto!important;padding:18px!important}.dashboard-grid img{max-width:92px!important}.dashboard-grid>div:nth-child(3) img,.dashboard-grid>div:nth-child(4) img{position:static!important;max-width:120px!important;margin-top:8px!important}.dashboard-grid>div:nth-child(3){min-height:auto!important}}`}</style><header style={styles.header}><div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 70, height: 70, display: "grid", placeItems: "center", overflow: "visible", flex: "0 0 auto" }}><img src="/brand/logo_only.png" alt="길누리 로고" style={{ width: 66, height: 66, objectFit: "contain", display: "block", filter: "drop-shadow(0 6px 10px rgba(15,23,42,0.10))" }} /></div><div><div style={{ fontFamily: "'GmarketSans', 'Pretendard', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: "-0.04em" }}>길누리</div><div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>공공데이터 기반 학생 통학 안전 분석 서비스</div></div></div><button onClick={analyzeLiveSafety} disabled={isLoading} style={{ ...styles.button, background: isLoading ? "#94a3b8" : "#0f172a", color: "white" }}>{isLoading ? "분석 중..." : "오늘 안전 분석"}</button></div></header><main style={styles.container}><section className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 20 }}><div style={styles.hero}><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Badge tone="dark">공공데이터</Badge><Badge tone="dark">실시간 환경</Badge><Badge tone="dark">통학권 분석</Badge><Badge tone="dark">AI 권고문</Badge></div><h1 style={{ fontSize: "clamp(36px, 6vw, 62px)", lineHeight: 1.05, margin: "34px 0 18px", letterSpacing: -2 }}><span className="safe-route-hero-title">오늘 등굣길도 길누리와 함께해요!</span></h1><p style={{ maxWidth: 680, lineHeight: 1.8, color: "#e0f2fe", fontSize: 17 }}>학교·학구도, CSV 보호구역, 날씨·미세먼지, 학사일정, 지역 뉴스 데이터를 AI가 종합해 오늘의 통학 위험과 행동 요령을 알려줍니다.</p></div><Card style={{ background: "#0f172a", color: "white" }}><div style={{ color: "#7dd3fc", fontWeight: 950 }}>현재 선택된 등굣길</div><div style={{ display: "flex", alignItems: "end", gap: 10, marginTop: 18 }}><div style={{ fontSize: 64, fontWeight: 950, letterSpacing: -3 }}>{score}</div><div style={{ paddingBottom: 14, color: "#94a3b8", fontWeight: 900 }}>/100</div></div><Badge tone={score >= 75 ? "green" : score >= 55 ? "yellow" : "red"}>{currentTone.label}</Badge><p style={{ marginTop: 18, color: "#cbd5e1", lineHeight: 1.7 }}>{selectedSchool.name} · {situation.label}</p><p style={{ color: "#94a3b8", fontSize: 12 }}>{origin ? `${origin.label} → 학교 ${selectedRouteMetrics ? selectedRouteMetrics.routeKm.toFixed(2) : "-"}km` : "출발지 미설정"}</p>{lastUpdated ? <p style={{ color: "#94a3b8", fontSize: 12 }}>업데이트: {lastUpdated}</p> : null}<div style={{ marginTop: 14, display: "flex", justifyContent: "center", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24, padding: 10 }}><MascotImage variant={mascotKey} size={250} /></div></Card></section><section style={{ marginTop: 20, background: "white", border: "1px solid #e2e8f0", borderRadius: 20, padding: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} style={{ ...styles.button, background: tab === id ? "#0f172a" : "transparent", color: tab === id ? "white" : "#64748b" }}>{label}</button>)}</section><section className="main-grid" style={{ marginTop: 20, display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", gap: 20 }}><CollapsibleSection title="기본 설정" defaultOpen={typeof window === "undefined" ? true : window.innerWidth > 640} className="sticky-panel" style={{ height: "fit-content", position: "sticky", top: 90 }}><label style={{ display: "block", marginTop: 14 }}><div style={{ fontWeight: 900, marginBottom: 8 }}>시도교육청</div><select value={selectedOffice?.code || ""} onChange={(event) => changeOffice(event.target.value)} style={styles.input}>{offices.map((item) => <option key={item.code} value={item.code}>{item.name} ({item.count.toLocaleString("ko-KR")})</option>)}</select></label><label style={{ display: "block", marginTop: 14 }}><div style={{ fontWeight: 900, marginBottom: 8 }}>학교 검색</div><input value={schoolSearch} onChange={(event) => setSchoolSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && filteredSchools[0]) selectSchool(filteredSchools[0].id, { clearSearch: true }); }} placeholder="학교명, 주소, 교육지원청 검색" style={styles.input} /></label>{schoolSearch.trim() ? <div style={{ display: "grid", gap: 8, marginTop: 10 }}>{filteredSchools.length === 0 ? <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 14, padding: 12, color: "#92400e", fontSize: 13, fontWeight: 850 }}>검색 결과가 없습니다. 시도교육청이나 검색어를 확인해 주세요.</div> : filteredSchools.slice(0, 6).map((item) => <button key={item.id} type="button" onClick={() => selectSchool(item.id, { clearSearch: true })} style={{ textAlign: "left", background: item.id === selectedSchool?.id ? "#ecfdf5" : "#f8fafc", border: `1px solid ${item.id === selectedSchool?.id ? "#bbf7d0" : "#e2e8f0"}`, borderRadius: 14, padding: 12, cursor: "pointer" }}><b>{item.name}</b><p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 12, lineHeight: 1.45 }}>{item.address || item.supportOfficeName || item.officeName || "주소 정보 없음"}</p></button>)}{filteredSchools.length > 6 ? <p style={{ margin: 0, color: "#94a3b8", fontSize: 12, fontWeight: 800 }}>상위 6개만 표시합니다. 검색어를 더 구체적으로 입력해 주세요.</p> : null}</div> : null}<label style={{ display: "block", marginTop: 14 }}><div style={{ fontWeight: 900, marginBottom: 8 }}>학교급</div><select value={schoolTypeFilter} onChange={(event) => setSchoolTypeFilter(event.target.value)} style={styles.input}>{schoolTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label style={{ display: "block", marginTop: 14 }}><div style={{ fontWeight: 900, marginBottom: 8 }}>학교</div><select value={selectedSchool?.id || ""} onChange={(event) => selectSchool(event.target.value)} style={styles.input}>{schoolOptions.length === 0 ? <option value="">선택 가능한 학교 없음</option> : schoolOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 12 }}>{filteredSchools.length.toLocaleString("ko-KR")}개 표시{!selectedSchoolInFiltered && schoolSearch.trim() ? " · 현재 선택 학교는 검색 결과 밖에 있습니다" : ""}</p></label><label style={{ display: "block", marginTop: 14 }}><div style={{ fontWeight: 900, marginBottom: 8 }}>사용자</div><select value={userType} onChange={(event) => setUserType(event.target.value)} style={styles.input}><option value="elementary">초등학생</option><option value="middle">중학생</option><option value="high">고등학생</option><option value="parent">보호자</option></select></label><div style={{ marginTop: 14 }}><div style={{ fontWeight: 900, marginBottom: 8 }}>경로 유형</div><div style={{ display: "grid", gap: 8 }}>{routeOptions.map((item) => <button key={item.id} onClick={() => setRouteId(item.id)} style={{ textAlign: "left", border: routeId === item.id ? "2px solid #38bdf8" : "1px solid #e2e8f0", borderRadius: 18, padding: 14, background: routeId === item.id ? "#f0f9ff" : "white", cursor: "pointer" }}><b>{item.title}</b><div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{origin ? `${routeMetrics(origin, selectedSchool, item)?.routeKm.toFixed(2)}km · 약 ${routeMetrics(origin, selectedSchool, item)?.minutes}분` : item.goodFor}</div></button>)}</div></div><label style={{ display: "block", marginTop: 14 }}><div style={{ fontWeight: 900, marginBottom: 8 }}>분석 반경</div><select value={analysisRadius} onChange={(event) => { setAnalysisRadius(Number(event.target.value)); setMapReady(false); setMapStatus("분석 반경이 바뀌었습니다. 날씨·AI 분석을 실행하면 지도를 다시 불러옵니다."); }} style={styles.input}><option value={300}>300m - 학교 바로 주변</option><option value={500}>500m - 일반 등굣길</option><option value={1000}>1km - 넓은 통학권</option></select></label><button onClick={analyzeLiveSafety} disabled={isLoading} style={{ ...styles.button, marginTop: 16, width: "100%", background: isLoading ? "#94a3b8" : "#0284c7", color: "white" }}>{isLoading ? "분석 중..." : "오늘 안전 분석 실행"}</button></CollapsibleSection><div style={{ display: "grid", gap: 20 }}>{tab === "today" && <><TodayInsightCard score={score} currentTone={currentTone} situation={situation} aiRisk={aiRisk} selectedRouteMetrics={displayRouteMetrics} selectedProtectionAnalysis={selectedProtectionAnalysis} mascotKey={mascotKey} /><SafetyScorePanel score={score} currentTone={currentTone} publicSafetyAnalysis={publicSafetyAnalysis} riskIndex={riskIndex} /><RealSchoolMap school={selectedSchool} origin={origin} route={route} routeGeometry={selectedRouteGeometryForMap} routeSource={selectedRouteFromPlan?.routeSource || routePlan?.source} selectedProtectionAnalysis={selectedProtectionAnalysis} userReports={userReports} mapVersion={mapVersion} mapStatus={mapStatus} mapReady={mapReady} setMapReady={setMapReady} analysisRadius={analysisRadius} /><RadiusAnalysis school={selectedSchool} origin={origin} route={route} routeMetricsOverride={displayRouteMetrics} analysisRadius={analysisRadius} score={score} situation={situation} publicSafetyAnalysis={publicSafetyAnalysis} /><AiGuide school={selectedSchool} route={route} score={score} situation={situation} userType={userType} userReports={userReports} origin={origin} /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}><StatCard icon="🛡️" title="안전 점수" value={`${score}점`} helper={`${currentTone.label} 단계`} color={currentTone.fg} /><StatCard icon="🚶" title="예상 거리" value={displayRouteMetrics ? `${displayRouteMetrics.routeKm.toFixed(2)}km` : "미설정"} helper={displayRouteMetrics ? `도보 약 ${displayRouteMetrics.minutes}분` : "설정에서 출발지 등록"} color="#10b981" /><StatCard icon="🌦️" title="날씨" value={situation.weatherText} helper={weatherCurrent.temperature_2m !== undefined ? `${weatherCurrent.temperature_2m}°C · 강수 ${situation.precipitation}mm` : "분석 전"} color="#0284c7" imageSrc={MASCOT_IMAGES[weatherMascotKey]} imageAlt="길누리 날씨 마스코트" /><StatCard icon="😷" title="미세먼지" value={situation.airInfo.label} helper={airCurrent.pm2_5 !== undefined ? `PM2.5 ${airCurrent.pm2_5} · PM10 ${airCurrent.pm10}` : "분석 전"} color="#6366f1" imageSrc={(situation.airInfo.label === "나쁨" || situation.airInfo.label === "매우 나쁨") ? MASCOT_IMAGES.dustBad : undefined} imageAlt="길누리 미세먼지 마스코트" /></div><AiRiskPanel aiRisk={aiRisk} aiError={aiRiskError} /><SafetyChatCard selectedSchool={selectedSchool} selectedOffice={selectedOffice} origin={origin} score={score} situation={situation} aiRisk={aiRisk} selectedProtectionAnalysis={selectedProtectionAnalysis} selectedReportAnalysis={selectedReportAnalysis} publicSafetyAnalysis={publicSafetyAnalysis} displayRouteMetrics={displayRouteMetrics} /></>}{tab === "info" && <><ServiceBrandCard /><EvidenceSummaryCard aiRisk={aiRisk} selectedProtectionAnalysis={selectedProtectionAnalysis} situation={situation} selectedRouteMetrics={displayRouteMetrics} /><DataSourceStatusCard schoolDataStatus={schoolDataStatus} protectionZoneStatus={protectionZoneStatus} publicSafetyDataStatus={publicSafetyDataStatus} publicSafetyAnalysis={publicSafetyAnalysis} aiRisk={aiRisk} weatherData={weatherData} airData={airData} origin={origin} protectionZones={protectionZones} /><BackendHealthCard /><DataSourceReferencesCard /><ProtectionZoneCard analysis={selectedProtectionAnalysis} status={protectionZoneStatus} /><ReportImpactCard analysis={selectedReportAnalysis} /><AcademicScheduleCard schedule={aiRisk?.academicSchedule} /><NaverNewsTitlesCard newsItems={aiRisk?.naverNewsTitles} /></>}{tab === "routes" && <><RouteRecommendationCard origin={origin} school={selectedSchool} selectedProtectionAnalysis={selectedProtectionAnalysis} selectedReportAnalysis={selectedReportAnalysis} situation={situation} aiRisk={aiRisk} routeId={routeId} setRouteId={setRouteId} onRoutePlanChange={setRoutePlan} /><Card><h2 style={{ marginTop: 0 }}>경로별 안전성 비교</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>{routeOptions.map((item) => { const metrics = routeMetrics(origin, selectedSchool, item); const routeScore = Math.round(clamp(baseScore + item.scoreDelta, 0, 100)); const routeTone = getTone(routeScore); return <button key={item.id} onClick={() => setRouteId(item.id)} style={{ textAlign: "left", border: routeId === item.id ? "2px solid #10b981" : "1px solid #e2e8f0", background: routeId === item.id ? "#ecfdf5" : "#f8fafc", borderRadius: 22, padding: 18, cursor: "pointer" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><b>{item.title}</b><span style={{ background: routeTone.bg, color: routeTone.fg, borderRadius: 999, padding: "5px 10px", fontWeight: 950, fontSize: 12 }}>{routeScore}점</span></div><p style={{ color: "#64748b", lineHeight: 1.7 }}>{item.description}</p><div style={{ fontSize: 13, color: "#475569", fontWeight: 900 }}>{metrics ? `${metrics.routeKm.toFixed(2)}km · 약 ${metrics.minutes}분` : "출발지 설정 후 거리 계산"}</div><div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>추천 상황: {item.goodFor}</div></button>; })}</div></Card></>}{tab === "report" && <div className="two-grid" style={{ display: "grid", gridTemplateColumns: "380px minmax(0, 1fr)", gap: 20 }}><div style={{ display: "grid", gap: 20 }}><ReportLocationPicker school={selectedSchool} origin={origin} analysisRadius={analysisRadius} selectedPin={selectedReportPin} setSelectedPin={setSelectedReportPin} /><ReportForm onAddReport={handleAddReport} selectedPin={selectedReportPin} setSelectedPin={setSelectedReportPin} school={selectedSchool} origin={origin} /></div><div style={{ display: "grid", gap: 20 }}><Card><h2 style={{ marginTop: 0 }}>최근 제보</h2>{userReports.length === 0 ? <p style={{ color: "#64748b" }}>아직 등록된 제보가 없습니다.</p> : <div style={{ display: "grid", gap: 10 }}>{userReports.map((report) => <div key={report.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14 }}><div><b>{report.type}</b><p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 14 }}>{report.memo || "상세 설명 없음"}</p><p style={{ margin: "5px 0 0", color: "#94a3b8", fontSize: 12, fontWeight: 800 }}>{report.locationLabel || "제보 위치"}{report.lat && report.lon ? ` · ${Number(report.lat).toFixed(5)}, ${Number(report.lon).toFixed(5)}` : ""}</p></div><Badge tone="red">반영됨</Badge></div>)}</div>}</Card></div></div>}{tab === "settings" && <div className="two-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}><div style={{ display: "grid", gap: 20 }}><AdminAuthPanel isAdmin={isAdmin} adminError={adminError} onLogin={loginAdmin} onLogout={logoutAdmin} /><SavedOriginsCard savedOrigins={savedOrigins} setSavedOrigins={setSavedOrigins} selectedSchool={selectedSchool} setOrigin={setOrigin} setOriginLatInput={setOriginLatInput} setOriginLonInput={setOriginLonInput} setOriginStatus={setOriginStatus} setMapReady={setMapReady} setMapStatus={setMapStatus} resetLiveAnalysis={resetLiveAnalysis} /><AddressOriginSearch selectedSchool={selectedSchool} setOrigin={setOrigin} setOriginLatInput={setOriginLatInput} setOriginLonInput={setOriginLonInput} setOriginStatus={setOriginStatus} setMapReady={setMapReady} setMapStatus={setMapStatus} resetLiveAnalysis={resetLiveAnalysis} /><OriginSettings origin={origin} setOrigin={setOrigin} originLatInput={originLatInput} setOriginLatInput={setOriginLatInput} originLonInput={originLonInput} setOriginLonInput={setOriginLonInput} originStatus={originStatus} setOriginStatus={setOriginStatus} setMapReady={setMapReady} setMapStatus={setMapStatus} /></div><div style={{ display: "grid", gap: 20 }}><Card><h2 style={{ marginTop: 0 }}>실시간 데이터 상태</h2><p style={{ color: "#64748b", lineHeight: 1.7 }}>선택한 학교 좌표 기준으로 날씨·미세먼지를 조회합니다. 기사 직접 검색은 제거했고, 백엔드 AI 분석 서버가 있으면 기상·교통 기사 분석 결과를 받아 점수화합니다.</p><div style={{ display: "grid", gap: 10, marginTop: 16 }}><div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14 }}><b>선택 학교 좌표</b><p style={{ margin: "6px 0 0", color: "#64748b" }}>{selectedSchool.name}: {Number(selectedSchool.lat).toFixed(6)}, {Number(selectedSchool.lon).toFixed(6)}</p></div><div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14 }}><b>출발지</b><p style={{ margin: "6px 0 0", color: "#64748b" }}>{origin ? `${origin.label}: ${origin.lat.toFixed(6)}, ${origin.lon.toFixed(6)}` : "미설정"}</p></div><div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14 }}><b>날씨</b><p style={{ margin: "6px 0 0", color: "#64748b" }}>{weatherCurrent.temperature_2m !== undefined ? `${situation.weatherText}, ${weatherCurrent.temperature_2m}°C, 바람 ${situation.wind}km/h` : "아직 분석 전"}</p></div><div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14 }}><b>미세먼지</b><p style={{ margin: "6px 0 0", color: "#64748b" }}>{airCurrent.pm2_5 !== undefined ? `PM2.5 ${airCurrent.pm2_5}, PM10 ${airCurrent.pm10}, ${situation.airInfo.label}` : "아직 분석 전"}</p></div></div></Card><DataSourceStatusCard schoolDataStatus={schoolDataStatus} protectionZoneStatus={protectionZoneStatus} publicSafetyDataStatus={publicSafetyDataStatus} publicSafetyAnalysis={publicSafetyAnalysis} aiRisk={aiRisk} weatherData={weatherData} airData={airData} origin={origin} protectionZones={protectionZones} /></div></div>}{tab === "admin" && <div style={{ display: "grid", gap: 20 }}><ShareSettingsCard officeCode={officeCode} schoolId={schoolId} routeId={routeId} userType={userType} analysisRadius={analysisRadius} origin={origin} /><DevReportManager userReports={userReports} setUserReports={setUserReports} /><DeveloperDebugPanel publicSafetyAnalysis={publicSafetyAnalysis} selectedProtectionAnalysis={selectedProtectionAnalysis} selectedReportAnalysis={selectedReportAnalysis} displayRouteMetrics={displayRouteMetrics} situation={situation} aiRisk={aiRisk} route={route} score={score} riskIndex={riskIndex} protectionZoneStatus={protectionZoneStatus} publicSafetyDataStatus={publicSafetyDataStatus} /></div>}</div></section><footer style={{ marginTop: 36, padding: "30px 0 0", display: "grid", placeItems: "center" }}><div style={{ background: "transparent", border: 0, borderRadius: 0, padding: "8px 12px", boxShadow: "none", width: "min(680px, 100%)", display: "grid", placeItems: "center" }}><img src="/brand/logo_name.png" alt="길누리 브랜드 로고" style={{ width: "min(520px, 92vw)", height: "auto", objectFit: "contain", display: "block", filter: "drop-shadow(0 8px 14px rgba(15,23,42,0.08))" }} /></div></footer></main></div>;
}

function GilnuriApp() {
  return <AppErrorBoundary><App /></AppErrorBoundary>;
}

export default GilnuriApp;
  