/**
 * Client-side Tajima DST reader. Files never leave the browser.
 *
 * DST stores a 512-byte text header followed by three-byte movement records.
 * The binary pass below is intentionally kept independent from the DOM so it
 * can be tested with synthetic and real fixtures.
 */

export interface DstMetadata {
  label: string;
  stitches: number;
  decodedStitches: number;
  headerStitches: number;
  colors: number;
  colorChanges: number;
  widthMm: number;
  heightMm: number;
  headerWidthMm: number;
  headerHeightMm: number;
  jumpCount: number;
  trimCount: number;
  sequinCount: number;
  stitchDistanceMm: number;
  travelDistanceMm: number;
  estimatedTopThreadM: number;
  estimatedBobbinThreadM: number;
  maxStitchMm: number;
  maxJumpMm: number;
  hasEndCommand: boolean;
  warnings: string[];
}

const HEADER_LENGTH = 512;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const bit = (byte: number, position: number) => (byte >> position) & 1;

export const decodeDstDx = (b0: number, b1: number, b2: number) => (
  bit(b2, 2) * 81 - bit(b2, 3) * 81 +
  bit(b1, 2) * 27 - bit(b1, 3) * 27 +
  bit(b0, 2) * 9 - bit(b0, 3) * 9 +
  bit(b1, 0) * 3 - bit(b1, 1) * 3 +
  bit(b0, 0) - bit(b0, 1)
);

export const decodeDstDy = (b0: number, b1: number, b2: number) => -(
  bit(b2, 5) * 81 - bit(b2, 4) * 81 +
  bit(b1, 5) * 27 - bit(b1, 4) * 27 +
  bit(b0, 5) * 9 - bit(b0, 4) * 9 +
  bit(b1, 7) * 3 - bit(b1, 6) * 3 +
  bit(b0, 7) - bit(b0, 6)
);

const headerNumber = (header: string, key: string) => {
  const match = header.match(new RegExp(`(?:^|[\\r\\n])${key}:\\s*(\\d+)`, 'm'));
  return match ? Number.parseInt(match[1], 10) : 0;
};

const percentDifference = (a: number, b: number) => {
  const denominator = Math.max(a, b, 1);
  return Math.abs(a - b) / denominator;
};

export const parseDstBuffer = (buffer: ArrayBuffer, fallbackName = 'Untitled.dst'): DstMetadata => {
  if (buffer.byteLength < HEADER_LENGTH) {
    throw new Error('This is not a complete DST file (the 512-byte header is missing).');
  }
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new Error('This DST file is larger than the 10 MB safety limit.');
  }

  const bytes = new Uint8Array(buffer);
  const header = new TextDecoder('ascii').decode(bytes.subarray(0, HEADER_LENGTH));
  if (!header.includes('LA:') || !header.includes('ST:')) {
    throw new Error('The file does not contain a recognizable Tajima DST header.');
  }

  const label = header.match(/(?:^|[\r\n])LA:([^\r\n]+)/m)?.[1]?.trim() || fallbackName.replace(/\.dst$/i, '');
  const headerStitches = headerNumber(header, 'ST');
  const headerColorChanges = headerNumber(header, 'CO');
  const headerWidthMm = (headerNumber(header, '\\+X') + headerNumber(header, '-X')) / 10;
  const headerHeightMm = (headerNumber(header, '\\+Y') + headerNumber(header, '-Y')) / 10;

  let x = 0;
  let y = 0;
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  let decodedStitches = 0;
  let jumpCount = 0;
  let colorChanges = 0;
  let sequinCount = 0;
  let stitchDistanceUnits = 0;
  let travelDistanceUnits = 0;
  let maxStitchUnits = 0;
  let maxJumpUnits = 0;
  let hasEndCommand = false;
  let consecutiveJumps = 0;
  let inferredTrims = 0;
  let sequinMode = false;
  let recordsRead = 0;

  const closeJumpSequence = () => {
    // Tajima DST has no universal explicit trim command. Three or more
    // consecutive jumps are the convention used by mature readers.
    if (consecutiveJumps >= 3) inferredTrims += 1;
    consecutiveJumps = 0;
  };

  for (let offset = HEADER_LENGTH; offset + 2 < bytes.length; offset += 3) {
    const b0 = bytes[offset];
    const b1 = bytes[offset + 1];
    const b2 = bytes[offset + 2];
    recordsRead += 1;

    if ((b2 & 0xf3) === 0xf3) {
      closeJumpSequence();
      hasEndCommand = true;
      break;
    }

    const dx = decodeDstDx(b0, b1, b2);
    const dy = decodeDstDy(b0, b1, b2);
    const distance = Math.hypot(dx, dy);
    x += dx;
    y += dy;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    if ((b2 & 0xc3) === 0xc3) {
      closeJumpSequence();
      colorChanges += 1;
    } else if ((b2 & 0x43) === 0x43) {
      closeJumpSequence();
      sequinMode = !sequinMode;
    } else if ((b2 & 0x83) === 0x83) {
      jumpCount += 1;
      consecutiveJumps += 1;
      travelDistanceUnits += distance;
      maxJumpUnits = Math.max(maxJumpUnits, distance);
      if (sequinMode) sequinCount += 1;
    } else {
      closeJumpSequence();
      decodedStitches += 1;
      stitchDistanceUnits += distance;
      maxStitchUnits = Math.max(maxStitchUnits, distance);
    }
  }
  closeJumpSequence();

  const widthMm = (maxX - minX) / 10;
  const heightMm = (maxY - minY) / 10;
  const stitchDistanceMm = stitchDistanceUnits / 10;
  const travelDistanceMm = travelDistanceUnits / 10;
  const warnings: string[] = [];
  const payloadBytes = Math.max(buffer.byteLength - HEADER_LENGTH, 0);
  const decodedRecordCount = decodedStitches + jumpCount;
  const stitchHeaderMismatch = Boolean(
    headerStitches && percentDifference(headerStitches, decodedRecordCount) > 0.05,
  );
  const colorHeaderMismatch = headerColorChanges !== colorChanges;
  const hasDecodedPayload = decodedRecordCount > 0 || colorChanges > 0 || hasEndCommand;

  if (!hasEndCommand) warnings.push('No DST end command was found; the file may be truncated.');
  if (payloadBytes % 3 !== 0 && !hasEndCommand) warnings.push('The stitch payload ends in a partial three-byte record.');
  if (stitchHeaderMismatch) {
    warnings.push(`Header reports ${headerStitches.toLocaleString()} records, but ${decodedRecordCount.toLocaleString()} stitch/jump records were decoded. The decoded count will be used for the calculation.`);
  }
  if (colorHeaderMismatch) {
    warnings.push(`Header reports ${headerColorChanges} color changes; the stitch data contains ${colorChanges}.${hasDecodedPayload ? ' The decoded count will be used.' : ''}`);
  }
  if (headerWidthMm && widthMm && percentDifference(headerWidthMm, widthMm) > 0.05) {
    warnings.push('Decoded width differs from the DST header by more than 5%.');
  }
  if (headerHeightMm && heightMm && percentDifference(headerHeightMm, heightMm) > 0.05) {
    warnings.push('Decoded height differs from the DST header by more than 5%.');
  }
  if (maxStitchUnits > 121) warnings.push(`A stitch is ${(maxStitchUnits / 10).toFixed(1)} mm long; review it before production.`);
  if (maxJumpUnits > 121) warnings.push(`A jump is ${(maxJumpUnits / 10).toFixed(1)} mm long; review trim behavior.`);
  if (recordsRead === 0) warnings.push('No stitch records were found after the header.');

  // Thread usage is an intentionally conservative planning estimate. The
  // multipliers allow for lock stitches, take-up and the bobbin path.
  const estimatedTopThreadM = (stitchDistanceMm * 1.15) / 1000;
  const estimatedBobbinThreadM = (stitchDistanceMm * 0.45) / 1000;
  const trustedStitchCount = stitchHeaderMismatch && decodedRecordCount > 0
    ? decodedRecordCount
    : headerStitches || decodedRecordCount;
  const trustedColorChanges = colorHeaderMismatch && hasDecodedPayload
    ? colorChanges
    : headerColorChanges;

  return {
    label,
    stitches: trustedStitchCount,
    decodedStitches,
    headerStitches,
    colors: trustedColorChanges + 1,
    colorChanges,
    widthMm: widthMm || headerWidthMm,
    heightMm: heightMm || headerHeightMm,
    headerWidthMm,
    headerHeightMm,
    jumpCount,
    trimCount: inferredTrims,
    sequinCount,
    stitchDistanceMm,
    travelDistanceMm,
    estimatedTopThreadM,
    estimatedBobbinThreadM,
    maxStitchMm: maxStitchUnits / 10,
    maxJumpMm: maxJumpUnits / 10,
    hasEndCommand,
    warnings,
  };
};

export const parseDstFile = async (file: File): Promise<DstMetadata> => {
  if (!file.name.toLowerCase().endsWith('.dst')) {
    throw new Error('Choose a file with the .dst extension.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('This DST file is larger than the 10 MB safety limit.');
  }
  return parseDstBuffer(await file.arrayBuffer(), file.name);
};
