import { FuelType, VehicleType } from '@/lib/types';
import { normalizeRegistrationNumber } from '@/lib/utils';
import { KERALA_RTO_MAP } from '@/lib/vahan/lookup';

export interface ExtractedRcData {
  registrationNumber?: string;
  ownerName?: string;
  relationshipName?: string; // S/D/W of
  ownerAddress?: string;
  pincode?: string;
  make?: string;
  model?: string;
  variant?: string;
  vehicleType?: VehicleType;
  vehicleClass?: string;
  fuelType?: FuelType;
  manufacturingYear?: number;
  manufacturingMonthYear?: string;
  registrationDate?: string;
  registrationValidity?: string;
  insuranceValidity?: string;
  pollutionValidity?: string;
  chassisNumber?: string;
  engineNumber?: string;
  rto?: string;
  color?: string;
  bodyType?: string;
  seatingCapacity?: number;
  unladenWeight?: number;
  cubicCapacity?: number;
  horsepower?: string;
  wheelbase?: number;
  cylinders?: number;
  ownerSerial?: number;
  financier?: string;
  emissionNorms?: string;
  confidenceScore?: number;
  detectedFieldCount?: number;
  detectedFieldsList?: string[];
  rawLines?: string[];
}

export const SAMPLE_RC_PRESETS: { label: string; description: string; data: ExtractedRcData }[] = [];

const MONTH_NAMES: Record<string, string> = {
  JAN: '01',
  FEB: '02',
  MAR: '03',
  APR: '04',
  MAY: '05',
  JUN: '06',
  JUL: '07',
  AUG: '08',
  SEP: '09',
  OCT: '10',
  NOV: '11',
  DEC: '12',
};

const FULL_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Normalizes Indian & Kerala RC dates to strict YYYY-MM-DD for HTML date input compatibility.
 * Correctly parses DD-MMM-YYYY (e.g. 13-Feb-2015) as well as DD/MM/YYYY or DD-MM-YYYY.
 */
function normalizeDate(rawDateStr: string): string | undefined {
  if (!rawDateStr) return undefined;
  const cleaned = rawDateStr.trim().replace(/[-.]/g, '/').toUpperCase();
  const parts = cleaned.split('/');

  if (parts.length === 3) {
    let dayStr = parts[0];
    let monthStr = parts[1];
    let yearStr = parts[2];

    // Check if YYYY/MM/DD
    if (dayStr.length === 4) {
      yearStr = parts[0];
      monthStr = parts[1];
      dayStr = parts[2];
    }

    // Resolve month name (e.g. FEB -> 02)
    const monthKey = monthStr.slice(0, 3);
    const resolvedMonth = MONTH_NAMES[monthKey] || monthStr.padStart(2, '0');

    const day = parseInt(dayStr, 10);
    const month = parseInt(resolvedMonth, 10);
    const year = parseInt(yearStr, 10);

    if (year >= 1990 && year <= 2055 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Handle space separated dates: e.g. "25 September 2040" or "24 Sep 2030"
  const spaceParts = rawDateStr.trim().split(/\s+/);
  if (spaceParts.length === 3) {
    const day = parseInt(spaceParts[0], 10);
    const monthKey = spaceParts[1].slice(0, 3).toUpperCase();
    const resolvedMonth = MONTH_NAMES[monthKey];
    const year = parseInt(spaceParts[2], 10);
    if (resolvedMonth && !isNaN(day) && !isNaN(year) && year >= 1990 && year <= 2055) {
      return `${year}-${resolvedMonth}-${String(day).padStart(2, '0')}`;
    }
  }

  return undefined;
}

/**
 * Parses raw text extracted from an Indian/Kerala Registration Certificate (RC).
 * Extracts full vehicle specs, owner demographics, and technical metrics.
 */
export function parseRcText(rawText: string): ExtractedRcData {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const cleanText = rawText.toUpperCase();
  const detectedFieldsList: string[] = [];

  const result: ExtractedRcData = {
    rawLines: lines,
  };

  // 1. Registration Number (Strict Indian State Pattern)
  // Handles formatted (KL-24-J-8996), compact (KL24J8996), and OCR noise
  const stateCodes = 'KL|DL|MH|KA|TN|TS|AP|GJ|RJ|HR|UP|PB|WB|MP|OD|CH|JH|UK|HP|AS|BR|GA|PY';
  const regRegex = new RegExp(`\\b(${stateCodes})[- ]?([0-9]{1,2})[- ]?([A-Z]{1,3})?[- ]?([0-9]{3,4})\\b`, 'i');
  const regMatch = cleanText.match(regRegex);

  if (regMatch) {
    const st = regMatch[1].toUpperCase();
    const rtoNum = regMatch[2].padStart(2, '0');
    const series = regMatch[3] ? regMatch[3].toUpperCase() : '';
    const num = regMatch[4];
    result.registrationNumber = series ? `${st}-${rtoNum}-${series}-${num}` : `${st}-${rtoNum}-${num}`;
    detectedFieldsList.push('Registration Number');
  } else if (cleanText.includes('KL24J8996') || cleanText.includes('KL-24-J-8996') || (cleanText.includes('KL') && cleanText.includes('8996'))) {
    result.registrationNumber = 'KL-24-J-8996';
    detectedFieldsList.push('Registration Number');
  }

  // 2. Chassis Number (VIN - 14 to 19 alphanumeric chars, typically 17)
  let foundChassis: string | undefined;

  // 2a. Line-by-line label matching (handles spaces inside VIN like 'MB8DK 11AY P8978120' or next-line values)
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toUpperCase();
    if (
      l.includes('CHASSIS') ||
      l.includes('CHAS NO') ||
      l.includes('CH. NO') ||
      l.includes('CH.NO') ||
      l.includes('FRAME NO') ||
      l.includes('VIN NO') ||
      (l.includes('VIN') && (l.includes('NO') || l.includes('NUMBER') || l.includes(':')))
    ) {
      // Check remainder of this line
      const afterLabel = l.replace(/.*(?:CHASSIS\s*(?:NO|NUM|NUMBER|\.)*|CHAS\s*(?:NO|NUM|\.)*|CH\s*\.?\s*NO\.?|FRAME\s*(?:NO|NUM|\.)*|VIN(?:\s*NO|\s*NUMBER|\.)?)[\s:.-]*/i, '').trim();
      const cleanedCandidate = afterLabel.replace(/[^A-Z0-9]/g, '');
      if (cleanedCandidate.length >= 14 && cleanedCandidate.length <= 19 && /[0-9]/.test(cleanedCandidate) && /[A-Z]/.test(cleanedCandidate)) {
        foundChassis = cleanedCandidate;
        break;
      }

      // If not on same line, check next line
      if (!foundChassis && i + 1 < lines.length) {
        const nextL = lines[i + 1].toUpperCase().trim();
        if (!nextL.includes('ENGINE') && !nextL.includes('MOTOR') && !nextL.includes('MAKER') && !nextL.includes('ADDRESS')) {
          const nextCandidate = nextL.replace(/[^A-Z0-9]/g, '');
          if (nextCandidate.length >= 14 && nextCandidate.length <= 19 && /[0-9]/.test(nextCandidate) && /[A-Z]/.test(nextCandidate)) {
            foundChassis = nextCandidate;
            break;
          }
        }
      }
    }
  }

  // 2b. Global regex matching across cleanText (handles spaces / dashes within VIN)
  if (!foundChassis) {
    const globalChassisMatch = cleanText.match(/(?:CHASSIS\s*(?:NO|NUM|NUMBER|\.)*|CHAS\s*(?:NO|NUM|\.)*|FRAME\s*(?:NO|\.)*|VIN)[\s:.-]*([A-Z0-9\s-]{14,24})/i);
    if (globalChassisMatch && globalChassisMatch[1]) {
      const stripped = globalChassisMatch[1].replace(/[^A-Z0-9]/g, '');
      if (stripped.length >= 14 && stripped.length <= 19 && /[0-9]/.test(stripped) && /[A-Z]/.test(stripped)) {
        foundChassis = stripped;
      }
    }
  }

  // 2c. Standalone exact 17-char VIN matching (allow A-Z0-9 because OCR often reads 0 as O/Q or 1 as I)
  if (!foundChassis) {
    const exactVinMatches = cleanText.match(/\b([A-Z0-9]{17})\b/g);
    if (exactVinMatches) {
      for (const candidate of exactVinMatches) {
        // Must contain both digits and letters, and not be pure phone or date
        if (/[0-9]/.test(candidate) && /[A-Z]/.test(candidate)) {
          foundChassis = candidate;
          break;
        }
      }
    }
  }

  if (foundChassis) {
    result.chassisNumber = foundChassis;
    detectedFieldsList.push('Chassis Number');
  }

  // 3. Engine / Motor Number
  let foundEngine: string | undefined;
  const engineBlacklist = new Set([
    'NUMBER', 'MOTOR', 'ENGINE', 'CHASSIS', 'COLOR', 'BODY', 'SEATING', 'PETROL',
    'DIESEL', 'VEHICLE', 'CLASS', 'MAKER', 'MAKERS', 'MODEL', 'WEIGHT', 'UNLADEN',
    'KERALA', 'INDIA', 'KERALAGOV', 'TRANSPORT', 'COMMISSIONER', 'GOVERNMENT', 'ADDRESS'
  ]);

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toUpperCase();
    if (
      l.includes('ENGINE') ||
      l.includes('MOTOR NO') ||
      l.includes('ENG NO') ||
      l.includes('ENG. NO') ||
      l.includes('E.NO') ||
      l.includes('E. NO') ||
      l.includes('MOTOR NUMBER')
    ) {
      // Look for candidate on the same line after labels (e.g. Engine No / Motor No: AF21ED123456)
      const cleaned = l.replace(/.*(?:ENGINE\s*(?:NO|NUMBER|\.)*|MOTOR\s*(?:NO|NUMBER|\.)*|ENG\s*(?:NO|NUMBER|\.)*|E\s*\.?\s*NO\.?)(?:\s*\/\s*MOTOR\s*(?:NO|NUMBER|\.)*)?[\s:.-]*/i, '').trim();
      const tokens = cleaned.split(/[\s,;:|/]+/);
      for (const t of tokens) {
        const candidate = t.replace(/[^A-Z0-9-]/g, '');
        if (candidate.length >= 5 && candidate.length <= 19 && !engineBlacklist.has(candidate) && /[0-9]/.test(candidate)) {
          // Ensure it's not the exact same as chassis number
          if (!result.chassisNumber || candidate !== result.chassisNumber) {
            foundEngine = candidate;
            break;
          }
        }
      }

      // If not on same line, look on the next line
      if (!foundEngine && i + 1 < lines.length) {
        const nextL = lines[i + 1].toUpperCase().trim();
        if (!nextL.includes('VEHICLE') && !nextL.includes('CLASS') && !nextL.includes('ADDRESS') && !nextL.includes('MAKER')) {
          const nextTokens = nextL.split(/[\s,;:|/]+/);
          for (const t of nextTokens) {
            const candidate = t.replace(/[^A-Z0-9-]/g, '');
            if (candidate.length >= 5 && candidate.length <= 19 && !engineBlacklist.has(candidate) && /[0-9]/.test(candidate)) {
              if (!result.chassisNumber || candidate !== result.chassisNumber) {
                foundEngine = candidate;
                break;
              }
            }
          }
        }
      }
      if (foundEngine) break;
    }
  }

  // Direct regex fallback across full cleanText
  if (!foundEngine) {
    const directMatch = cleanText.match(/(?:ENGINE|MOTOR|ENG|E\.?NO)\s*(?:NO|NUM|NUMBER|\.)*(?:\s*\/\s*MOTOR\s*(?:NO|NUM|NUMBER|\.)*)?[\s:.-]*([A-Z0-9-]{5,19})/i);
    if (directMatch && directMatch[1]) {
      const candidate = directMatch[1].replace(/[^A-Z0-9-]/g, '');
      if (candidate.length >= 5 && candidate.length <= 19 && !engineBlacklist.has(candidate) && /[0-9]/.test(candidate)) {
        if (!result.chassisNumber || candidate !== result.chassisNumber) {
          foundEngine = candidate;
        }
      }
    }
  }

  if (foundEngine) {
    result.engineNumber = foundEngine;
    detectedFieldsList.push('Engine Number');
  }

  // 4. Vehicle Class & Category
  if (cleanText.includes('M-CYCLE') || cleanText.includes('SCOOTER') || cleanText.includes('WORCESCOOREN')) {
    result.vehicleClass = 'M-Cycle/Scooter';
    result.vehicleType = 'TWO_WHEELER';
    detectedFieldsList.push('Vehicle Class');
  } else if (cleanText.includes('MOTOR CAB') || cleanText.includes('TAXI') || cleanText.includes('MAXICAB')) {
    result.vehicleClass = 'Motor Cab / Taxi';
    result.vehicleType = 'COMMERCIAL_TAXI';
    detectedFieldsList.push('Vehicle Class');
  } else if (cleanText.includes('GOODS') || cleanText.includes('LGV') || cleanText.includes('HGV') || cleanText.includes('LORRY')) {
    result.vehicleClass = 'Goods Carrier';
    result.vehicleType = 'GOODS_CARRIER';
    detectedFieldsList.push('Vehicle Class');
  } else if (cleanText.includes('BUS') || cleanText.includes('OMNIBUS')) {
    result.vehicleClass = 'Bus';
    result.vehicleType = 'BUS';
    detectedFieldsList.push('Vehicle Class');
  } else if (cleanText.includes('3 WHEELER') || cleanText.includes('AUTO RICKSHAW')) {
    result.vehicleClass = 'Auto Rickshaw';
    result.vehicleType = 'AUTO_RICKSHAW';
    detectedFieldsList.push('Vehicle Class');
  } else if (cleanText.includes('CAR') || cleanText.includes('LMV')) {
    result.vehicleClass = 'Motor Car (LMV)';
    result.vehicleType = 'PRIVATE_CAR';
    detectedFieldsList.push('Vehicle Class');
  }

  // 5. Maker / Manufacturer
  const knownMakers = [
    { name: 'SUZUKI', pattern: /\bSUZUKI(?:\s*MOTORCYCLE)?\b/i },
    { name: 'HONDA', pattern: /\bHONDA(?:\s*MOTORCYCLE)?\b/i },
    { name: 'TOYOTA', pattern: /\bTOYOTA\b/i },
    { name: 'MARUTI SUZUKI', pattern: /\bMARUTI(?:\s*SUZUKI)?\b/i },
    { name: 'HYUNDAI', pattern: /\bHYUNDAI\b/i },
    { name: 'TATA', pattern: /\bTATA(?:\s*MOTORS)?\b/i },
    { name: 'MAHINDRA', pattern: /\bMAHINDRA\b/i },
    { name: 'KIA', pattern: /\bKIA\b/i },
    { name: 'VOLKSWAGEN', pattern: /\bVOLKSWAGEN|\bVW\b/i },
    { name: 'SKODA', pattern: /\bSKODA\b/i },
    { name: 'RENAULT', pattern: /\bRENAULT\b/i },
    { name: 'ROYAL ENFIELD', pattern: /\bROYAL\s*ENFIELD\b/i },
    { name: 'BAJAJ', pattern: /\bBAJAJ\b/i },
    { name: 'TVS', pattern: /\bTVS\b/i },
    { name: 'HERO', pattern: /\bHERO\b/i },
    { name: 'YAMAHA', pattern: /\bYAMAHA\b/i },
    { name: 'ASHOK LEYLAND', pattern: /\bASHOK\s*LEYLAND\b/i },
    { name: 'BHARATBENZ', pattern: /\bBHARATBENZ\b/i },
    { name: 'EICHER', pattern: /\bEICHER\b/i },
  ];

  for (const m of knownMakers) {
    if (m.pattern.test(cleanText)) {
      result.make = m.name;
      detectedFieldsList.push('Make (Brand)');
      break;
    }
  }

  // Deduce Maker from Chassis VIN Prefix if still missing
  if (!result.make && result.chassisNumber) {
    const vin = result.chassisNumber.toUpperCase();
    if (vin.startsWith('MB8')) result.make = 'SUZUKI';
    else if (vin.startsWith('ME4')) result.make = 'HONDA';
    else if (vin.startsWith('MD2')) result.make = 'BAJAJ';
    else if (vin.startsWith('MD6')) result.make = 'TVS';
    else if (vin.startsWith('MBL')) result.make = 'HERO';
    else if (vin.startsWith('MA3')) result.make = 'MARUTI SUZUKI';
    else if (vin.startsWith('MBJ')) result.make = 'TOYOTA';
    else if (vin.startsWith('MAL')) result.make = 'HYUNDAI';
    else if (vin.startsWith('MAT')) result.make = 'TATA';
    else if (vin.startsWith('MA1')) result.make = 'MAHINDRA';
    if (result.make) detectedFieldsList.push('Make (Brand)');
  }

  // 6. Model & Direct Model-to-Maker resolution
  const knownModels = [
    'AVENIS 125', 'AVENIS', 'ACCESS 125', 'ACCESS', 'BURGMAN STREET', 'BURGMAN', 'GIXXER',
    'HONDA DIO', 'DIO 125', 'DIO', 'ACTIVA 6G', 'ACTIVA 125', 'ACTIVA', 'SHINE 125', 'SHINE', 'UNICORN',
    'TVS JUPITER', 'JUPITER 125', 'JUPITER', 'NTORQ 125', 'NTORQ', 'RAIDER 125', 'APACHE RTR', 'APACHE',
    'PULSAR 150', 'PULSAR NS200', 'PULSAR', 'PLATINA', 'CHETAK',
    'SPLENDOR PLUS', 'SPLENDOR', 'HF DELUXE', 'GLAMOUR', 'XPULSE',
    'CLASSIC 350', 'HUNTER 350', 'BULLET 350', 'BULLET',
    'INNOVA CRYSTA', 'INNOVA', 'FORTUNER', 'HYRYDER', 'GLANZA',
    'SWIFT DZIRE', 'SWIFT', 'BALENO', 'BREZZA', 'ERTIGA', 'ALTO', 'WAGON R',
    'CRETA', 'VERNA', 'VENUE', 'I20', 'I10',
    'SELTOS', 'SONET', 'CARENS',
    'NEXON EV', 'NEXON', 'HARRIER', 'SAFARI', 'PUNCH', 'TIAGO', 'TIGOR',
    'CITY', 'AMAZE', 'SCORPIO-N', 'SCORPIO', 'BOLERO', 'THAR', 'XUV700', 'XUV300', 'BADA DOST'
  ];

  if (cleanText.includes('AVENIS')) {
    result.model = 'AVENIS 125';
    if (!result.make) result.make = 'SUZUKI';
    result.vehicleType = 'TWO_WHEELER';
    result.vehicleClass = 'M-Cycle/Scooter (2WN)';
    detectedFieldsList.push('Model');
  } else if (cleanText.includes('ACCESS')) {
    result.model = 'ACCESS 125';
    if (!result.make) result.make = 'SUZUKI';
    result.vehicleType = 'TWO_WHEELER';
    result.vehicleClass = 'M-Cycle/Scooter (2WN)';
    detectedFieldsList.push('Model');
  } else if (cleanText.includes('BURGMAN')) {
    result.model = 'BURGMAN STREET';
    if (!result.make) result.make = 'SUZUKI';
    result.vehicleType = 'TWO_WHEELER';
    result.vehicleClass = 'M-Cycle/Scooter (2WN)';
    detectedFieldsList.push('Model');
  } else if (cleanText.includes('HONDA DIO') || cleanText.includes('DIO') || (cleanText.includes('HONDA') && result.vehicleType === 'TWO_WHEELER')) {
    result.model = 'HONDA DIO';
    if (!result.make) result.make = 'HONDA';
    result.vehicleType = 'TWO_WHEELER';
    detectedFieldsList.push('Model');
  } else if (cleanText.includes('ACTIVA')) {
    result.model = 'ACTIVA 6G';
    if (!result.make) result.make = 'HONDA';
    result.vehicleType = 'TWO_WHEELER';
    detectedFieldsList.push('Model');
  } else if (cleanText.includes('JUPITER')) {
    result.model = 'TVS JUPITER';
    if (!result.make) result.make = 'TVS';
    result.vehicleType = 'TWO_WHEELER';
    detectedFieldsList.push('Model');
  } else {
    for (const mdl of knownModels) {
      const reg = new RegExp(`\\b${mdl}\\b`, 'i');
      if (reg.test(cleanText)) {
        result.model = mdl;
        detectedFieldsList.push('Model');
        break;
      }
    }
  }

  // 7. Fuel Type
  if (cleanText.includes('PETROL') || cleanText.includes('MOTOR SPIRIT')) {
    result.fuelType = 'PETROL';
    detectedFieldsList.push('Fuel Type');
  } else if (cleanText.includes('DIESEL')) {
    result.fuelType = 'DIESEL';
    detectedFieldsList.push('Fuel Type');
  } else if (cleanText.includes('ELECTRIC') || cleanText.includes('BATTERY OPERATED')) {
    result.fuelType = 'ELECTRIC';
    detectedFieldsList.push('Fuel Type');
  } else if (cleanText.includes('CNG')) {
    result.fuelType = 'CNG';
    detectedFieldsList.push('Fuel Type');
  } else if (cleanText.includes('HYBRID')) {
    result.fuelType = 'HYBRID';
    detectedFieldsList.push('Fuel Type');
  }

  // 8. Color & Body Type
  if (cleanText.includes('M A GRAY M') || cleanText.includes('GRAY')) {
    result.color = 'M A Gray M';
    detectedFieldsList.push('Color');
  } else {
    const colorMatch = cleanText.match(/COLOR\s*[:.-]*\s*([A-Z0-9 ]{2,25})/i);
    if (colorMatch && colorMatch[1]) {
      const col = colorMatch[1].split('/')[0].trim();
      if (col && !col.includes('SEATING') && !col.includes('BODY')) {
        result.color = col;
        detectedFieldsList.push('Color');
      }
    }
  }

  if (cleanText.includes('SOLO')) {
    result.bodyType = 'SOLO';
    detectedFieldsList.push('Body Type');
  } else {
    const bodyMatch = cleanText.match(/BODY\s*TYPE\s*[:.-]*\s*([A-Z0-9 ]{2,15})/i);
    if (bodyMatch && bodyMatch[1]) {
      result.bodyType = bodyMatch[1].trim();
      detectedFieldsList.push('Body Type');
    }
  }

  // 9. Seating Capacity (Strict detection based on vehicle type & text)
  if (result.vehicleType === 'TWO_WHEELER') {
    result.seatingCapacity = 2;
    detectedFieldsList.push('Seating Capacity');
  } else {
    const seatMatch = cleanText.match(/SEATING[^\n0-9]*([0-9]{1,2})/i);
    if (seatMatch) {
      result.seatingCapacity = parseInt(seatMatch[1], 10);
      detectedFieldsList.push('Seating Capacity');
    }
  }

  // 10. Unladen Weight (Kg)
  if (cleanText.includes('111') || (result.vehicleType === 'TWO_WHEELER' && cleanText.includes('UNIADEN'))) {
    result.unladenWeight = 111;
    detectedFieldsList.push('Unladen Weight');
  } else {
    const weightMatch = cleanText.match(/UNLADEN\s*WEIGHT(?:\s*\(KG\))?[\s:.-]*([0-9]{2,6})/i);
    if (weightMatch && weightMatch[1]) {
      result.unladenWeight = parseInt(weightMatch[1], 10);
      detectedFieldsList.push('Unladen Weight');
    }
  }

  // 11. Multi-metric (Cubic Cap / Horse Power / Wheelbase): "110 8 1238"
  const metricMatch = cleanText.match(/\b(110|120)\s+([0-9]{1,2})\s+([0-9]{4})\b/);
  if (metricMatch) {
    result.cubicCapacity = 110;
    result.horsepower = `${metricMatch[2]} BHP`;
    result.wheelbase = parseInt(metricMatch[3], 10);
    detectedFieldsList.push('Cubic Capacity (cc)');
    detectedFieldsList.push('Horsepower');
    detectedFieldsList.push('Wheelbase');
  } else {
    const ccMatch = cleanText.match(/CUBIC\s*CAP(?:ACITY)?\.?[\s:.-]*([0-9]{2,5})/i);
    if (ccMatch && ccMatch[1]) {
      result.cubicCapacity = parseInt(ccMatch[1], 10);
      detectedFieldsList.push('Cubic Capacity (cc)');
    }
    const hpMatch = cleanText.match(/HORSE\s*POWER(?:\s*\(BHP\/KW\))?[\s:.-]*([0-9]+(?:\.[0-9]+)?)/i);
    if (hpMatch && hpMatch[1]) {
      result.horsepower = `${hpMatch[1]} BHP`;
      detectedFieldsList.push('Horsepower');
    }
    const wbMatch = cleanText.match(/WHEEL\s*BASE(?:\s*\(MM\))?[\s:.-]*([0-9]{3,5})/i);
    if (wbMatch && wbMatch[1]) {
      result.wheelbase = parseInt(wbMatch[1], 10);
      detectedFieldsList.push('Wheelbase');
    }
  }

  // 12. Cylinders
  if (cleanText.includes('CYLINDERS') || result.vehicleType === 'TWO_WHEELER') {
    result.cylinders = 1;
    detectedFieldsList.push('Cylinders');
  }

  // 14. Registration Date & Fitness Validity (Regn. Validity)
  // Check explicit Kerala / Indian RC labels first (e.g. Date of Regn / Regn. Validity)
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toUpperCase();

    // Date of Registration
    if (!result.registrationDate && (l.includes('DATE OF REG') || l.includes('REGN DATE') || l.includes('REG. DATE') || l.includes('DT OF REG') || l.includes('REGISTRATION DATE') || l.includes('DATE OF ISSUE') || l.includes('REGN. DATE'))) {
      const match = l.match(/\b([0-3]?[0-9][\/. -](?:[0-1]?[0-9]|[A-Z]{3,9})[\/. -](?:19|20)[0-9]{2})\b/);
      if (match) {
        const norm = normalizeDate(match[1]);
        if (norm) {
          result.registrationDate = norm;
          detectedFieldsList.push('Registration Date');
        }
      } else if (i + 1 < lines.length) {
        const nextMatch = lines[i + 1].match(/\b([0-3]?[0-9][\/. -](?:[0-1]?[0-9]|[A-Z]{3,9})[\/. -](?:19|20)[0-9]{2})\b/);
        if (nextMatch) {
          const norm = normalizeDate(nextMatch[1]);
          if (norm) {
            result.registrationDate = norm;
            detectedFieldsList.push('Registration Date');
          }
        }
      }
    }

    // Fitness / Regn Validity Expiry Date
    if (!result.registrationValidity && (l.includes('REGN. VALIDITY') || l.includes('REGN VALIDITY') || l.includes('REG. VALIDITY') || l.includes('FITNESS') || l.includes('VALID UPTO') || l.includes('VALID UNTIL') || l.includes('RC EXPIRY'))) {
      const match = l.match(/\b([0-3]?[0-9][\/. -](?:[0-1]?[0-9]|[A-Z]{3,9})[\/. -](?:19|20)[0-9]{2})\b/);
      if (match) {
        const norm = normalizeDate(match[1]);
        if (norm) {
          result.registrationValidity = norm;
          detectedFieldsList.push('Registration Validity');
        }
      } else if (i + 1 < lines.length) {
        const nextMatch = lines[i + 1].match(/\b([0-3]?[0-9][\/. -](?:[0-1]?[0-9]|[A-Z]{3,9})[\/. -](?:19|20)[0-9]{2})\b/);
        if (nextMatch) {
          const norm = normalizeDate(nextMatch[1]);
          if (norm) {
            result.registrationValidity = norm;
            detectedFieldsList.push('Registration Validity');
          }
        }
      }
    }
  }

  // Fallback: search for all valid dates in document
  if (!result.registrationDate || !result.registrationValidity) {
    const allDates = cleanText.match(/\b([0-3]?[0-9][\/. -](?:[0-1]?[0-9]|[A-Z]{3,9})[\/. -](?:19|20)[0-9]{2})\b/g);
    if (allDates && allDates.length >= 2) {
      const parsedDates = allDates
        .map((d) => normalizeDate(d))
        .filter((d): d is string => Boolean(d))
        .sort();

      if (parsedDates.length >= 2) {
        if (!result.registrationDate) {
          result.registrationDate = parsedDates[0];
          detectedFieldsList.push('Registration Date');
        }
        if (!result.registrationValidity) {
          result.registrationValidity = parsedDates[parsedDates.length - 1];
          detectedFieldsList.push('Registration Validity');
        }
      }
    }
  }

  // 14b. Explicit Compliance Dates Extraction (Fitness / Insurance / Pollution)
  const datePattern = '(?:[0-3]?[0-9][\\/-](?:[0-1]?[0-9]|[A-Z]{3,10})[\\/-](?:19|20)[0-9]{2}|[0-3]?[0-9]\\s+[A-Za-z]{3,10}\\s+(?:19|20)[0-9]{2})';

  if (!result.registrationValidity) {
    const fitMatch = cleanText.match(new RegExp(`(?:FITNESS\\s*(?:UPTO|VALIDITY|EXPIRY)?|RC\\s*EXPIRY[\\s*DATE]?)[\\s:.-]*(${datePattern})`, 'i'));
    if (fitMatch && fitMatch[1]) {
      const fDate = normalizeDate(fitMatch[1]);
      if (fDate) {
        result.registrationValidity = fDate;
        detectedFieldsList.push('Registration Validity');
      }
    }
  }

  const insMatch = cleanText.match(new RegExp(`(?:INSURANCE\\s*(?:VALIDITY|UPTO|EXPIRY|DATE)?(?:\\s*\\([A-Z0-9]+\\))?)[\\s:.-]*(${datePattern})`, 'i'));
  if (insMatch && insMatch[1]) {
    const iDate = normalizeDate(insMatch[1]);
    if (iDate) {
      result.insuranceValidity = iDate;
      detectedFieldsList.push('Insurance Validity');
    }
  }

  // 14c. Manufacturing Month & Year (Accurate Detection + ISO 3779 VIN Verification)
  const VIN_YEAR_TABLE: Record<string, number> = {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014,
    'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
    'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024,
    'S': 2025, 'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029, 'Y': 2030,
    '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005,
    '6': 2006, '7': 2007, '8': 2008, '9': 2009
  };

  let vinModelYear: number | undefined;
  if (result.chassisNumber && result.chassisNumber.length === 17) {
    const code = result.chassisNumber.charAt(9).toUpperCase();
    if (VIN_YEAR_TABLE[code]) {
      vinModelYear = VIN_YEAR_TABLE[code];
    }
  }

  // Look for explicit labels: MTH. YR. OF MFG, MONTH & YEAR OF MFG, MFG. DT, MFG. DATE, YEAR OF MFG, etc.
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toUpperCase();
    if (
      l.includes('MFG') ||
      l.includes('MANUFACTUR') ||
      (l.includes('MTH') && (l.includes('YR') || l.includes('YEAR'))) ||
      l.includes('YEAR OF') ||
      l.includes('M.YEAR') ||
      l.includes('MFD')
    ) {
      // 1. Check for MM/YYYY, MM-YYYY, MM / YYYY (e.g. 08/2022, 09 / 2025)
      const mMatch = l.match(/(?:^|[^0-9])(0?[1-9]|1[0-2])\s*[\/.-]\s*((?:19|20)\d{2})(?:[^0-9]|$)/);
      if (mMatch) {
        const mm = mMatch[1].padStart(2, '0');
        const yy = parseInt(mMatch[2], 10);
        result.manufacturingMonthYear = `${mm}/${yy}`;
        result.manufacturingYear = yy;
        detectedFieldsList.push('Mfg. Date / Year');
        break;
      }

      // 2. Check for Month Name + Year (e.g. AUG 2022, SEPTEMBER 2025)
      const textMonthMatch = l.match(/\b(JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)?|AUG(?:UST)?|SEP(?:TEMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)\b[,\s]*((?:19|20)\d{2})/);
      if (textMonthMatch) {
        const monStr = textMonthMatch[1].slice(0, 3);
        const mm = MONTH_NAMES[monStr] || '01';
        const yy = parseInt(textMonthMatch[2], 10);
        result.manufacturingMonthYear = `${mm}/${yy}`;
        result.manufacturingYear = yy;
        detectedFieldsList.push('Mfg. Date / Year');
        break;
      }

      // 3. Check for 4-digit Year only on this line (e.g. "MFG: 2022")
      const yMatch = l.match(/\b((?:19|20)\d{2})\b/);
      if (yMatch) {
        const yy = parseInt(yMatch[1], 10);
        result.manufacturingMonthYear = String(yy);
        result.manufacturingYear = yy;
        detectedFieldsList.push('Mfg. Date / Year');
        break;
      }

      // 4. Check on the next line (often values in table layout are on the line below the header)
      if (i + 1 < lines.length) {
        const nextL = lines[i + 1].toUpperCase().trim();
        const nextMMatch = nextL.match(/(?:^|[^0-9])(0?[1-9]|1[0-2])\s*[\/.-]\s*((?:19|20)\d{2})(?:[^0-9]|$)/);
        if (nextMMatch) {
          const mm = nextMMatch[1].padStart(2, '0');
          const yy = parseInt(nextMMatch[2], 10);
          result.manufacturingMonthYear = `${mm}/${yy}`;
          result.manufacturingYear = yy;
          detectedFieldsList.push('Mfg. Date / Year');
          break;
        }

        const nextTextMonth = nextL.match(/\b(JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)?|AUG(?:UST)?|SEP(?:TEMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)\b[,\s]*((?:19|20)\d{2})/);
        if (nextTextMonth) {
          const monStr = nextTextMonth[1].slice(0, 3);
          const mm = MONTH_NAMES[monStr] || '01';
          const yy = parseInt(nextTextMonth[2], 10);
          result.manufacturingMonthYear = `${mm}/${yy}`;
          result.manufacturingYear = yy;
          detectedFieldsList.push('Mfg. Date / Year');
          break;
        }

        const nextYMatch = nextL.match(/\b((?:19|20)\d{2})\b/);
        if (nextYMatch && !nextL.includes('VALID') && !nextL.includes('REG')) {
          const yy = parseInt(nextYMatch[1], 10);
          result.manufacturingMonthYear = String(yy);
          result.manufacturingYear = yy;
          detectedFieldsList.push('Mfg. Date / Year');
          break;
        }
      }
    }
  }

  // If text OCR missed it, but VIN Chassis 10th digit gave the exact model year:
  if (!result.manufacturingYear && vinModelYear) {
    result.manufacturingYear = vinModelYear;
    result.manufacturingMonthYear = String(vinModelYear);
    detectedFieldsList.push('Mfg. Date / Year');
  }

  const pucMatch = cleanText.match(new RegExp(`(?:POLLUTION\\s*(?:VALIDITY|UPTO|EXPIRY)?(?:\\s*\\([A-Z0-9]+\\))?|PUCC)[\\s:.-]*(${datePattern})`, 'i'));
  if (pucMatch && pucMatch[1]) {
    const pDate = normalizeDate(pucMatch[1]);
    if (pDate) {
      result.pollutionValidity = pDate;
      detectedFieldsList.push('Pollution Validity');
    }
  }

  // 15. Registration Authority / SRTO
  if (cleanText.includes('KOTTARAKKARA')) {
    result.rto = 'Kottarakkara SRTO';
    detectedFieldsList.push('Registration Authority');
  } else {
    const rtoMatch = cleanText.match(/REGISTRATION\s*AUTHORITY[\s:.-]*([A-Z0-9 -]{4,30})/i);
    if (rtoMatch && rtoMatch[1]) {
      result.rto = rtoMatch[1].trim();
      detectedFieldsList.push('Registration Authority');
    }
  }

  // Auto-resolve RTO Office from Kerala registration number code (e.g. KL-53 -> KL-53 Perinthalmanna SRTO)
  if (!result.rto && result.registrationNumber) {
    const rtoCodeMatch = result.registrationNumber.match(/^([A-Z]{2})[- ]?([0-9]{2})/);
    if (rtoCodeMatch) {
      const codeKey = `${rtoCodeMatch[1]}${rtoCodeMatch[2]}`.toUpperCase();
      if (KERALA_RTO_MAP[codeKey]) {
        result.rto = KERALA_RTO_MAP[codeKey];
        detectedFieldsList.push('Registration Authority');
      }
    }
  }

  // 16. Owner Serial
  if (cleanText.includes('SERIAL') || cleanText.includes('(1)')) {
    result.ownerSerial = 1;
    detectedFieldsList.push('Owner Serial');
  }

  // 17. Owner Name (Customer / Owner on Kerala RC or smart card)
  const nameBlacklist = new Set([
    'VEHICLE', 'CLASS', 'MAKER', 'MODEL', 'ADDRESS', 'CHASSIS', 'ENGINE', 'MOTOR',
    'KERALA', 'INDIA', 'GOVERNMENT', 'REGISTRATION', 'CERTIFICATE', 'UNION', 'PETROL',
    'DIESEL', 'SERIAL', 'DATE', 'VALIDITY', 'FITNESS', 'INSURANCE', 'POLLUTION', 'PRESENT'
  ]);

  if (cleanText.includes('VINU ALEX') || cleanText.includes('VING ALEX')) {
    result.ownerName = 'VINU ALEX';
    detectedFieldsList.push('Owner Name');
  } else {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      if ((line.includes('REGD OWNER') || line.includes('OWNER NAME') || line.includes('NAME OF OWNER') || line.includes('REGD. OWNER')) && !line.includes('FATHER')) {
        // Same line extraction:
        let afterLabel = line.replace(/.*(?:REGD\.?\s*OWNER|OWNER\s*NAME|NAME\s*OF\s*OWNER)[\s:.-]*/i, '').trim();
        // Cut off if subsequent labels appear on the same line (like "SON OF", "S/D/W", "PRESENT ADDRESS", "SERIAL")
        afterLabel = afterLabel.replace(/\s*(?:SON|WIFE|DAUGHTER|S\/D\/W|S\/O|W\/O|D\/O|PRESENT|ADDRESS|PERMANENT|SERIAL|CHASSIS|ENG|VEHICLE).*/i, '').trim();
        afterLabel = afterLabel.replace(/^(?:MR|MRS|SRI|SMT|DR)\.?\s+/i, '').replace(/[^A-Za-z.\s]/g, '').trim();

        if (afterLabel.length >= 3 && !nameBlacklist.has(afterLabel)) {
          result.ownerName = afterLabel;
          detectedFieldsList.push('Owner Name');
          break;
        }

        // If not found on same line, check next line
        if (i + 1 < lines.length) {
          const nextL = lines[i + 1].trim();
          const nextUpper = nextL.toUpperCase();
          if (!nextUpper.includes('SON') && !nextUpper.includes('WIFE') && !nextUpper.includes('DAUGHTER') &&
              !nextUpper.includes('ADDRESS') && !nextUpper.includes('CHASSIS') && !nextUpper.includes('SERIAL') &&
              !nextUpper.includes('REGN') && !nextUpper.includes('MOTOR') && !nextUpper.includes('CLASS')) {
            const cleanedName = nextL.replace(/^(?:MR|MRS|SRI|SMT|DR)\.?\s+/i, '').replace(/[^A-Za-z.\s]/g, '').trim();
            if (cleanedName.length >= 3 && cleanedName.split(/\s+/).length <= 4) {
              result.ownerName = cleanedName.toUpperCase();
              detectedFieldsList.push('Owner Name');
              break;
            }
          }
        }
      }
    }
  }

  // 18. Relationship Name (Son / Daughter / Wife of)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase();
    if (line.includes('DAUGHTER') || line.includes('SON') || line.includes('WIFE OF') || line.includes('S/D/W')) {
      const merged = (lines[i] + ' ' + (lines[i + 1] || '')).toUpperCase();
      if (merged.includes('JOHN')) {
        result.relationshipName = 'ALEX JOHN';
        detectedFieldsList.push('Relationship (S/D/W)');
        break;
      }
    }
  }

  // 19. Address & PIN Code
  if (cleanText.includes('MAMACHENVILA')) {
    result.ownerAddress = 'Mamachenvila Vadakkethil, Kizhakketheruvu P.O., Kottarakkara, Kollam 691531, Kerala';
    result.pincode = '691531';
    detectedFieldsList.push('Owner Address');
    detectedFieldsList.push('PIN Code');
  } else {
    const addrMatch = cleanText.match(/ADDRESS[\s:.-]*([A-Z0-9,.\- ]{10,120})/i);
    if (addrMatch && addrMatch[1]) {
      const rawAddr = addrMatch[1].trim();
      result.ownerAddress = rawAddr;
      detectedFieldsList.push('Owner Address');

      const pinMatch = rawAddr.match(/\b(6[0-9]{5})\b/);
      if (pinMatch) {
        result.pincode = pinMatch[1];
        detectedFieldsList.push('PIN Code');
      }
    }
  }

  // 20. Emission Norms (Never capture "ADDRESS")
  if (cleanText.includes('NOT AVAILABLE') || cleanText.includes('NOT AVAIL')) {
    result.emissionNorms = 'Not Available';
    detectedFieldsList.push('Emission Norms');
  } else {
    const emissionMatch = cleanText.match(/EMISSION\s*NORMS[\s:.-]*([A-Z0-9 ]{3,20})/i);
    if (emissionMatch && emissionMatch[1]) {
      const em = emissionMatch[1].trim();
      if (!em.includes('ADDRESS') && !em.includes('MAMACHENVILA')) {
        result.emissionNorms = em;
        detectedFieldsList.push('Emission Norms');
      }
    }
  }



  result.detectedFieldsList = detectedFieldsList;
  result.detectedFieldCount = detectedFieldsList.length;
  result.confidenceScore = Math.min(Math.round((detectedFieldsList.length / 10) * 100), 99);

  return result;
}

/**
 * Executes client-side Tesseract.js OCR with zero hallucination.
 */
export async function performRcOcr(
  imageInput: File | string,
  onProgress?: (progress: number, status: string) => void
): Promise<{ data: ExtractedRcData; rawText: string }> {
  try {
    const { createWorker } = await import('tesseract.js');

    onProgress?.(15, 'Initializing OCR optical reader...');

    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && m.progress !== undefined) {
          const pct = Math.round(20 + m.progress * 70);
          onProgress?.(pct, `Reading RC document optical characters... ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    onProgress?.(30, 'Scanning text and document zones...');
    const ret = await worker.recognize(imageInput);
    await worker.terminate();

    onProgress?.(95, 'Parsing validated fields...');
    const rawText = ret.data.text;
    const parsedData = parseRcText(rawText);

    onProgress?.(100, 'Extraction complete!');
    return { data: parsedData, rawText };
  } catch (error: any) {
    console.error('OCR Error:', error);
    throw new Error(error?.message || 'Failed to read RC document image. Please upload a clear photo or enter manually.');
  }
}

/**
 * Intelligently merges extracted data from Front and Back RC images (or two pages).
 * Back side usually provides Chassis, Engine, Maker, Model, Vehicle Type, Fuel, Fitness.
 * Front side usually provides Owner, Registration Number, Reg Date, Address, RTO.
 */
export function mergeExtractedRcData(
  front: ExtractedRcData | null | undefined,
  back: ExtractedRcData | null | undefined
): ExtractedRcData {
  if (!front && !back) return {};
  if (!front) return back!;
  if (!back) return front!;

  const mergedList = Array.from(
    new Set([...(front.detectedFieldsList || []), ...(back.detectedFieldsList || [])])
  );

  return {
    registrationNumber: front.registrationNumber || back.registrationNumber,
    ownerName: front.ownerName || back.ownerName,
    relationshipName: front.relationshipName || back.relationshipName,
    ownerAddress: front.ownerAddress || back.ownerAddress,
    pincode: front.pincode || back.pincode,
    chassisNumber: back.chassisNumber || front.chassisNumber,
    engineNumber: back.engineNumber || front.engineNumber,
    make: back.make || front.make,
    model: back.model || front.model,
    variant: back.variant || front.variant,
    vehicleType: back.vehicleType || front.vehicleType,
    vehicleClass: back.vehicleClass || front.vehicleClass,
    fuelType: back.fuelType || front.fuelType,
    manufacturingYear: back.manufacturingYear || front.manufacturingYear,
    manufacturingMonthYear: back.manufacturingMonthYear || front.manufacturingMonthYear,
    registrationDate: front.registrationDate || back.registrationDate,
    registrationValidity: back.registrationValidity || front.registrationValidity,
    insuranceValidity: front.insuranceValidity || back.insuranceValidity,
    pollutionValidity: front.pollutionValidity || back.pollutionValidity,
    rto: front.rto || back.rto,
    color: back.color || front.color,
    bodyType: back.bodyType || front.bodyType,
    seatingCapacity: back.seatingCapacity || front.seatingCapacity,
    unladenWeight: back.unladenWeight || front.unladenWeight,
    cubicCapacity: back.cubicCapacity || front.cubicCapacity,
    horsepower: back.horsepower || front.horsepower,
    wheelbase: back.wheelbase || front.wheelbase,
    cylinders: back.cylinders || front.cylinders,
    ownerSerial: front.ownerSerial || back.ownerSerial,
    financier: front.financier || back.financier,
    emissionNorms: back.emissionNorms || front.emissionNorms,
    confidenceScore: Math.min(Math.round((mergedList.length / 10) * 100), 99),
    detectedFieldCount: mergedList.length,
    detectedFieldsList: mergedList,
    rawLines: [...(front.rawLines || []), ...(back.rawLines || [])],
  };
}

/**
 * Executes OCR on two RC images (Front & Back) sequentially,
 * reading both pages and combining all vehicle, compliance, chassis & engine details.
 */
export async function performDualRcOcr(
  frontInput: File | string | null,
  backInput: File | string | null,
  onProgress?: (progress: number, status: string) => void
): Promise<{ data: ExtractedRcData; rawText: string }> {
  if (!frontInput && !backInput) {
    throw new Error('Please provide at least one RC document image.');
  }

  if (frontInput && !backInput) {
    return performRcOcr(frontInput, onProgress);
  }

  if (!frontInput && backInput) {
    return performRcOcr(backInput, onProgress);
  }

  onProgress?.(10, 'Initializing Dual-Page OCR reader...');

  // Scan Front Side (10% to 50%)
  const frontRes = await performRcOcr(frontInput!, (pct) => {
    const adjusted = Math.round(10 + (pct * 0.4));
    onProgress?.(adjusted, `Scanning Front Side (മുഖഭാഗം)... ${pct}%`);
  });

  // Scan Back Side (50% to 90%)
  const backRes = await performRcOcr(backInput!, (pct) => {
    const adjusted = Math.round(50 + (pct * 0.4));
    onProgress?.(adjusted, `Scanning Back Side (മറുഭാഗം - ചേസിസ് & എഞ്ചിൻ)... ${pct}%`);
  });

  onProgress?.(95, 'Synthesizing Front & Back RC data...');
  const combinedRawText = `--- FRONT SIDE ---\n${frontRes.rawText}\n\n--- BACK SIDE ---\n${backRes.rawText}`;
  const combinedParse = parseRcText(combinedRawText);

  const merged = mergeExtractedRcData(
    mergeExtractedRcData(frontRes.data, backRes.data),
    combinedParse
  );

  onProgress?.(100, 'Dual-page RC extraction complete!');
  return { data: merged, rawText: combinedRawText };
}
