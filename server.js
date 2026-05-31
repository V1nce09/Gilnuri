import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const geminiModel = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;
const naverClientId = process.env.NAVER_CLIENT_ID || "";
const naverClientSecret = process.env.NAVER_CLIENT_SECRET || "";
const neisApiKey = process.env.NEIS_API_KEY || "";
const devPassword = process.env.DEV_PASSWORD || "";
const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
const reportsTable = process.env.SUPABASE_REPORTS_TABLE || "gilnuri_reports";
const analysisCache = new Map();
const newsCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;
const SCHEDULE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const NEWS_RECENT_DAYS = Number(process.env.NEWS_RECENT_DAYS || 7);
const scheduleCache = new Map();

const neisOfficeCodeMap = {
  "서울특별시교육청": "B10",
  "부산광역시교육청": "C10",
  "대구광역시교육청": "D10",
  "인천광역시교육청": "E10",
  "광주광역시교육청": "F10",
  "대전광역시교육청": "G10",
  "울산광역시교육청": "H10",
  "세종특별자치시교육청": "I10",
  "경기도교육청": "J10",
  "강원특별자치도교육청": "K10",
  "강원도교육청": "K10",
  "충청북도교육청": "M10",
  "충청남도교육청": "N10",
  "전북특별자치도교육청": "P10",
  "전라북도교육청": "P10",
  "전라남도교육청": "Q10",
  "경상북도교육청": "R10",
  "경상남도교육청": "S10",
  "제주특별자치도교육청": "T10",
};

function getCache(key, store, ttlMs = CACHE_TTL_MS) {
  const item = store.get(key);
  if (!item) return null;
  if (Date.now() - item.createdAt > ttlMs) {
    store.delete(key);
    return null;
  }
  return item.value;
}

function setCache(key, value, store) {
  store.set(key, { value, createdAt: Date.now() });
  return value;
}

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  process.env.FRONTEND_ORIGIN,
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  }
}));
app.use(express.json({ limit: "1mb" }));

const rateBuckets = new Map();

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.ip || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
}

function createRateLimiter({ name, windowMs, max }) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${name}:${clientIp(req)}`;
    const bucket = rateBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({
        ok: false,
        error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      });
      return;
    }

    bucket.count += 1;
    next();
  };
}

function requireDevPassword(req, res, next) {
  const input = String(req.headers["x-dev-password"] || req.query.devPassword || "");

  if (!devPassword) {
    res.status(500).json({
      ok: false,
      message: "DEV_PASSWORD가 서버 환경변수에 설정되지 않았습니다.",
    });
    return;
  }

  if (input !== devPassword) {
    res.status(401).json({
      ok: false,
      message: "관리자 인증이 필요한 API입니다.",
    });
    return;
  }

  next();
}

const aiLimiter = createRateLimiter({ name: "ai", windowMs: 60 * 1000, max: 20 });
const authLimiter = createRateLimiter({ name: "dev-auth", windowMs: 10 * 60 * 1000, max: 10 });
const debugLimiter = createRateLimiter({ name: "debug", windowMs: 60 * 1000, max: 20 });
const reportsLimiter = createRateLimiter({ name: "reports", windowMs: 60 * 1000, max: 40 });

app.use("/api/safety-chat", aiLimiter);
app.use("/api/safety-risk-analysis", aiLimiter);
app.use("/api/dev-auth", authLimiter);
app.use("/api/debug", debugLimiter);
app.use("/api/reports", reportsLimiter);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function weatherCodeText(code) {
  const map = {
    0: "맑음", 1: "대체로 맑음", 2: "부분적으로 흐림", 3: "흐림",
    45: "안개", 48: "짙은 안개", 51: "약한 이슬비", 53: "이슬비", 55: "강한 이슬비",
    61: "약한 비", 63: "비", 65: "강한 비", 71: "약한 눈", 73: "눈", 75: "강한 눈",
    80: "약한 소나기", 81: "소나기", 82: "강한 소나기", 95: "뇌우"
  };
  return map[code] || "날씨 정보";
}

function airGrade(pm25, pm10) {
  const p25 = num(pm25, 0);
  const p10 = num(pm10, 0);
  if (p25 > 75 || p10 > 150) return { label: "매우 나쁨", score: 90 };
  if (p25 > 35 || p10 > 80) return { label: "나쁨", score: 70 };
  if (p25 > 15 || p10 > 30) return { label: "보통", score: 40 };
  return { label: "좋음", score: 10 };
}

function supabaseConfigured() {
  return Boolean(supabaseUrl && supabaseKey);
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
    ...extra,
  };
}

async function supabaseRequest(path, options = {}) {
  if (!supabaseConfigured()) throw new Error("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.");
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: supabaseHeaders(options.headers || {}),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.message || data?.error || `Supabase HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function cleanReportPayload(body = {}) {
  const lat = num(body.lat, NaN);
  const lon = num(body.lon, NaN);
  const schoolLat = num(body.schoolLat, NaN);
  const schoolLon = num(body.schoolLon, NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 33 || lat > 39 || lon < 124 || lon > 132) {
    throw new Error("유효한 한국 좌표의 제보 위치가 필요합니다.");
  }
  const report = {
    school_id: safeString(body.schoolId, 80),
    school_name: safeString(body.schoolName, 120),
    office_code: safeString(body.officeCode, 40),
    office_name: safeString(body.officeName, 120),
    lat,
    lon,
    type: safeString(body.type || "위험 제보", 80),
    severity: safeString(body.severity || "보통", 30),
    memo: safeString(body.memo, 500),
    location_label: safeString(body.locationLabel || "제보 위치", 160),
    source: "gilnuri-web",
  };
  if (Number.isFinite(schoolLat) && Number.isFinite(schoolLon)) {
    report.school_lat = schoolLat;
    report.school_lon = schoolLon;
  }
  if (!report.school_id && !report.school_name) throw new Error("제보를 연결할 학교 정보가 필요합니다.");
  return report;
}

function normalizeReport(row = {}) {
  return {
    id: row.id,
    schoolId: row.school_id || "",
    schoolName: row.school_name || "",
    officeCode: row.office_code || "",
    officeName: row.office_name || "",
    lat: num(row.lat, 0),
    lon: num(row.lon, 0),
    type: row.type || "위험 제보",
    severity: row.severity || "보통",
    memo: row.memo || "",
    locationLabel: row.location_label || "제보 위치",
    source: row.source || "shared",
    createdAt: row.created_at || "",
  };
}

function compactPayload(body) {
  const school = body.school || {};
  const office = body.office || {};
  const origin = body.origin || null;
  const route = body.route || {};
  const routeMetrics = body.routeMetrics || null;
  const protectionZoneAnalysis = body.protectionZoneAnalysis || null;
  const reportAnalysis = body.reportAnalysis || body.userReportAnalysis || null;
  const weather = body.weather?.current || {};
  const air = body.air?.current || {};
  const weatherCode = num(weather.weather_code, 0);

  return {
    office: { name: office.name || "선택 지역", code: office.code || "unknown" },
    school: {
      id: school.id || school.schoolId || school.SD_SCHUL_CODE || "",
      name: school.name || "선택 학교",
      type: school.type || "학교",
      address: school.address || "",
      lat: num(school.lat, 0),
      lon: num(school.lon, 0),
      crosswalkRisk: num(school.crosswalkRisk, 50),
      roadRisk: num(school.roadRisk, 50),
      speedRisk: num(school.speedRisk, 50),
      zoneScore: num(school.zoneScore, 60),
      sidewalkScore: num(school.sidewalkScore, 60),
      lightingScore: num(school.lightingScore, 60),
      accidentSpots: num(school.accidentSpots, 2)
    },
    origin: origin ? { label: origin.label || "출발지", lat: num(origin.lat, 0), lon: num(origin.lon, 0) } : null,
    route: { title: route.title || "선택 경로", name: route.name || "경로", description: route.description || "" },
    routeMetrics: routeMetrics ? { routeKm: num(routeMetrics.routeKm, 0), minutes: num(routeMetrics.minutes, 0) } : null,
    protectionZoneAnalysis: protectionZoneAnalysis ? {
      radiusMeters: num(protectionZoneAnalysis.radiusMeters, 500),
      count: num(protectionZoneAnalysis.count, 0),
      cctvTotal: num(protectionZoneAnalysis.cctvTotal, 0),
      averageRoadWidth: num(protectionZoneAnalysis.averageRoadWidth, 0),
      narrowRoadCount: num(protectionZoneAnalysis.narrowRoadCount, 0),
      noCctvCount: num(protectionZoneAnalysis.noCctvCount, 0),
      infrastructureScore: num(protectionZoneAnalysis.infrastructureScore, 0),
      riskPenalty: num(protectionZoneAnalysis.riskPenalty, 0),
      nearby: Array.isArray(protectionZoneAnalysis.nearby) ? protectionZoneAnalysis.nearby.slice(0, 8).map((zone) => ({
        facilityName: zone.facilityName || "",
        facilityType: zone.facilityType || "",
        distanceMeters: Math.round(num(zone.distanceKm, 0) * 1000),
        cctvCount: num(zone.cctvCount, 0),
        roadWidth: num(zone.roadWidth, 0),
        cctvInstalled: zone.cctvInstalled || ""
      })) : []
    } : null,
    reportAnalysis: reportAnalysis ? {
      count: num(reportAnalysis.count, 0),
      highRiskCount: num(reportAnalysis.highRiskCount, 0),
      penalty: num(reportAnalysis.penalty, 0),
      centerLabel: reportAnalysis.centerLabel || "분석 반경",
      nearby: Array.isArray(reportAnalysis.nearby) ? reportAnalysis.nearby.slice(0, 8).map((report) => ({
        type: report.type || "위험 제보",
        memo: report.memo || "",
        distanceMeters: Math.round(num(report.distanceKm, 0) * 1000),
        locationLabel: report.locationLabel || "제보 위치"
      })) : []
    } : null,
    weather: {
      temperature: num(weather.temperature_2m, 15),
      precipitation: num(weather.precipitation, 0),
      rain: num(weather.rain, 0),
      weatherCode,
      weatherText: weatherCodeText(weatherCode),
      windSpeed: num(weather.wind_speed_10m, 0)
    },
    air: {
      pm25: num(air.pm2_5, 0),
      pm10: num(air.pm10, 0),
      usAqi: num(air.us_aqi, 0),
      grade: airGrade(air.pm2_5, air.pm10).label
    },
    currentHourKst: Number(new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", hour12: false }))
  };
}

function analyzeProtectionZoneRisk(protectionZoneAnalysis) {
  const analysis = protectionZoneAnalysis || null;
  if (!analysis) {
    return {
      score: 4,
      bonus: 0,
      signals: ["어린이보호구역 데이터 미연결로 학교 주변 안전 인프라 판단 한계 존재"]
    };
  }

  const signals = [];
  let score = 0;
  let bonus = 0;

  if (analysis.count > 0) {
    bonus += Math.min(analysis.count * 3, 12);
    signals.push(`반경 ${analysis.radiusMeters}m 안 보호구역 ${analysis.count}곳 확인`);
  } else {
    score += 8;
    signals.push(`반경 ${analysis.radiusMeters}m 안 매칭된 보호구역이 없어 보행 안전 인프라 확인 필요`);
  }

  if (analysis.cctvTotal > 0) {
    bonus += Math.min(analysis.cctvTotal * 1.8, 14);
    signals.push(`주변 보호구역 CCTV ${analysis.cctvTotal}대 확인`);
  } else if (analysis.count > 0) {
    score += 7;
    signals.push("반경 내 보호구역에 CCTV 수가 부족하거나 미기재됨");
  }

  if (analysis.narrowRoadCount > 0) {
    score += analysis.narrowRoadCount * 7;
    signals.push(`도로폭이 좁은 보호구역 ${analysis.narrowRoadCount}곳 확인`);
  }

  if (analysis.noCctvCount > 0) {
    score += analysis.noCctvCount * 4;
    signals.push(`CCTV가 없거나 미기재된 보호구역 ${analysis.noCctvCount}곳 확인`);
  }

  if (analysis.averageRoadWidth > 0 && analysis.averageRoadWidth < 6) {
    score += 8;
    signals.push(`평균 보호구역 도로폭 ${analysis.averageRoadWidth.toFixed(1)}m로 좁은 편`);
  }

  return {
    score: clamp(score - bonus * 0.35, 0, 35),
    bonus: clamp(bonus, 0, 25),
    signals: signals.slice(0, 5)
  };
}

function analyzeAcademicScheduleRisk(schedule) {
  const items = Array.isArray(schedule?.items) ? schedule.items : [];
  const signals = [];
  let score = 0;

  for (const item of items.slice(0, 12)) {
    const name = String(item.eventName || "");
    const date = String(item.date || "");
    const mmdd = date.length === 8 ? `${date.slice(4, 6)}/${date.slice(6, 8)}` : date;

    if (name.includes("토요휴업") || name.includes("휴업") || name.includes("방학")) {
      signals.push(`${mmdd} ${name}: 일반 등교 여부 확인 필요`);
      continue;
    }
    if (name.includes("체험") || name.includes("수련") || name.includes("현장")) {
      score += 12;
      signals.push(`${mmdd} ${name}: 평소와 다른 이동·집합 가능성`);
      continue;
    }
    if (name.includes("시험") || name.includes("평가")) {
      score += 9;
      signals.push(`${mmdd} ${name}: 등교 시간 집중 가능성`);
      continue;
    }
    if (name.includes("입학") || name.includes("졸업") || name.includes("개학") || name.includes("방학식") || name.includes("종업")) {
      score += 10;
      signals.push(`${mmdd} ${name}: 보호자 차량·정문 혼잡 가능성`);
      continue;
    }
    if (name.includes("운동회") || name.includes("축제") || name.includes("행사") || name.includes("진로")) {
      score += 7;
      signals.push(`${mmdd} ${name}: 학교 주변 일시적 혼잡 가능성`);
    }
  }

  return { score: clamp(score, 0, 35), signals: signals.slice(0, 4) };
}

function analyzeReportRisk(reportAnalysis) {
  const analysis = reportAnalysis || null;
  if (!analysis) return { score: 0, signals: [] };
  const score = clamp(num(analysis.penalty, 0), 0, 35);
  const signals = [];
  if (analysis.count > 0) signals.push(`분석 반경 안 위험 제보 ${analysis.count}건 반영`);
  if (analysis.highRiskCount > 0) signals.push(`신호등 고장·불법 주정차 등 고위험 제보 ${analysis.highRiskCount}건 확인`);
  const nearby = Array.isArray(analysis.nearby) ? analysis.nearby.slice(0, 2) : [];
  nearby.forEach((report) => {
    if (report.type) signals.push(`${report.type}: ${report.distanceMeters || 0}m 주변 제보`);
  });
  return { score, signals: signals.slice(0, 4) };
}

function fallbackAnalysis(payload, source = "server-fallback") {
  const rainyCodes = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95];
  const snowCodes = [71, 73, 75];
  const fogCodes = [45, 48];
  const signals = [];
  let weatherScore = 0;
  let trafficScore = 0;

  const weather = payload.weather;
  const air = payload.air;
  const school = payload.school;
  const airInfo = airGrade(air.pm25, air.pm10);
  const scheduleRisk = analyzeAcademicScheduleRisk(payload.academicSchedule);
  const protectionRisk = analyzeProtectionZoneRisk(payload.protectionZoneAnalysis);
  const reportRisk = analyzeReportRisk(payload.reportAnalysis);

  if (weather.precipitation > 0 || weather.rain > 0 || rainyCodes.includes(weather.weatherCode)) {
    weatherScore += 24;
    signals.push("비 또는 젖은 노면으로 미끄럼·시야 저하 위험 증가");
  }
  if (snowCodes.includes(weather.weatherCode) || weather.temperature <= 0) {
    weatherScore += 22;
    signals.push("저온·눈·빙판 가능성으로 보행 안전 주의");
  }
  if (fogCodes.includes(weather.weatherCode)) {
    weatherScore += 16;
    signals.push("안개로 운전자와 보행자 시야 저하 가능");
  }
  if (weather.windSpeed >= 9) {
    weatherScore += 14;
    signals.push("강풍으로 우산 사용과 차도 주변 보행 주의");
  }
  if (weather.temperature >= 30) {
    weatherScore += 12;
    signals.push("고온으로 인한 피로·탈수 위험 증가");
  }
  if (airInfo.score >= 70) {
    weatherScore += 20;
    signals.push(`미세먼지 ${airInfo.label} 수준으로 마스크 착용 권장`);
  } else if (airInfo.score >= 40) {
    weatherScore += 9;
    signals.push("대기질 보통 수준, 민감 학생은 주의");
  }

  if (payload.currentHourKst >= 7 && payload.currentHourKst <= 9) {
    trafficScore += 18;
    signals.push("등교 시간대 차량·보행자 혼잡 가능");
  }
  if (payload.currentHourKst >= 17 && payload.currentHourKst <= 19) {
    trafficScore += 12;
    signals.push("하교·퇴근 시간대 교통 혼잡 가능");
  }
  if (payload.routeMetrics?.routeKm >= 1.5) {
    trafficScore += 13;
    signals.push("도보 이동 거리가 길어 위험 노출 시간이 증가");
  }
  if (school.crosswalkRisk >= 65) {
    trafficScore += 12;
    signals.push("학교 주변 횡단보도 위험도가 높은 편");
  }
  if (school.speedRisk >= 60) {
    trafficScore += 12;
    signals.push("차량 속도 관련 주의가 필요한 지역");
  }
  if (school.roadRisk >= 60) {
    trafficScore += 10;
    signals.push("도로폭·보행환경 위험도가 높은 편");
  }
  if (school.sidewalkScore < 55) {
    trafficScore += 10;
    signals.push("보행로 안전성이 낮아 차도 접근 구간 주의");
  }
  if (school.lightingScore < 55) {
    trafficScore += 8;
    signals.push("조도 안전성이 낮아 어두운 시간대 주의");
  }
  if (!payload.origin) {
    trafficScore += 6;
    signals.push("출발지 미설정으로 실제 통학 경로 분석 한계 존재");
  }

  if (scheduleRisk.score > 0) {
    trafficScore += scheduleRisk.score;
    signals.push(...scheduleRisk.signals);
  } else if (scheduleRisk.signals.length > 0) {
    signals.push(...scheduleRisk.signals.slice(0, 2));
  }

  if (protectionRisk.score > 0) {
    trafficScore += protectionRisk.score;
  }
  if (protectionRisk.bonus > 0) {
    trafficScore -= protectionRisk.bonus * 0.3;
  }
  if (reportRisk.score > 0) {
    trafficScore += reportRisk.score * 0.8;
  }
  signals.push(...protectionRisk.signals.slice(0, 3));
  signals.push(...reportRisk.signals.slice(0, 3));

  const score = clamp(Math.round(weatherScore * 0.58 + trafficScore * 0.42), 0, 45);
  const alertLevel = score >= 34 ? "높음" : score >= 18 ? "보통" : "낮음";
  const hits = signals.slice(0, 5);

  return {
    source,
    score,
    weatherArticleScore: clamp(weatherScore, 0, 100),
    trafficArticleScore: clamp(trafficScore, 0, 100),
    alertLevel,
    hits: hits.length ? hits : ["현재 강한 위험 신호는 낮은 편"],
    summary: hits.length
      ? `${payload.office.name} ${payload.school.name} 주변은 ${hits.slice(0, 2).join(", ")} 신호가 있습니다.`
      : `${payload.office.name} ${payload.school.name} 주변은 현재 기상·교통 위험 신호가 낮은 편입니다.`,
    recommendation: alertLevel === "높음"
      ? "안전 우선 경로를 추천하고, 보호자 확인 또는 여유 있는 출발이 필요합니다."
      : alertLevel === "보통"
        ? "균형 경로 이상을 추천하며, 횡단보도와 차량 진입 구간을 주의하세요."
        : "일반적인 안전 수칙을 지키면 등굣길 위험은 낮은 편입니다.",
    detail: {
      weatherText: payload.weather.weatherText,
      airLabel: payload.air.grade,
      routeKm: payload.routeMetrics?.routeKm || null,
      minutes: payload.routeMetrics?.minutes || null,
      academicScheduleImpact: scheduleRisk.score,
      protectionZoneImpact: protectionRisk.score,
      protectionZoneBonus: protectionRisk.bonus,
      userReportImpact: reportRisk.score
    },
    academicSchedule: payload.academicSchedule || { configured: false, items: [] },
    protectionZoneAnalysis: payload.protectionZoneAnalysis || null,
    reportAnalysis: payload.reportAnalysis || null,
    naverNewsTitles: payload.naverNewsTitles || []
  };
}

function stripHtml(text) {
  return String(text || "")
    .replace(/<[^>]*>/g, " ")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&#39;", "'")
    .split(" ")
    .filter(Boolean)
    .join(" ")
    .trim();
}

function regionKeyword(officeName) {
  return String(officeName || "")
    .replace("특별시교육청", "")
    .replace("광역시교육청", "")
    .replace("특별자치시교육청", "")
    .replace("특별자치도교육청", "")
    .replace("교육청", "")
    .trim();
}

function buildNaverNewsQueries(payload) {
  const region = regionKeyword(payload.office?.name || "");
  const school = payload.school?.name || "";
  return [
    `${region} 등굣길 날씨 호우 강풍 미세먼지`,
    `${region} 교통사고 도로통제 정체 침수`,
    `${region} 어린이보호구역 사고 보행자 안전`,
    `${school} 주변 교통 안전`
  ].filter((item) => item.trim().length > 4);
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

function newsRelevanceScore(news, payload) {
  const title = stripHtml(news.title);
  const description = stripHtml(news.description);
  const text = `${title} ${description}`;
  const region = regionKeyword(payload.office?.name || "");
  const school = payload.school?.name || "";

  const strongRiskWords = [
    "호우", "폭우", "침수", "강풍", "태풍", "돌풍", "대설", "눈", "빙판", "한파", "폭염",
    "미세먼지", "초미세먼지", "황사", "안개", "교통사고", "사고", "통제", "정체", "혼잡",
    "공사", "도로", "보행자", "어린이보호구역", "스쿨존", "등굣길", "통학", "안전주의", "주의보", "경보"
  ];
  const contextWords = ["날씨", "교통", "도로", "출근길", "등교", "등굣길", "하굣길", "학생", "학교", "보행", "버스", "지하철"];
  const techBlockWords = [
    "자율주행", "전기차", "배터리", "모빌리티", "플랫폼", "솔루션", "스타트업", "투자", "주가", "상장",
    "출시", "개발", "기술", "특허", "AI", "인공지능", "로봇", "UAM", "드론", "반도체", "서비스", "앱",
    "협약", "업무협약", "MOU", "채용", "세미나", "컨퍼런스", "박람회", "전시회", "시장", "기업", "실적"
  ];

  let score = 0;
  if (region && text.includes(region)) score += 3;
  if (school && text.includes(school)) score += 4;
  strongRiskWords.forEach((word) => { if (text.includes(word)) score += 3; });
  contextWords.forEach((word) => { if (text.includes(word)) score += 1; });

  const hasStrongRisk = hasAny(text, strongRiskWords);
  const isMostlyTech = hasAny(text, techBlockWords) && !hasStrongRisk;
  if (isMostlyTech) score -= 8;
  if (hasAny(text, ["게임", "연예", "스포츠", "맛집", "여행", "부동산", "분양", "증시", "코인"])) score -= 10;

  return score;
}

function newsPublishedAtMs(pubDate) {
  const parsed = Date.parse(String(pubDate || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isRecentNews(news, recentDays = NEWS_RECENT_DAYS) {
  const publishedAt = newsPublishedAtMs(news.pubDate);
  if (!publishedAt) return false;
  const now = Date.now();
  const windowMs = recentDays * 24 * 60 * 60 * 1000;
  return publishedAt >= now - windowMs && publishedAt <= now + 60 * 60 * 1000;
}

function isUsefulSafetyNews(news, payload) {
  return isRecentNews(news) && newsRelevanceScore(news, payload) >= 4;
} 

async function fetchNaverNewsTitles(payload) {
  if (!naverClientId || !naverClientSecret) return [];

  const queries = buildNaverNewsQueries(payload);
  const cacheKey = `${queries.join("|")}:recent-${NEWS_RECENT_DAYS}d`;
  const cached = getCache(cacheKey, newsCache);
  if (cached) return cached;
  const collected = [];
  const seen = new Set();

  for (const query of queries) {
    try {
      const url = new URL("https://openapi.naver.com/v1/search/news.json");
      url.searchParams.set("query", query);
      url.searchParams.set("display", "5");
      url.searchParams.set("start", "1");
      url.searchParams.set("sort", "date");

      const response = await fetch(url, {
        headers: {
          "X-Naver-Client-Id": naverClientId,
          "X-Naver-Client-Secret": naverClientSecret
        }
      });
      if (!response.ok) continue;
      const data = await response.json();
      const items = Array.isArray(data.items) ? data.items : [];

      for (const item of items) {
        const title = stripHtml(item.title);
        const description = stripHtml(item.description);
        if (!title || seen.has(title)) continue;

        const news = {
          query,
          title,
          description,
          link: item.link || item.originallink || "",
          pubDate: item.pubDate || ""
        };

        if (!isUsefulSafetyNews(news, payload)) continue;

        seen.add(title);
        collected.push({
          ...news,
          publishedAt: newsPublishedAtMs(news.pubDate),
          recentDaysLimit: NEWS_RECENT_DAYS,
          relevanceScore: newsRelevanceScore(news, payload)
        });
        if (collected.length >= 10) return setCache(cacheKey, collected, newsCache);
      }
    } catch (error) {
      console.warn("Naver news fetch failed:", query, error?.message || error);
    }
  }

  return setCache(cacheKey, collected, newsCache);
}

function makeAnalysisCacheKey(payload) {
  return JSON.stringify({
    schoolId: payload.school?.name,
    office: payload.office?.name,
    route: payload.route?.name,
    routeKm: payload.routeMetrics?.routeKm ? Math.round(payload.routeMetrics.routeKm * 10) / 10 : null,
    protectionCount: payload.protectionZoneAnalysis?.count || 0,
    protectionCctv: payload.protectionZoneAnalysis?.cctvTotal || 0,
    protectionNarrow: payload.protectionZoneAnalysis?.narrowRoadCount || 0,
    reportCount: payload.reportAnalysis?.count || 0,
    reportHighRiskCount: payload.reportAnalysis?.highRiskCount || 0,
    reportPenalty: Math.round(payload.reportAnalysis?.penalty || 0),
    weatherCode: payload.weather?.weatherCode,
    precipitation: payload.weather?.precipitation,
    wind: Math.round(payload.weather?.windSpeed || 0),
    pm25: Math.round(payload.air?.pm25 || 0),
    pm10: Math.round(payload.air?.pm10 || 0),
    hour: payload.currentHourKst,
  });
}

function yyyymmddKst(offsetDays = 0) {
  const now = new Date();
  const kstText = now.toLocaleString("en-US", { timeZone: "Asia/Seoul" });
  const kst = new Date(kstText);
  kst.setDate(kst.getDate() + offsetDays);
  const yyyy = String(kst.getFullYear());
  const mm = String(kst.getMonth() + 1).padStart(2, "0");
  const dd = String(kst.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function neisOfficeCode(officeName) {
  return neisOfficeCodeMap[String(officeName || "").trim()] || "";
}

function parseNeisRows(json, key) {
  const block = json?.[key];
  if (!Array.isArray(block)) return [];
  const rowBlock = block.find((item) => Array.isArray(item?.row));
  return rowBlock?.row || [];
}

async function neisFetchJson(path, params) {
  if (!neisApiKey) return null;
  const url = new URL(`https://open.neis.go.kr/hub/${path}`);
  url.searchParams.set("KEY", neisApiKey);
  url.searchParams.set("Type", "json");
  url.searchParams.set("pIndex", "1");
  url.searchParams.set("pSize", "100");
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`NEIS ${path} HTTP ${response.status}`);
  return response.json();
}

function normalizeScheduleRows(rows) {
  return rows.slice(0, 30).map((row) => ({
    date: row.AA_YMD || "",
    eventName: row.EVENT_NM || "",
    eventContent: row.EVENT_CNTNT || "",
    grade1: row.ONE_GRADE_EVENT_YN || "",
    grade2: row.TW_GRADE_EVENT_YN || "",
    grade3: row.THREE_GRADE_EVENT_YN || "",
    grade4: row.FR_GRADE_EVENT_YN || "",
    grade5: row.FIV_GRADE_EVENT_YN || "",
    grade6: row.SIX_GRADE_EVENT_YN || "",
    sourceSchoolCode: row.SD_SCHUL_CODE || ""
  })).filter((item) => item.date || item.eventName);
}

async function lookupNeisSchoolCode(payload) {
  const officeCode = neisOfficeCode(payload.office?.name);
  if (!officeCode || !payload.school?.name || !neisApiKey) return null;
  const cacheKey = `school-info:${officeCode}:${payload.school.name}`;
  const cached = getCache(cacheKey, scheduleCache);
  if (cached) return cached;
  const json = await neisFetchJson("schoolInfo", {
    ATPT_OFCDC_SC_CODE: officeCode,
    SCHUL_NM: payload.school.name
  });
  const rows = parseNeisRows(json, "schoolInfo");
  const selected = rows.find((row) => row.SCHUL_NM === payload.school.name) || rows[0] || null;
  const result = selected ? {
    atptOfcdcScCode: selected.ATPT_OFCDC_SC_CODE,
    sdSchulCode: selected.SD_SCHUL_CODE,
    schulNm: selected.SCHUL_NM
  } : null;
  return setCache(cacheKey, result, scheduleCache);
}

async function fetchNeisSchedule(payload, fromYmd = yyyymmddKst(0), toYmd = yyyymmddKst(7)) {
  if (!neisApiKey) return { configured: false, items: [] };
  const officeCodeFromName = neisOfficeCode(payload.office?.name);
  const schoolIdFromCsv = payload.school?.id || "";
  const attempts = [];
  if (officeCodeFromName && schoolIdFromCsv) {
    attempts.push({ officeCode: officeCodeFromName, schoolCode: schoolIdFromCsv, method: "csv-school-id" });
  }
  try {
    const lookedUp = await lookupNeisSchoolCode(payload);
    if (lookedUp?.atptOfcdcScCode && lookedUp?.sdSchulCode) {
      attempts.push({ officeCode: lookedUp.atptOfcdcScCode, schoolCode: lookedUp.sdSchulCode, method: "schoolInfo-lookup" });
    }
  } catch (error) {
    console.warn("NEIS schoolInfo lookup failed:", error?.message || error);
  }
  const uniqueAttempts = attempts.filter((item, index, arr) => arr.findIndex((other) => other.officeCode === item.officeCode && other.schoolCode === item.schoolCode) === index);
  const cacheKey = `schedule:${uniqueAttempts.map((a) => `${a.officeCode}:${a.schoolCode}`).join("|")}:${fromYmd}:${toYmd}`;
  const cached = getCache(cacheKey, scheduleCache);
  if (cached) return cached;
  for (const attempt of uniqueAttempts) {
    try {
      const json = await neisFetchJson("SchoolSchedule", {
        ATPT_OFCDC_SC_CODE: attempt.officeCode,
        SD_SCHUL_CODE: attempt.schoolCode,
        AA_FROM_YMD: fromYmd,
        AA_TO_YMD: toYmd
      });
      const rows = parseNeisRows(json, "SchoolSchedule");
      if (rows.length) {
        return setCache(cacheKey, {
          configured: true,
          fromYmd,
          toYmd,
          method: attempt.method,
          atptOfcdcScCode: attempt.officeCode,
          sdSchulCode: attempt.schoolCode,
          items: normalizeScheduleRows(rows)
        }, scheduleCache);
      }
    } catch (error) {
      console.warn("NEIS schedule fetch failed:", attempt, error?.message || error);
    }
  }
  return setCache(cacheKey, {
    configured: true,
    fromYmd,
    toYmd,
    method: uniqueAttempts.length ? "not-found" : "no-code",
    atptOfcdcScCode: officeCodeFromName,
    sdSchulCode: schoolIdFromCsv,
    items: []
  }, scheduleCache);
}

function parseJsonFromText(text) {
  try {
    return JSON.parse(text);
  } catch {
    const raw = String(text || "");
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end < 0 || end <= start) throw new Error("Gemini 응답에서 JSON을 찾지 못했습니다.");
    return JSON.parse(raw.slice(start, end + 1));
  }
}

function normalizeGeminiResult(parsed, payload) {
  const fallback = fallbackAnalysis(payload, "server-fallback-for-missing-fields");
  const hits = Array.isArray(parsed.hits) ? parsed.hits.map(String).filter(Boolean).slice(0, 5) : fallback.hits;
  return {
    source: "server-gemini",
    score: clamp(Math.round(num(parsed.score, fallback.score)), 0, 45),
    weatherArticleScore: clamp(Math.round(num(parsed.weatherArticleScore, fallback.weatherArticleScore)), 0, 100),
    trafficArticleScore: clamp(Math.round(num(parsed.trafficArticleScore, fallback.trafficArticleScore)), 0, 100),
    alertLevel: ["낮음", "보통", "높음"].includes(parsed.alertLevel) ? parsed.alertLevel : fallback.alertLevel,
    hits,
    summary: parsed.summary || fallback.summary,
    recommendation: parsed.recommendation || fallback.recommendation,
    detail: {
      ...(parsed.detail && typeof parsed.detail === "object" ? parsed.detail : {}),
      model: geminiModel
    }
  };
}

async function runGeminiAnalysis(payload) {
  if (!ai) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");

  const analysisCacheKey = makeAnalysisCacheKey(payload);
  const cachedAnalysis = getCache(analysisCacheKey, analysisCache);
  if (cachedAnalysis) return { ...cachedAnalysis, source: `${cachedAnalysis.source}-cached` };

  const newsItems = await fetchNaverNewsTitles(payload);
  const academicSchedule = await fetchNeisSchedule(payload);
  const enrichedPayload = { ...payload, naverNewsTitles: newsItems, academicSchedule };

  const prompt = `
너는 초등학생·중학생 등굣길 안전을 분석하는 AI다.
외부 검색은 사용하지 말고, 아래에 제공된 실시간 날씨/미세먼지/학교/경로 데이터, 어린이보호구역 실제 분석값, 사용자 위험 제보 분석값, 네이버 뉴스 API로 수집한 기사 제목, NEIS 학사일정만 바탕으로 등굣길 위험을 점수화하라.

반드시 JSON만 반환하라. 마크다운, 코드블록, 설명문 금지.
스키마:
{
  "score": 0에서 45 사이 정수,
  "weatherArticleScore": 0에서 100 사이 정수,
  "trafficArticleScore": 0에서 100 사이 정수,
  "alertLevel": "낮음" 또는 "보통" 또는 "높음",
  "hits": ["주요 위험 신호 1", "주요 위험 신호 2"],
  "summary": "학생과 보호자가 이해하기 쉬운 1~2문장 요약",
  "recommendation": "오늘 등굣길 추천 행동",
  "detail": {
    "weatherReason": "기상 판단 근거",
    "trafficReason": "교통 판단 근거"
  }
}

판단 기준:
- 실시간 날씨와 미세먼지를 확정 데이터로 우선 반영한다.
- 네이버 뉴스 제목은 보조 위험 신호로만 사용한다.
- 뉴스 제목에 호우, 폭우, 침수, 강풍, 미세먼지, 황사, 폭염, 한파, 교통사고, 통제, 정체, 공사 등이 있으면 위험 신호로 반영한다.
- 학교 주변 위험 지표, 출발지-학교 거리, 현재 시간대를 함께 반영한다.
- 어린이보호구역 분석값에 보호구역 수, CCTV 수, 좁은 도로 수가 있으면 보행 안전 인프라 근거로 반영한다.
- 사용자 위험 제보 분석값에 신호등 고장, 불법 주정차, 시야 방해, 보도 파손 등이 있으면 현재 경로 주변 위험 신호로 반영한다.
- CCTV가 많고 보호구역이 확인되면 위험을 낮추되, 좁은 도로 또는 CCTV 미기재 보호구역이 많으면 위험을 높인다.
- 네이버 뉴스 제목이 부족하거나 관련성이 낮으면 실시간 날씨/미세먼지/학교 위험 지표 중심으로 판단한다.
- NEIS 학사일정에 시험, 입학식, 졸업식, 체험학습, 운동회, 학교 행사, 방학식, 개학식 등이 있으면 등교 혼잡이나 이동 패턴 변화를 보조 위험 신호로 반영한다.
- 학생 안전 서비스이므로 불확실하면 과도하게 단정하지 말고 주의 필요 수준으로 표현한다.

분석 데이터:
${JSON.stringify(enrichedPayload, null, 2)}
`;

  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.2,
      systemInstruction: "너는 학생 등굣길 안전을 분석하는 한국어 AI다. 반드시 유효한 JSON만 출력한다."
    }
  });

  const parsed = parseJsonFromText(response.text || "{}");
  const result = normalizeGeminiResult(parsed, payload);
  result.detail = { ...(result.detail || {}), naverNewsCount: newsItems.length, academicScheduleCount: academicSchedule.items?.length || 0, protectionZoneCount: payload.protectionZoneAnalysis?.count || 0, protectionCctvTotal: payload.protectionZoneAnalysis?.cctvTotal || 0, userReportCount: payload.reportAnalysis?.count || 0, userReportPenalty: payload.reportAnalysis?.penalty || 0 };
  result.naverNewsTitles = newsItems;
  result.academicSchedule = academicSchedule;
  result.protectionZoneAnalysis = payload.protectionZoneAnalysis || null;
  result.reportAnalysis = payload.reportAnalysis || null;
  return setCache(analysisCacheKey, result, analysisCache);
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "safe-commute-ai-gemini-backend",
    model: geminiModel,
    geminiKeyConfigured: Boolean(geminiApiKey),
    naverKeyConfigured: Boolean(naverClientId && naverClientSecret),
    newsRecentDays: NEWS_RECENT_DAYS,
    neisKeyConfigured: Boolean(neisApiKey),
    devPasswordConfigured: Boolean(devPassword),
    supabaseConfigured: supabaseConfigured(),
    reportsTable,
    cache: {
      analysis: analysisCache.size,
      news: newsCache.size,
      schedule: scheduleCache.size,
      ttlMinutes: CACHE_TTL_MS / 60000,
      scheduleTtlMinutes: SCHEDULE_CACHE_TTL_MS / 60000
    }
  });
});

app.post("/api/dev-auth", (req, res) => {
  const input = String(req.body?.password || "");

  if (!devPassword) {
    res.status(500).json({
      ok: false,
      message: "DEV_PASSWORD가 서버 환경변수에 설정되지 않았습니다.",
    });
    return;
  }

  if (input !== devPassword) {
    res.status(401).json({
      ok: false,
      message: "관리자 비밀번호가 올바르지 않습니다.",
    });
    return;
  }

  res.json({ ok: true });
});

app.get("/api/reports", async (req, res) => {
  try {
    const schoolId = safeString(req.query.schoolId, 80);
    const schoolName = safeString(req.query.schoolName, 120);
    const officeCode = safeString(req.query.officeCode, 40);
    const limit = clamp(num(req.query.limit, 100), 1, 300);
    const sinceDays = clamp(num(req.query.sinceDays, 30), 1, 365);
    const sinceIso = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("created_at", `gte.${sinceIso}`);
    params.set("order", "created_at.desc");
    params.set("limit", String(limit));
    if (schoolId) params.set("school_id", `eq.${schoolId}`);
    else if (schoolName) params.set("school_name", `eq.${schoolName}`);
    if (officeCode) params.set("office_code", `eq.${officeCode}`);

    const rows = await supabaseRequest(`${reportsTable}?${params.toString()}`, { method: "GET", headers: { Prefer: "" } });
    res.json({ ok: true, source: "supabase", count: Array.isArray(rows) ? rows.length : 0, reports: Array.isArray(rows) ? rows.map(normalizeReport) : [] });
  } catch (error) {
    console.error("Shared reports fetch failed:", error?.message || error);
    res.status(500).json({ ok: false, error: error?.message || "공유 제보 조회 실패", reports: [] });
  }
});

app.post("/api/reports", async (req, res) => {
  try {
    const report = cleanReportPayload(req.body || {});
    const rows = await supabaseRequest(reportsTable, {
      method: "POST",
      body: JSON.stringify(report),
    });
    const saved = Array.isArray(rows) ? rows[0] : rows;
    res.status(201).json({ ok: true, source: "supabase", report: normalizeReport(saved) });
  } catch (error) {
    console.error("Shared report save failed:", error?.message || error);
    res.status(400).json({ ok: false, error: error?.message || "공유 제보 저장 실패" });
  }
});

app.delete("/api/reports/:id", requireDevPassword, async (req, res) => {
  try {
    const id = safeString(req.params.id, 80);
    if (!id) throw new Error("삭제할 제보 ID가 필요합니다.");
    const params = new URLSearchParams();
    params.set("id", `eq.${id}`);
    const rows = await supabaseRequest(`${reportsTable}?${params.toString()}`, {
      method: "DELETE",
    });
    res.json({ ok: true, source: "supabase", deleted: Array.isArray(rows) ? rows.length : 0 });
  } catch (error) {
    console.error("Shared report delete failed:", error?.message || error);
    res.status(400).json({ ok: false, error: error?.message || "공유 제보 삭제 실패" });
  }
});

app.get("/api/debug/news", requireDevPassword, async (req, res) => {
  const officeName = String(req.query.office || "서울특별시교육청");
  const schoolName = String(req.query.school || "서울가온초등학교");
  const payload = {
    office: { name: officeName, code: "debug" },
    school: { name: schoolName }
  };
  const queries = buildNaverNewsQueries(payload);
  const items = await fetchNaverNewsTitles(payload);
  res.json({
    ok: true,
    naverKeyConfigured: Boolean(naverClientId && naverClientSecret),
    queries,
    recentDays: NEWS_RECENT_DAYS,
    count: items.length,
    items
  });
});

function parseRoutePoint(text) {
  const [latRaw, lonRaw] = String(text || "").split(",");
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < 33 || lat > 39 || lon < 124 || lon > 132) return null;
  return { lat, lon };
}

function routeDistanceKmFromGeometry(points) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const r = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lon - a.lon) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    total += 2 * r * Math.asin(Math.sqrt(h));
  }
  return total;
}

function fallbackFootRoute(points) {
  const geometry = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    const steps = 12;
    for (let step = 0; step <= steps; step += 1) {
      if (i > 0 && step === 0) continue;
      const ratio = step / steps;
      geometry.push({
        lat: start.lat + (end.lat - start.lat) * ratio,
        lon: start.lon + (end.lon - start.lon) * ratio,
      });
    }
  }
  const distanceKm = routeDistanceKmFromGeometry(geometry);
  return {
    ok: true,
    source: "fallback-straight-route",
    distanceKm,
    durationMinutes: Math.max(1, Math.round((distanceKm / 4.2) * 60)),
    geometry,
  };
}

app.post("/api/foot-route", async (req, res) => {
  const points = Array.isArray(req.body?.points) ? req.body.points.map((item) => parseRoutePoint(`${item.lat},${item.lon}`)).filter(Boolean) : [];
  if (points.length < 2 || points.length > 5) {
    res.status(400).json({ ok: false, error: "경로 계산에는 2~5개의 좌표가 필요합니다." });
    return;
  }

  const cacheKey = `foot-route:${points.map((p) => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`).join(";")}`;
  const cached = getCache(cacheKey, analysisCache, 24 * 60 * 60 * 1000);
  if (cached) {
    res.json({ ...cached, cached: true });
    return;
  }

  try {
    const coords = points.map((point) => `${point.lon},${point.lat}`).join(";");
    const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coords}?overview=full&geometries=geojson&steps=false&alternatives=false`;
    const response = await fetch(url, {
      headers: { "User-Agent": "safe-route-ai-student-project/1.0" },
    });
    if (!response.ok) throw new Error(`OSRM HTTP ${response.status}`);
    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) throw new Error("OSRM route not found");

    const geometry = Array.isArray(route.geometry?.coordinates)
      ? route.geometry.coordinates.map(([lon, lat]) => ({ lat: Number(lat), lon: Number(lon) })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
      : points;

    const result = {
      ok: true,
      source: "osrm-foot",
      distanceKm: Number(route.distance || 0) / 1000,
      durationMinutes: Math.max(1, Math.round(Number(route.duration || 0) / 60)),
      geometry,
    };
    res.json(setCache(cacheKey, result, analysisCache));
  } catch (error) {
    console.warn("Foot route failed:", error?.message || error);
    const fallback = { ...fallbackFootRoute(points), warning: error?.message || "OSRM 경로 계산 실패" };
    res.json(setCache(cacheKey, fallback, analysisCache));
  }
});

function parseLatLonFromQuery(req) {
  const lat = Number(req.query.lat ?? req.query.latitude);
  const lon = Number(req.query.lon ?? req.query.lng ?? req.query.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < 33 || lat > 39 || lon < 124 || lon > 132) return null;
  return { lat, lon };
}

app.get("/api/weather", async (req, res) => {
  const point = parseLatLonFromQuery(req);
  if (!point) {
    res.status(400).json({ ok: false, error: "날씨 조회에는 유효한 한국 좌표 lat/lon이 필요합니다." });
    return;
  }

  const cacheKey = `weather:${point.lat.toFixed(5)},${point.lon.toFixed(5)}`;
  const cached = getCache(cacheKey, analysisCache, 10 * 60 * 1000);
  if (cached) {
    res.json({ ...cached, cached: true });
    return;
  }

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(point.lat));
    url.searchParams.set("longitude", String(point.lon));
    url.searchParams.set("current", "temperature_2m,precipitation,rain,weather_code,wind_speed_10m");
    url.searchParams.set("timezone", "Asia/Seoul");

    const response = await fetch(url, {
      headers: { "User-Agent": "safe-route-ai-student-project/1.0" },
    });
    if (!response.ok) throw new Error(`Open-Meteo weather HTTP ${response.status}`);

    const data = await response.json();
    const result = { ok: true, source: "open-meteo-weather", ...data };
    res.json(setCache(cacheKey, result, analysisCache));
  } catch (error) {
    console.error("Weather fetch failed:", error?.message || error);
    res.json({
      ok: false,
      source: "weather-fallback",
      error: error?.message || "날씨 조회 실패",
      current: {
        temperature_2m: 15,
        precipitation: 0,
        rain: 0,
        weather_code: 0,
        wind_speed_10m: 0,
      },
    });
  }
});

app.get("/api/air-quality", async (req, res) => {
  const point = parseLatLonFromQuery(req);
  if (!point) {
    res.status(400).json({ ok: false, error: "대기질 조회에는 유효한 한국 좌표 lat/lon이 필요합니다." });
    return;
  }

  const cacheKey = `air-quality:${point.lat.toFixed(5)},${point.lon.toFixed(5)}`;
  const cached = getCache(cacheKey, analysisCache, 10 * 60 * 1000);
  if (cached) {
    res.json({ ...cached, cached: true });
    return;
  }

  try {
    const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    url.searchParams.set("latitude", String(point.lat));
    url.searchParams.set("longitude", String(point.lon));
    url.searchParams.set("current", "pm10,pm2_5,us_aqi");
    url.searchParams.set("timezone", "Asia/Seoul");

    const response = await fetch(url, {
      headers: { "User-Agent": "safe-route-ai-student-project/1.0" },
    });
    if (!response.ok) throw new Error(`Open-Meteo air HTTP ${response.status}`);

    const data = await response.json();
    const result = { ok: true, source: "open-meteo-air-quality", ...data };
    res.json(setCache(cacheKey, result, analysisCache));
  } catch (error) {
    console.error("Air quality fetch failed:", error?.message || error);
    res.json({
      ok: false,
      source: "air-quality-fallback",
      error: error?.message || "대기질 조회 실패",
      current: {
        pm10: 10,
        pm2_5: 5,
        us_aqi: 20,
      },
    });
  }
});

app.get("/api/geocode", async (req, res) => {
  const query = safeString(req.query.q, 300);
  if (!query) {
    res.status(400).json({ ok: false, error: "검색할 주소를 입력해 주세요." });
    return;
  }

  const cacheKey = `geocode:${query}`;
  const cached = getCache(cacheKey, analysisCache, 24 * 60 * 60 * 1000);
  if (cached) {
    res.json({ ...cached, cached: true });
    return;
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("q", query);
    url.searchParams.set("countrycodes", "kr");
    url.searchParams.set("limit", "5");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url, {
      headers: {
        "User-Agent": "safe-route-ai-student-project/1.0",
        "Accept-Language": "ko,en;q=0.8",
      },
    });

    if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);

    const data = await response.json();
    const results = Array.isArray(data)
      ? data.map((item) => ({
          label: item.display_name || query,
          lat: Number(item.lat),
          lon: Number(item.lon),
          type: item.type || item.class || "address",
          importance: Number(item.importance || 0),
        })).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon))
      : [];

    const result = { ok: true, query, count: results.length, results };
    res.json(setCache(cacheKey, result, analysisCache));
  } catch (error) {
    console.error("Geocode failed:", error?.message || error);
    res.json({ ok: false, query, error: error?.message || "주소 검색 실패", results: [] });
  }
});

app.get("/api/debug/schedule", requireDevPassword, async (req, res) => {
  const officeName = String(req.query.office || "서울특별시교육청");
  const schoolName = String(req.query.school || "남서울중학교");
  const schoolId = String(req.query.schoolId || "B000008405");
  const payload = {
    office: { name: officeName, code: "debug" },
    school: { id: schoolId, name: schoolName, address: "" }
  };
  const schedule = await fetchNeisSchedule(payload);
  res.json({
    ok: true,
    neisKeyConfigured: Boolean(neisApiKey),
    officeName,
    schoolName,
    schoolId,
    schedule
  });
});

function safeString(value, maxLength = 1200) {
  const normalized = String(value || "")
    .replaceAll(String.fromCharCode(10), " ")
    .replaceAll(String.fromCharCode(13), " ")
    .split(" ")
    .filter(Boolean)
    .join(" ")
    .trim();
  return normalized.slice(0, maxLength);
}

function localChatAnswer(question, context = {}) {
  const q = safeString(question, 500);
  const schoolName = context.school?.name || "선택 학교";
  const weatherText = context.weather?.weatherText || context.weather?.label || "분석 전";
  const airLabel = context.weather?.air || "분석 전";
  const route = context.route || null;
  const protection = context.protection || {};
  const reports = context.reports || {};
  const aiRisk = context.aiRisk || {};
  const safetyScore = context.safetyScore ?? context.score;
  const safetyTone = context.safetyTone || safetyToneFromScore(safetyScore);

  if (!q) return "질문을 입력해 주세요.";
  if (q.includes("점수") || q.includes("단계") || q.includes("위험") || q.includes("안전")) {
    return `현재 ${schoolName}의 길누리 종합 안전 점수는 ${safetyScore ?? "분석 전"}점이고, 판정은 '${safetyTone.label}' 단계입니다. 이 점수는 위험 점수가 아니라 안전 점수라서 높을수록 안전하며, 0~54점은 위험, 55~74점은 주의, 75~100점은 안전으로 해석합니다.`;
  }
  if (q.includes("마스크") || q.includes("미세먼지") || q.includes("공기")) {
    if (["나쁨", "매우 나쁨"].includes(airLabel)) return `현재 ${schoolName} 주변 대기질은 ${airLabel} 수준입니다. 등굣길에는 마스크를 착용하고, 오래 뛰거나 장시간 실외활동은 줄이는 것이 좋습니다.`;
    if (airLabel === "보통") return "현재 대기질은 보통 수준입니다. 민감한 학생이라면 마스크를 준비하는 것이 좋고, 일반 학생은 기본 보행 안전수칙을 지키면 됩니다.";
    return "현재 대기질 위험 신호는 높지 않은 편입니다. 다만 개인 호흡기 상태에 따라 마스크를 준비할 수 있습니다.";
  }
  if (q.includes("우산") || q.includes("비") || q.includes("눈") || q.includes("날씨")) {
    return `${schoolName} 주변 날씨는 ${weatherText}입니다. 비·눈·강풍이 있으면 미끄럼, 우산으로 인한 시야 가림, 차량 접근에 특히 주의하세요.`;
  }
  if (q.includes("경로") || q.includes("길") || q.includes("거리") || q.includes("시간")) {
    if (route?.routeKm && route?.minutes) return `현재 선택 경로는 약 ${Number(route.routeKm).toFixed(2)}km, 도보 약 ${route.minutes}분입니다. 안전 점수가 낮거나 날씨가 좋지 않으면 빠른 경로보다 안전 우선 경로를 선택하는 것이 좋습니다.`;
    return "출발지를 먼저 설정하면 실제 도보 거리와 예상 시간을 바탕으로 경로 안내를 받을 수 있습니다.";
  }
  if (q.includes("보호구역") || q.includes("CCTV") || q.includes("스쿨존")) {
    return `현재 분석 반경 안 보호구역은 ${protection.count || 0}곳, CCTV는 ${protection.cctvTotal || 0}대로 확인됩니다. 좁은 도로나 CCTV 미설치 구간이 있으면 횡단 전 좌우 확인을 더 철저히 해야 합니다.`;
  }
  if (q.includes("제보") || q.includes("사고") || q.includes("주정차")) {
    return `현재 반영된 위험 제보는 ${reports.count || 0}건이며, 고위험 제보는 ${reports.highRiskCount || 0}건입니다. 신호등 고장, 불법 주정차, 시야 방해 제보는 등굣길 위험을 높이는 요소로 반영됩니다.`;
  }
  if (aiRisk.recommendation) return `${aiRisk.recommendation} 참고로 현재 안전 점수는 ${safetyScore ?? "분석 전"}점, '${safetyTone.label}' 단계입니다.`;
  return `현재 ${schoolName}의 종합 안전 점수는 ${safetyScore ?? "분석 전"}점이고, '${safetyTone.label}' 단계입니다. 오늘 안전 분석을 실행하면 날씨, 미세먼지, 보호구역, 학사일정, 뉴스 신호를 종합한 더 구체적인 권고를 받을 수 있습니다.`;
}

function safetyToneFromScore(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return { label: "분석 전", description: "아직 안전 점수가 계산되지 않았습니다." };
  if (value >= 75) return { label: "안전", description: "전반적으로 안전한 편입니다." };
  if (value >= 55) return { label: "주의", description: "일부 위험 요인이 있어 주의가 필요합니다." };
  return { label: "위험", description: "위험 요인이 비교적 크게 반영되어 각별한 주의가 필요합니다." };
}

function sanitizeChatContext(context = {}) {
  const score = context.score ?? null;
  return {
    school: context.school || null,
    origin: context.origin || null,
    score,
    safetyScore: score,
    safetyTone: safetyToneFromScore(score),
    scoreSystem: {
      name: "길누리 종합 안전 점수",
      direction: "높을수록 안전, 낮을수록 위험",
      ranges: [
        { min: 75, max: 100, label: "안전" },
        { min: 55, max: 74, label: "주의" },
        { min: 0, max: 54, label: "위험" }
      ],
      warning: "앱의 0~100점 score는 위험 점수가 아니라 안전 점수다. 55~74점은 주의 단계이고 54점 이하는 위험 단계다."
    },
    weather: context.weather || null,
    aiRisk: context.aiRisk || null,
    protection: context.protection || null,
    reports: context.reports || null,
    route: context.route || null,
  };
}

app.post("/api/safety-chat", async (req, res) => {
  const question = safeString(req.body?.question, 700);
  const context = sanitizeChatContext(req.body?.context || {});
  const history = Array.isArray(req.body?.history)
    ? req.body.history.slice(-6).map((item) => ({
        role: item.role === "user" ? "user" : "assistant",
        content: safeString(item.content, 500),
      }))
    : [];

  if (!question) {
    res.json({ source: "server-fallback", answer: "질문을 입력해 주세요." });
    return;
  }

  if (!ai) {
    res.json({ source: "server-fallback-no-gemini", answer: localChatAnswer(question, context) });
    return;
  }

  const cacheKey = JSON.stringify({
    chat: true,
    q: question,
    school: context.school?.name,
    score: context.score,
    route: context.route,
    weather: context.weather,
    ai: context.aiRisk?.summary,
  });
  const cached = getCache(cacheKey, analysisCache);
  if (cached) {
    res.json({ ...cached, source: `${cached.source}-cached` });
    return;
  }

  const prompt = `
너는 길누리의 학생 통학 안전 상담사다.
사용자의 현재 앱 상태와 질문만 바탕으로 답변하라.
외부 검색을 했다고 말하지 마라.
학생과 보호자가 이해하기 쉬운 한국어로 2~4문장 이내로 답하라.
확실하지 않은 내용은 단정하지 말고 "확인 필요" 또는 "주의가 좋다"로 표현하라.
의학적·법적 확정 판단을 하지 말고 안전 수칙 수준으로 안내하라.

점수 체계는 반드시 지켜라.
- context.score 또는 context.safetyScore는 0~100점의 '종합 안전 점수'다. 절대 '위험 점수'라고 부르지 마라.
- 이 점수는 높을수록 안전하고 낮을수록 위험하다.
- 75~100점은 '안전', 55~74점은 '주의', 0~54점은 '위험' 단계다.
- 예를 들어 56점은 '주의 단계'이며, 54점 이하는 '위험 단계'다.
- 날씨가 맑거나 대기질이 보통이어도, 앱 판정이 위험이면 위험 단계임을 먼저 인정하고 이유와 행동 수칙을 설명하라.
- Gemini의 aiRisk.score는 0~45점 보조 위험 점수이며, 앱의 0~100점 종합 안전 점수와 혼동하지 마라.

현재 앱 상태 JSON:
${JSON.stringify(context, null, 2)}

최근 대화:
${JSON.stringify(history, null, 2)}

사용자 질문: ${question}
`;

  try {
    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: {
        temperature: 0.25,
        systemInstruction: "너는 학생 등굣길 안전 상담을 하는 한국어 AI다. 제공된 앱 상태 안에서만 안전 권고를 한다.",
      },
    });

    const answer = safeString(response.text, 1200) || localChatAnswer(question, context);
    const result = { source: "server-gemini-chat", answer };
    res.json(setCache(cacheKey, result, analysisCache));
  } catch (error) {
    console.error("Gemini chat failed:", error?.message || error);
    res.json({
      source: "server-fallback-after-gemini-chat-error",
      answer: localChatAnswer(question, context),
      backendWarning: error?.message || "Gemini 상담 실패로 서버 보조 답변을 반환했습니다.",
    });
  }
});

app.post("/api/safety-risk-analysis", async (req, res) => {
  const payload = compactPayload(req.body || {});
  try {
    const result = await runGeminiAnalysis(payload);
    res.json(result);
  } catch (error) {
    console.error("Gemini analysis failed:", error?.message || error);

    let newsItems = [];
    let academicSchedule = { configured: false, items: [] };
    try {
      newsItems = await fetchNaverNewsTitles(payload);
    } catch (newsError) {
      console.warn("Fallback news fetch failed:", newsError?.message || newsError);
    }
    try {
      academicSchedule = await fetchNeisSchedule(payload);
    } catch (scheduleError) {
      console.warn("Fallback NEIS schedule fetch failed:", scheduleError?.message || scheduleError);
    }

    const fallbackPayload = { ...payload, naverNewsTitles: newsItems, academicSchedule };
    res.json({
      ...fallbackAnalysis(fallbackPayload, "server-fallback-after-gemini-error"),
      backendWarning: error?.message || "Gemini 분석 실패로 서버 보조 분석을 반환했습니다."
    });
  }
});

app.listen(port, () => {
  console.log(`Safe Commute AI Gemini backend running on http://localhost:${port}`);
  console.log(`Model: ${geminiModel}`);
  console.log(`Gemini key configured: ${Boolean(geminiApiKey)}`);
});
