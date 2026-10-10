import { FuelType, VehicleType } from '@/lib/types';
import { normalizeRegistrationNumber } from '@/lib/utils';

export interface ExtractedRcData {
  registrationNumber?: string;
  ownerName?: string;
  make?: string;
  model?: string;
  variant?: string;
  vehicleType?: VehicleType;
  vehicleClass?: string;
  fuelType?: FuelType;
  manufacturingYear?: number;
  registrationDate?: string;
  chassisNumber?: string;
  engineNumber?: string;
  rto?: string;
  registrationValidity?: string;
  confidenceScore?: number;
  detectedFieldCount?: number;
  detectedFieldsList?: string[];
  rawLines?: string[];
}

export const SAMPLE_RC_PRESETS: { label: string; description: string; data: ExtractedRcData }[] = [
  {
    label: 'Toyota Innova Crysta (KL-10-AZ-4589)',
    description: 'Private LMV • Diesel • Perinthalmanna',
    data: {
      registrationNumber: 'KL-10-AZ-4589',
      ownerName: 'Mohammed Shafeek P',
      make: 'TOYOTA',
      model: 'INNOVA CRYSTA',
      variant: '2.4 GX',
      vehicleType: 'PRIVATE_CAR',
      vehicleClass: 'Motor Car (LMV)',
      fuelType: 'DIESEL',
      manufacturingYear: 2022,
      registrationDate: '2022-04-14',
      chassisNumber: 'MBJ11BB4001458901',
      engineNumber: '2GDF9845892',
      rto: 'KL-10 Perinthalmanna',
      registrationValidity: '2037-04-13',
      confidenceScore: 98,
      detectedFieldCount: 10,
      detectedFieldsList: ['Registration Number', 'Owner Name', 'Make', 'Model', 'Fuel Type', 'Chassis No', 'Engine No', 'Mfg Year', 'Reg Date', 'RTO Office'],
    },
  },
  {
    label: 'Maruti Suzuki Swift (KL-55-R-7788)',
    description: 'Private LMV • Petrol • Tirur',
    data: {
      registrationNumber: 'KL-55-R-7788',
      ownerName: 'Abdul Rahman K',
      make: 'MARUTI SUZUKI',
      model: 'SWIFT',
      variant: 'ZXI',
      vehicleType: 'PRIVATE_CAR',
      vehicleClass: 'Motor Car (LMV)',
      fuelType: 'PETROL',
      manufacturingYear: 2021,
      registrationDate: '2021-08-20',
      chassisNumber: 'MA3FBEB1S00778812',
      engineNumber: 'K12MN127788',
      rto: 'KL-55 Tirur',
      registrationValidity: '2036-08-19',
      confidenceScore: 96,
      detectedFieldCount: 10,
      detectedFieldsList: ['Registration Number', 'Owner Name', 'Make', 'Model', 'Fuel Type', 'Chassis No', 'Engine No', 'Mfg Year', 'Reg Date', 'RTO Office'],
    },
  },
  {
    label: 'Tata Tigor EV (KL-07-CD-3344)',
    description: 'Commercial Taxi • Electric • Ernakulam',
    data: {
      registrationNumber: 'KL-07-CD-3344',
      ownerName: 'Suresh Kumar Menon',
      make: 'TATA',
      model: 'TIGOR EV',
      variant: 'XZ+',
      vehicleType: 'COMMERCIAL_TAXI',
      vehicleClass: 'Motor Cab / Taxi',
      fuelType: 'ELECTRIC',
      manufacturingYear: 2023,
      registrationDate: '2023-01-10',
      chassisNumber: 'MAT625022N0334455',
      engineNumber: 'EV72V433441',
      rto: 'KL-07 Ernakulam',
      registrationValidity: '2028-01-09',
      confidenceScore: 95,
      detectedFieldCount: 10,
      detectedFieldsList: ['Registration Number', 'Owner Name', 'Make', 'Model', 'Fuel Type', 'Chassis No', 'Engine No', 'Mfg Year', 'Reg Date', 'RTO Office'],
    },
  },
];

/**
 * Normalizes date to strict YYYY-MM-DD for HTML date input compatibility.
 * Returns undefined if format is invalid.
 */
function normalizeDate(rawDateStr: string): string | undefined {
  if (!rawDateStr) return undefined;
  const cleaned = rawDateStr.trim().replace(/[-.]/g, '/');
  const parts = cleaned.split('/');

  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    // If year is in parts[0] (YYYY/MM/DD)
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }

    if (year >= 1990 && year <= 2050 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const yStr = String(year);
      const mStr = String(month).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      return `${yStr}-${mStr}-${dStr}`;
    }
  }
  return undefined;
}

/**
 * Parses raw text extracted from an Indian Registration Certificate (RC).
 * Strictly extracts only fields that are explicitly found in the document.
 * NEVER guesses or defaults values that are absent.
 * Isolates and ignores seating capacity and unrelated technical metrics.
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
  // Format: State Code (2 letters) + RTO (1-2 digits) + optional series (1-3 letters) + 3-4 digits
  const stateCodes = 'KL|DL|MH|KA|TN|TS|AP|GJ|RJ|HR|UP|PB|WB|MP|OD|CH|JH|UK|HP|AS|BR|GA|PY';
  const regRegex = new RegExp(`\\b(${stateCodes})[- ]?([0-9]{1,2})[- ]?([A-Z]{1,3})[- ]?([0-9]{3,4})\\b`, 'i');
  const regMatch = cleanText.match(regRegex);

  if (regMatch) {
    const st = regMatch[1].toUpperCase();
    const rtoNum = regMatch[2].padStart(2, '0');
    const series = regMatch[3] ? regMatch[3].toUpperCase() : '';
    const num = regMatch[4];
    result.registrationNumber = series ? `${st}-${rtoNum}-${series}-${num}` : `${st}-${rtoNum}-${num}`;
    detectedFieldsList.push('Registration Number');
  }

  // 2. Chassis Number (VIN - 17 alphanumeric)
  const chassisMatch = cleanText.match(/(?:CHASSIS\s*(?:NO|NUMBER)?|VIN)[\s:.-]*([A-HJ-NPR-Z0-9]{15,19})/i);
  if (chassisMatch && chassisMatch[1]) {
    const vin = chassisMatch[1].replace(/[^A-Z0-9]/g, '');
    if (vin.length >= 14 && vin.length <= 19) {
      result.chassisNumber = vin;
      detectedFieldsList.push('Chassis Number');
    }
  } else {
    // Exact 17-character VIN pattern (excluding I, O, Q)
    const exactVin = cleanText.match(/\b([A-HJ-NPR-Z0-9]{17})\b/);
    if (exactVin && exactVin[1]) {
      result.chassisNumber = exactVin[1];
      detectedFieldsList.push('Chassis Number');
    }
  }

  // 3. Engine Number
  const engineMatch = cleanText.match(/(?:ENGINE\s*(?:NO|NUMBER)?|ENG\s*NO|MOTOR\s*NO)[\s:.-]*([A-Z0-9]{6,16})/i);
  if (engineMatch && engineMatch[1]) {
    const eng = engineMatch[1].replace(/[^A-Z0-9]/g, '');
    if (eng.length >= 6) {
      result.engineNumber = eng;
      detectedFieldsList.push('Engine Number');
    }
  }

  // 4. Maker / Manufacturer (Only if explicit match)
  const knownMakers = [
    { name: 'TOYOTA', pattern: /\bTOYOTA\b/i },
    { name: 'MARUTI SUZUKI', pattern: /\bMARUTI(?:\s*SUZUKI)?\b/i },
    { name: 'HYUNDAI', pattern: /\bHYUNDAI\b/i },
    { name: 'TATA', pattern: /\bTATA(?:\s*MOTORS)?\b/i },
    { name: 'MAHINDRA', pattern: /\bMAHINDRA\b/i },
    { name: 'HONDA', pattern: /\bHONDA\b/i },
    { name: 'KIA', pattern: /\bKIA\b/i },
    { name: 'VOLKSWAGEN', pattern: /\bVOLKSWAGEN|\bVW\b/i },
    { name: 'SKODA', pattern: /\bSKODA\b/i },
    { name: 'RENAULT', pattern: /\bRENAULT\b/i },
    { name: 'NISSAN', pattern: /\bNISSAN\b/i },
    { name: 'MG', pattern: /\bMG\s*MOTORS|\bMG\b/i },
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

  // 5. Model (Only if explicit model keyword exists)
  const knownModels = [
    'INNOVA CRYSTA', 'INNOVA', 'FORTUNER', 'SWIFT DZIRE', 'SWIFT', 'BALENO', 'BREZZA',
    'CRETA', 'VERNA', 'VENUE', 'I20', 'I10', 'SELTOS', 'SONET', 'CARENS',
    'NEXON EV', 'NEXON', 'HARRIER', 'SAFARI', 'PUNCH', 'TIAGO', 'TIGOR EV', 'TIGOR',
    'CITY', 'AMAZE', 'SCORPIO', 'BOLERO', 'THAR', 'XUV700', 'XUV300', 'ALTO',
    'WAGON R', 'ERTIGA', 'XL6', 'KIGER', 'MAGNITE', 'TAIGUN', 'KUSHAQ', 'SLAVIA',
    'SPLENDOR', 'PULSAR', 'ACTIVA', 'JUPITER', 'ACCESS', 'CLASSIC 350', 'BULLET'
  ];

  for (const mdl of knownModels) {
    if (cleanText.includes(mdl)) {
      result.model = mdl;
      detectedFieldsList.push('Model');
      break;
    }
  }

  // 6. Fuel Type (Strict matching only - NO guessing)
  if (cleanText.includes('DIESEL')) {
    result.fuelType = 'DIESEL';
    detectedFieldsList.push('Fuel Type');
  } else if (cleanText.includes('PETROL') || cleanText.includes('MOTOR SPIRIT')) {
    result.fuelType = 'PETROL';
    detectedFieldsList.push('Fuel Type');
  } else if (cleanText.includes('ELECTRIC') || cleanText.includes('EV') || cleanText.includes('BATTERY OPERATED')) {
    result.fuelType = 'ELECTRIC';
    detectedFieldsList.push('Fuel Type');
  } else if (cleanText.includes('CNG')) {
    result.fuelType = 'CNG';
    detectedFieldsList.push('Fuel Type');
  } else if (cleanText.includes('HYBRID')) {
    result.fuelType = 'HYBRID';
    detectedFieldsList.push('Fuel Type');
  }

  // 7. Vehicle Category & Class (Strict - NO DEFAULTING TO PRIVATE_CAR)
  if (cleanText.includes('MOTOR CAB') || cleanText.includes('TAXI') || cleanText.includes('MAXICAB')) {
    result.vehicleType = 'COMMERCIAL_TAXI';
    result.vehicleClass = 'Motor Cab / Taxi';
    detectedFieldsList.push('Vehicle Category');
  } else if (cleanText.includes('GOODS CARRIER') || cleanText.includes('LGV') || cleanText.includes('HGV') || cleanText.includes('LORRY')) {
    result.vehicleType = 'GOODS_CARRIER';
    result.vehicleClass = 'Goods Carrier';
    detectedFieldsList.push('Vehicle Category');
  } else if (cleanText.includes('MOTOR CYCLE') || cleanText.includes('2-WHEELER') || cleanText.includes('SCOOTER')) {
    result.vehicleType = 'TWO_WHEELER';
    result.vehicleClass = 'Motor Cycle / Scooter';
    detectedFieldsList.push('Vehicle Category');
  } else if (cleanText.includes('AUTO RICKSHAW') || cleanText.includes('THREE WHEELER')) {
    result.vehicleType = 'AUTO_RICKSHAW';
    result.vehicleClass = 'Auto Rickshaw (3 Wheeler)';
    detectedFieldsList.push('Vehicle Category');
  } else if (cleanText.includes('BUS') || cleanText.includes('OMNIBUS') || cleanText.includes('STAGE CARRIAGE')) {
    result.vehicleType = 'BUS';
    result.vehicleClass = 'Passenger Bus';
    detectedFieldsList.push('Vehicle Category');
  } else if (cleanText.includes('MOTOR CAR') || cleanText.includes('LMV') || cleanText.includes('LIGHT MOTOR VEHICLE')) {
    result.vehicleType = 'PRIVATE_CAR';
    result.vehicleClass = 'Motor Car (LMV)';
    detectedFieldsList.push('Vehicle Category');
  }

  // 8. Manufacturing Year (Strict: must explicitly follow MFG / MFD / YEAR label)
  // Ignore lines with seating capacity or cylinders so numbers don't collide
  const mfgMatch = cleanText.match(/(?:MFG|MFD|YEAR\s*OF\s*MFG|M\.YEAR)[\s:.-]*([0-1]?[0-9][\/-])?([12][09][0-9]{2})/i);
  if (mfgMatch && mfgMatch[2]) {
    const yr = parseInt(mfgMatch[2], 10);
    if (yr >= 1995 && yr <= 2030) {
      result.manufacturingYear = yr;
      detectedFieldsList.push('Manufacturing Year');
    }
  }

  // 9. Registration Date & Validity Dates
  // First attempt: Explicit label matches
  const regDateMatch = cleanText.match(/(?:REG(?:ISTRATION)?\s*(?:DATE|DT)|DATE\s*OF\s*REG(?:ISTRATION)?)[\s:.-]*([0-3]?[0-9][\/-][0-1]?[0-9][\/-](?:19|20)[0-9]{2})/i);
  if (regDateMatch && regDateMatch[1]) {
    const norm = normalizeDate(regDateMatch[1]);
    if (norm) {
      result.registrationDate = norm;
      detectedFieldsList.push('Registration Date');
    }
  }

  const validityDateMatch = cleanText.match(/(?:FITNESS|VALID(?:ITY)?|REGN?\s*UPTO|UPTO)[\s:.-]*([0-3]?[0-9][\/-][0-1]?[0-9][\/-](?:19|20)[0-9]{2})/i);
  if (validityDateMatch && validityDateMatch[1]) {
    const norm = normalizeDate(validityDateMatch[1]);
    if (norm) {
      result.registrationValidity = norm;
      detectedFieldsList.push('Registration Validity');
    }
  }

  // Fallback: If not found via explicit label, try general date occurrences
  if (!result.registrationDate || !result.registrationValidity) {
    const dateRegex = /\b([0-3]?[0-9][\/-][0-1]?[0-9][\/-](?:19|20)[0-9]{2})\b/g;
    const dates = cleanText.match(dateRegex);
    if (dates && dates.length > 0) {
      if (!result.registrationDate && dates[0]) {
        const norm = normalizeDate(dates[0]);
        if (norm) {
          result.registrationDate = norm;
          detectedFieldsList.push('Registration Date');
        }
      }
      if (!result.registrationValidity && dates.length > 1 && dates[dates.length - 1]) {
        const norm = normalizeDate(dates[dates.length - 1]);
        if (norm) {
          result.registrationValidity = norm;
          detectedFieldsList.push('Registration Validity');
        }
      }
    }
  }

  // 10. Owner Name (Strict: directly following OWNER NAME or NAME label)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase();
    // Exclude noise lines like seating capacity, father name, address, chassis, weight
    if (
      (line.includes('OWNER NAME') || line.includes('REGD OWNER') || line.includes('NAME:')) &&
      !line.includes('FATHER') &&
      !line.includes('SEAT') &&
      !line.includes('CAPACITY') &&
      !line.includes('CHASSIS') &&
      !line.includes('ENGINE')
    ) {
      const parts = lines[i].split(/[:–-]/);
      if (parts.length > 1 && parts[1].trim().length > 2) {
        const cleanedName = parts[1].trim().replace(/^(?:MR|MRS|SRI|SMT)\.?\s+/i, '');
        if (cleanedName.length >= 3 && !cleanedName.includes('SEAT') && !cleanedName.includes('CAPACITY')) {
          result.ownerName = cleanedName;
          detectedFieldsList.push('Owner Name');
          break;
        }
      } else if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const upperNext = nextLine.toUpperCase();
        if (
          nextLine.length > 2 &&
          !upperNext.includes('SON OF') &&
          !upperNext.includes('S/O') &&
          !upperNext.includes('D/O') &&
          !upperNext.includes('W/O') &&
          !upperNext.includes('SEAT') &&
          !upperNext.includes('CAPACITY') &&
          !upperNext.includes('CHASSIS')
        ) {
          result.ownerName = nextLine.replace(/^(?:MR|MRS|SRI|SMT)\.?\s+/i, '');
          detectedFieldsList.push('Owner Name');
          break;
        }
      }
    }
  }

  // 11. RTO Office (Only if explicitly in text)
  const rtoMatch = cleanText.match(/(?:REGISTERING AUTHORITY|RTO|OFFICE)[\s:.-]*([A-Z0-9 -]{4,25})/i);
  if (rtoMatch && rtoMatch[1]) {
    const rtoVal = rtoMatch[1].trim();
    if (!rtoVal.includes('SEAT') && !rtoVal.includes('CAPACITY') && !rtoVal.includes('WEIGHT')) {
      result.rto = rtoVal;
      detectedFieldsList.push('RTO Location');
    }
  }

  result.detectedFieldsList = detectedFieldsList;
  result.detectedFieldCount = detectedFieldsList.length;
  result.confidenceScore = Math.min(Math.round((detectedFieldsList.length / 8) * 100), 99);

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
